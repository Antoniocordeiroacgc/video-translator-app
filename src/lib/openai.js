import OpenAI, { toFile } from "openai";
import fs from "fs/promises";
import path from "path";
import { getLanguageLabel, getTtsVoice } from "./languages";
import { sanitizeSrtOutput, isValidSrt } from "./srt";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcreve o áudio/vídeo original usando o Whisper da OpenAI e retorna
 * o texto já formatado como legenda .srt (com timestamps exatos).
 */
export async function transcribeToSrt(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const uploadableFile = await toFile(fileBuffer, path.basename(filePath));

    const transcription = await openai.audio.transcriptions.create({
      file: uploadableFile,
      model: "whisper-1",
      language: "pt",
      response_format: "srt",
    });

    const srtText = typeof transcription === "string" ? transcription : transcription.text;

    if (!isValidSrt(srtText)) {
      throw new Error("A transcrição retornada pelo Whisper não está em formato SRT válido.");
    }

    return srtText;
  } catch (err) {
    console.error("[openai] erro na transcrição Whisper:", err.message);
    throw new Error(`Falha na transcrição de áudio (Whisper): ${err.message}`);
  }
}

/**
 * Traduz um arquivo de legenda .srt inteiro para o idioma alvo,
 * preservando rigorosamente a estrutura de blocos/timestamps.
 */
export async function translateSrt(srtContent, targetLangCode) {
  const targetLanguageName = getLanguageLabel(targetLangCode);

  const systemPrompt = `Você é um motor de tradução profissional especializado em legendas de vídeo (formato SRT).
REGRAS ESTRITAS QUE VOCÊ DEVE SEGUIR SEM EXCEÇÃO:
1. Traduza APENAS o texto falado de cada bloco de legenda do português para ${targetLanguageName}.
2. NÃO altere, remova, reordene ou renumere os índices dos blocos (ex: "1", "2", "3"...).
3. NÃO altere os timestamps (ex: "00:00:01,000 --> 00:00:04,000") em nenhuma hipótese — eles devem permanecer IDÊNTICOS ao original.
4. Mantenha exatamente o mesmo número de blocos e a mesma estrutura de linhas do arquivo original.
5. Não adicione comentários, explicações, markdown (\`\`\`) ou qualquer texto fora do formato SRT.
6. A resposta deve ser SOMENTE o conteúdo do arquivo .srt traduzido, pronto para ser salvo em disco.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: srtContent },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content;
    if (!rawOutput) {
      throw new Error("Resposta vazia do modelo de tradução (gpt-4o-mini).");
    }

    const translatedSrt = sanitizeSrtOutput(rawOutput);

    if (!isValidSrt(translatedSrt)) {
      throw new Error("A tradução retornada não está em formato SRT válido.");
    }

    return translatedSrt;
  } catch (err) {
    console.error("[openai] erro na tradução (gpt-4o-mini):", err.message);
    throw new Error(`Falha na tradução da legenda: ${err.message}`);
  }
}

/**
 * Gera áudio (fala) a partir de um texto, usando o TTS da OpenAI, no
 * idioma/voz apropriados. Retorna um Buffer com o áudio em MP3.
 */
export async function synthesizeSpeech(text, targetLangCode) {
  try {
    const voice = getTtsVoice(targetLangCode);

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[openai] erro na geração de fala (TTS):", err.message);
    throw new Error(`Falha na geração de áudio dublado (TTS): ${err.message}`);
  }
}