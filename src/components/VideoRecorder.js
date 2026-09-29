"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoRecorder({ onRecordingComplete }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsReady(true);
    } catch (err) {
      console.error("Erro ao acessar câmera/microfone:", err);
      setErrorMsg(
        "Não foi possível acessar a câmera/microfone. Verifique as permissões do navegador."
      );
      setIsReady(false);
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: mimeType });
      onRecordingComplete(file);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  }

  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-black aspect-video">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            REC {formattedTime}
          </div>
        )}

        {!isReady && !errorMsg && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
            Iniciando câmera...
          </div>
        )}
      </div>

      {errorMsg && <p className="text-sm text-red-400 text-center max-w-md">{errorMsg}</p>}

      <div className="flex gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={!isReady}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            Iniciar Gravação
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-xl bg-neutral-100 px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-lg transition hover:bg-white"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-neutral-900" />
            Parar Gravação
          </button>
        )}
      </div>
    </div>
  );
}
