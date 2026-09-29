import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

import { uploadToSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { transcribeToSrt, translateSrt } from "@/lib/openai";
import { burnSubtitles } from "@/lib/ffmpeg";
import { writeTempFile, removeTempFile, removeTempFiles } from "@/lib/srt";
import { TARGET_LANGUAGES } from "@/lib/languages";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min - processamento de vídeo pode demorar

const VALID_LANGUAGE_CODES = TARGET_LANGUAGES.map((l) => l.code);

export async function POST(request) {
  // Caminhos temporários que precisam ser limpos ao final (sucesso ou erro)
  const tempFilesToClean = [];
  let videoRecord = null;

  try {
    // ---------- 1. Leitura do FormData ----------
    const formData = await request.formData();
    const file = formData.get("video");
    const targetLanguage = formData.get("targetLanguage");
    const userId = formData.get("userId") || null; // opcional no MVP (sem auth obrigatória)

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Nenhum arquivo de vídeo foi enviado." },
        { status: 400 }
      );
    }

    if (!targetLanguage || !VALID_LANGUAGE_CODES.includes(targetLanguage)) {
      return NextResponse.json(
        {
          error: `Idioma de destino inválido. Opções válidas: ${VALID_LANGUAGE_CODES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    if (originalBuffer.length === 0) {
      return NextResponse.json({ error: "O arquivo de vídeo está vazio." }, { status: 400 });
    }

    const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200MB
    if (originalBuffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O vídeo excede o limite de 200MB para este MVP." },
        { status: 413 }
      );
    }

    const jobId = randomUUID();
    const originalExtension = (file.name?.split(".").pop() || "mp4").toLowerCase();
    const localInputPath = path.join(os.tmpdir(), `${jobId}-original.${originalExtension}`);
    await fs.writeFile(localInputPath, originalBuffer);
    tempFilesToClean.push(localInputPath);

    // ---------- 2. Upload do vídeo original para o Supabase Storage ----------
    let originalVideoUrl;
    try {
      originalVideoUrl = await uploadToSupabase(
        originalBuffer,
        `originals/${jobId}.${originalExtension}`,
        file.type || "video/mp4"
      );
    } catch (err) {
      return NextResponse.json(
        { error: `Erro no upload do vídeo original: ${err.message}` },
        { status: 502 }
      );
    }

    // ---------- 3. Criação do registro inicial no banco (status: processing) ----------
    try {
      videoRecord = await prisma.video.create({
        data: {
          userId: userId || undefined,
          originalVideoUrl,
          status: "processing",
        },
      });
    } catch (err) {
      console.error("[db] erro ao criar registro de vídeo:", err.message);
      return NextResponse.json(
        { error: `Erro ao salvar registro no banco de dados: ${err.message}` },
        { status: 500 }
      );
    }

    // ---------- 4. Transcrição via Whisper (gera .srt com timestamps) ----------
    let originalSrt;
    try {
      originalSrt = await transcribeToSrt(localInputPath);
    } catch (err) {
      await markVideoFailed(videoRecord.id);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    // ---------- 5. Tradução do .srt via gpt-4o-mini ----------
    let translatedSrt;
    try {
      translatedSrt = await translateSrt(originalSrt, targetLanguage);
    } catch (err) {
      await markVideoFailed(videoRecord.id);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    const srtPath = await writeTempFile(translatedSrt, "srt");
    tempFilesToClean.push(srtPath);

   
       // ---------- 7. Burn-in da legenda traduzida via ffmpeg ----------
    const outputVideoPath = path.join(os.tmpdir(), `${jobId}-${targetLanguage}.mp4`);
    tempFilesToClean.push(outputVideoPath);

    try {
      await burnSubtitles(localInputPath, srtPath, outputVideoPath);
    } catch (err) {
      console.error("[route] erro ao gerar video final (burn-in):", err);
      await markVideoFailed(videoRecord.id);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    // ---------- 8. Upload do vídeo final dublado e legendado ----------
    let translatedVideoUrl;
    try {
      const finalBuffer = await fs.readFile(outputVideoPath);
      translatedVideoUrl = await uploadToSupabase(
        finalBuffer,
        `translated/${jobId}-${targetLanguage}.mp4`,
        "video/mp4"
      );
    } catch (err) {
      await markVideoFailed(videoRecord.id);
      return NextResponse.json(
        { error: `Erro no upload do vídeo traduzido: ${err.message}` },
        { status: 502 }
      );
    }

    // ---------- 9. Persistência final no banco ----------
    try {
      await prisma.translation.create({
        data: {
          videoId: videoRecord.id,
          targetLanguage,
          translatedVideoUrl,
        },
      });

      await prisma.video.update({
        where: { id: videoRecord.id },
        data: { status: "completed" },
      });
    } catch (err) {
      console.error("[db] erro ao salvar tradução final:", err.message);
      return NextResponse.json(
        { error: `Erro ao salvar tradução no banco de dados: ${err.message}` },
        { status: 500 }
      );
    }

    // ---------- 10. Resposta final ----------
    return NextResponse.json({
      success: true,
      videoId: videoRecord.id,
      targetLanguage,
      translatedVideoUrl,
      originalVideoUrl,
    });
  } catch (err) {
    console.error("[api/translate] erro inesperado no pipeline:", err);
    if (videoRecord?.id) {
      await markVideoFailed(videoRecord.id);
    }
    return NextResponse.json(
      { error: `Erro inesperado no processamento: ${err.message}` },
      { status: 500 }
    );
  } finally {
    // Limpeza de arquivos temporários (vídeo original, srt, trechos de
    // áudio dublado, silêncios, vídeo final)
    await removeTempFiles(tempFilesToClean);
  }
}

async function markVideoFailed(videoId) {
  try {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "failed" },
    });
  } catch (err) {
    console.error("[db] erro ao marcar vídeo como 'failed':", err.message);
  }
}