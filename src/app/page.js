"use client";

import { useState, useRef } from "react";
import DropZone from "@/components/DropZone";
import VideoRecorder from "@/components/VideoRecorder";
import LanguageSelect from "@/components/LanguageSelect";
import ProcessingScreen from "@/components/ProcessingScreen";
import ResultScreen from "@/components/ResultScreen";

// Estados possíveis da aplicação
const STATES = {
  IDLE: "idle",
  RECORDING: "recording",
  PROCESSING: "processing",
  RESULT: "result",
};

export default function HomePage() {
  const [appState, setAppState] = useState(STATES.IDLE);
  const [inputMode, setInputMode] = useState("upload"); // 'upload' | 'record'
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  const previewUrlRef = useRef(null);

  function handleFileSelected(file) {
    setSelectedFile(file);
    setErrorMsg("");
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
  }

  function handleRecordingComplete(file) {
    handleFileSelected(file);
    setAppState(STATES.IDLE);
  }

  function resetAll() {
    setSelectedFile(null);
    setResult(null);
    setErrorMsg("");
    setAppState(STATES.IDLE);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setErrorMsg("Selecione ou grave um vídeo antes de continuar.");
      return;
    }

    setErrorMsg("");
    setAppState(STATES.PROCESSING);

    try {
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("targetLanguage", targetLanguage);

      const response = await fetch("/api/translate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha desconhecida ao processar o vídeo.");
      }

      setResult(data);
      setAppState(STATES.RESULT);
    } catch (err) {
      console.error("Erro no pipeline de tradução:", err);
      setErrorMsg(err.message || "Ocorreu um erro inesperado. Tente novamente.");
      setAppState(STATES.IDLE);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-12 sm:py-16">
      <header className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-400">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Powered by Whisper + GPT-4o-mini
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 sm:text-4xl">
          VidTranslate <span className="text-brand-500">AI</span>
        </h1>
        <p className="mt-2 max-w-lg text-sm text-neutral-400 sm:text-base">
          Grave ou envie um vídeo em português e receba a versão legendada
          automaticamente em outro idioma.
        </p>
      </header>

      <section className="w-full rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-2xl shadow-black/40 sm:p-8">
        {appState === STATES.PROCESSING && <ProcessingScreen />}

        {appState === STATES.RESULT && result && (
          <ResultScreen result={result} onReset={resetAll} />
        )}

        {(appState === STATES.IDLE || appState === STATES.RECORDING) && (
          <div className="flex flex-col gap-6">
            {/* Tabs de modo de entrada */}
            <div className="flex gap-2 rounded-xl bg-neutral-800/60 p-1">
              <ModeTab
                label="Enviar arquivo"
                active={inputMode === "upload"}
                onClick={() => {
                  setInputMode("upload");
                  setAppState(STATES.IDLE);
                }}
              />
              <ModeTab
                label="Gravar agora"
                active={inputMode === "record"}
                onClick={() => {
                  setInputMode("record");
                  setAppState(STATES.RECORDING);
                }}
              />
            </div>

            {/* Conteúdo do modo selecionado */}
            {inputMode === "upload" && !selectedFile && (
              <DropZone onFileSelected={handleFileSelected} />
            )}

            {inputMode === "record" && (
              <VideoRecorder onRecordingComplete={handleRecordingComplete} />
            )}

            {/* Preview do vídeo selecionado/gravado */}
            {selectedFile && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-neutral-300">
                  Vídeo selecionado: <span className="text-neutral-400">{selectedFile.name}</span>
                </p>
                <video
                  src={previewUrlRef.current}
                  controls
                  className="w-full max-h-72 rounded-xl border border-neutral-800 bg-black"
                />
                <button
                  onClick={() => setSelectedFile(null)}
                  className="self-start text-xs font-medium text-neutral-500 underline hover:text-neutral-300"
                >
                  Remover e escolher outro vídeo
                </button>
              </div>
            )}

            {/* Seleção de idioma + ação */}
            <div className="flex flex-col items-stretch gap-4 border-t border-neutral-800 pt-6 sm:flex-row sm:items-end sm:justify-between">
              <LanguageSelect value={targetLanguage} onChange={setTargetLanguage} />

              <button
                onClick={handleSubmit}
                disabled={!selectedFile}
                className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400 disabled:shadow-none"
              >
                Traduzir Vídeo
              </button>
            </div>

            {errorMsg && (
              <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </section>

      <footer className="mt-10 text-center text-xs text-neutral-600">
        MVP — processamento local via FFmpeg · Transcrição e tradução via OpenAI
      </footer>
    </main>
  );
}

function ModeTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? "bg-brand-600 text-white shadow" : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {label}
    </button>
  );
}
