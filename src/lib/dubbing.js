import path from "path";
import os from "os";
import fs from "fs/promises";
import { randomUUID } from "crypto";

import { parseSrtToSegments } from "./srt";
import { synthesizeSpeech } from "./openai";
import { getMediaDurationMs, generateSilenceFile, concatAudioFiles } from "./ffmpeg";

const MIN_GAP_MS = 30; // intervalos menores que isso não geram arquivo de silêncio

/**
 * Gera a trilha de áudio dublada completa a partir de uma legenda .srt
 * traduzida: sintetiza a fala de cada bloco via TTS, posiciona cada trecho
 * no tempo certo (preenchendo os intervalos com silêncio) e devolve o
 * caminho do arquivo de áudio final (mp3), com duração alinhada ao vídeo.
 *
 * Retorna { audioPath, tempFiles } — tempFiles deve ser limpo pelo chamador.
 */
export async function generateDubbedAudioTrack(translatedSrt, targetLangCode, originalVideoPath) {
  const tempFiles = [];
  const segments = parseSrtToSegments(translatedSrt);

  if (segments.length === 0) {
    throw new Error("Nenhum segmento de fala encontrado na legenda traduzida para dublagem.");
  }

  const totalDurationMs = await getMediaDurationMs(originalVideoPath);

  const parts = [];
  let cursorMs = 0;

  for (const segment of segments) {
    const audioBuffer = await synthesizeSpeech(segment.text, targetLangCode);
    const segmentPath = path.join(os.tmpdir(), `${randomUUID()}-seg.mp3`);
    await fs.writeFile(segmentPath, audioBuffer);
    tempFiles.push(segmentPath);

    const segmentDurationMs = await getMediaDurationMs(segmentPath);

    // Preenche o intervalo entre o cursor atual e o início deste bloco.
    // Se o áudio gerado for mais longo que o intervalo até o próximo
    // bloco, aceitamos a pequena sobreposição (limitação conhecida do MVP).
    const gapMs = segment.startMs - cursorMs;
    if (gapMs > MIN_GAP_MS) {
      const silencePath = path.join(os.tmpdir(), `${randomUUID()}-silence.mp3`);
      await generateSilenceFile(gapMs, silencePath);
      tempFiles.push(silencePath);
      parts.push(silencePath);
      cursorMs += gapMs;
    }

    parts.push(segmentPath);
    cursorMs += segmentDurationMs;
  }

  // Preenche o restante até o fim do vídeo, se sobrar tempo.
  if (cursorMs < totalDurationMs) {
    const trailingGapMs = totalDurationMs - cursorMs;
    if (trailingGapMs > MIN_GAP_MS) {
      const trailingSilencePath = path.join(os.tmpdir(), `${randomUUID()}-silence.mp3`);
      await generateSilenceFile(trailingGapMs, trailingSilencePath);
      tempFiles.push(trailingSilencePath);
      parts.push(trailingSilencePath);
    }
  }

  const finalAudioPath = path.join(os.tmpdir(), `${randomUUID()}-dubbed-audio.mp3`);

  if (parts.length === 1) {
    await fs.copyFile(parts[0], finalAudioPath);
  } else {
    await concatAudioFiles(parts, finalAudioPath);
  }

  return { audioPath: finalAudioPath, tempFiles };
}