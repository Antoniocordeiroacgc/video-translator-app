import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

/**
 * Validação simples de formato SRT: precisa ter ao menos um bloco
 * numerado + timestamp no padrão 00:00:00,000 --> 00:00:00,000
 */
const SRT_TIMESTAMP_REGEX = /\d{2}:\d{2}:\d{2},\d{3}\s-->\s\d{2}:\d{2}:\d{2},\d{3}/;
const SRT_TIMESTAMP_LINE_REGEX =
  /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s-->\s(\d{2}):(\d{2}):(\d{2}),(\d{3})/;

export function isValidSrt(content) {
  return typeof content === "string" && SRT_TIMESTAMP_REGEX.test(content);
}

/**
 * Remove blocos de código markdown (```srt ... ```) que o LLM às vezes
 * adiciona ao redor da resposta, além de espaços/quebras extras.
 */
export function sanitizeSrtOutput(rawText) {
  let text = rawText.trim();
  text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
  return text.trim() + "\n";
}

/**
 * Converte um arquivo .srt em uma lista de segmentos utilizáveis para
 * dublagem: [{ startMs, endMs, text }, ...], ordenados por tempo.
 */
export function parseSrtToSegments(srtContent) {
  const blocks = srtContent
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n/);

  const segments = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;

    const timeLineIndex = lines.findIndex((l) => SRT_TIMESTAMP_LINE_REGEX.test(l));
    if (timeLineIndex === -1) continue;

    const match = lines[timeLineIndex].match(SRT_TIMESTAMP_LINE_REGEX);
    if (!match) continue;

    const startMs =
      (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000 +
      Number(match[4]);
    const endMs =
      (Number(match[5]) * 3600 + Number(match[6]) * 60 + Number(match[7])) * 1000 +
      Number(match[8]);

    const text = lines
      .slice(timeLineIndex + 1)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      segments.push({ startMs, endMs, text });
    }
  }

  return segments.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Salva conteúdo de texto (ex: .srt) em um arquivo temporário único
 * e retorna o caminho absoluto.
 */
export async function writeTempFile(content, extension) {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.${extension}`);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

export async function removeTempFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    // Não é crítico se a limpeza falhar
    console.warn(`[srt] Falha ao remover arquivo temporário ${filePath}:`, err.message);
  }
}

export async function removeTempFiles(filePaths) {
  await Promise.all(filePaths.map((p) => removeTempFile(p)));
}