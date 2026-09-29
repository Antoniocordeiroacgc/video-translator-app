import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

if (ffprobeStatic?.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

const SUBTITLE_STYLE =
  "FontName=Arial,FontSize=10,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=25";

function escapeSubtitlePath(srtPath) {
  return srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/**
 * Embute (hardcode/burn-in) um arquivo de legenda .srt diretamente
/**
 * Embute (hardcode/burn-in) um arquivo de legenda .srt diretamente
 * nos frames do vídeo de entrada, gerando um novo arquivo mp4.
 * Usado no modo "somente legenda" (sem dublagem).
 */
export function burnSubtitles(inputVideoPath, srtPath, outputVideoPath) {
  return new Promise((resolve, reject) => {
    const escapedSrtPath = escapeSubtitlePath(srtPath);

    ffmpeg(inputVideoPath)
      .videoFilters(`subtitles='${escapedSrtPath}':force_style='${SUBTITLE_STYLE}'`)
      .outputOptions(["-c:a copy", "-preset veryfast", "-crf 23"])
      .on("start", (cmd) => console.log("[ffmpeg] comando iniciado:", cmd))
      .on("progress", (progress) => {
        if (progress.percent) console.log(`[ffmpeg] progresso: ${Math.round(progress.percent)}%`);
      })
      .on("error", (err) => {
        console.error("[ffmpeg] erro ao embutir legendas:", err.message);
        reject(new Error(`Falha no processamento de vídeo (ffmpeg): ${err.message}`));
      })
      .on("end", () => {
        console.log("[ffmpeg] burn-in de legendas concluído.");
        resolve(outputVideoPath);
      })
      .save(outputVideoPath);
  });
}

/**
 * Substitui o áudio do vídeo original pela trilha dublada e, ao mesmo
 * tempo, embute (burn-in) a legenda traduzida. Gera o arquivo final.
 */
export function muxVideoWithDubbedAudioAndSubtitles(
  inputVideoPath,
  dubbedAudioPath,
  srtPath,
  outputVideoPath
) {
  return new Promise((resolve, reject) => {
    const escapedSrtPath = escapeSubtitlePath(srtPath);

    ffmpeg(inputVideoPath)
      .input(dubbedAudioPath)
      .videoFilters(`subtitles='${escapedSrtPath}':force_style='${SUBTITLE_STYLE}'`)
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        "-c:v libx264",
        "-c:a aac",
        "-shortest",
        "-preset veryfast",
        "-crf 23",
      ])
      .on("start", (cmd) => console.log("[ffmpeg] comando iniciado (dublagem):", cmd))
      .on("progress", (progress) => {
        if (progress.percent) console.log(`[ffmpeg] progresso: ${Math.round(progress.percent)}%`);
      })
      .on("error", (err) => {
        console.error("[ffmpeg] erro ao gerar vídeo dublado:", err.message);
        reject(new Error(`Falha no processamento de vídeo dublado (ffmpeg): ${err.message}`));
      })
      .on("end", () => {
        console.log("[ffmpeg] geração de vídeo dublado concluída.");
        resolve(outputVideoPath);
      })
      .save(outputVideoPath);
  });
}

/**
 * Retorna a duração de um arquivo de mídia (vídeo ou áudio) em milissegundos.
 */
export function getMediaDurationMs(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Falha ao ler duração do arquivo de mídia: ${err.message}`));
        return;
      }
      const durationSec = metadata?.format?.duration;
      if (!durationSec || Number.isNaN(Number(durationSec))) {
        reject(new Error("Não foi possível determinar a duração do arquivo de mídia."));
        return;
      }
      resolve(Math.round(Number(durationSec) * 1000));
    });
  });
}

/**
 * Gera um arquivo de áudio silencioso com a duração especificada (em ms).
 */
export function generateSilenceFile(durationMs, outputPath) {
  return new Promise((resolve, reject) => {
    const durationSec = Math.max(durationMs, 0) / 1000;

    ffmpeg()
      .input("anullsrc=channel_layout=stereo:sample_rate=44100")
      .inputFormat("lavfi")
      .duration(durationSec)
      .audioCodec("libmp3lame")
      .on("error", (err) => reject(new Error(`Falha ao gerar silêncio: ${err.message}`)))
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
}

/**
 * Concatena uma lista ordenada de arquivos de áudio em um único arquivo
 * de saída, usando o filtro `concat` do ffmpeg (decodifica cada entrada
 * individualmente, então não exige que todas tenham o mesmo formato).
 */
export function concatAudioFiles(filePaths, outputPath) {
  return new Promise((resolve, reject) => {
    if (filePaths.length === 0) {
      reject(new Error("Nenhum arquivo de áudio para concatenar."));
      return;
    }

    const command = ffmpeg();
    filePaths.forEach((p) => command.input(p));

    const filterInputs = filePaths.map((_, i) => `[${i}:a]`).join("");
    const filterGraph = `${filterInputs}concat=n=${filePaths.length}:v=0:a=1[aout]`;

    command
      .complexFilter([filterGraph], "aout")
      .audioCodec("libmp3lame")
      .on("error", (err) => reject(new Error(`Falha ao concatenar áudio dublado: ${err.message}`)))
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
}