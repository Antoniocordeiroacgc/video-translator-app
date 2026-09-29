"use client";

import { getLanguageLabel } from "@/lib/languages";

export default function ResultScreen({ result, onReset }) {
  const { translatedVideoUrl, targetLanguage } = result;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-100">Tradução concluída!</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Seu vídeo foi legendado em{" "}
          <span className="font-medium text-brand-400">{getLanguageLabel(targetLanguage)}</span>.
        </p>
      </div>

      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-black shadow-2xl">
        <video src={translatedVideoUrl} controls playsInline className="w-full aspect-video">
          Seu navegador não suporta a exibição deste vídeo.
        </video>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={translatedVideoUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-500 hover:shadow-brand-500/40"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 12m0 0l4.5-4.5M12 12V3"
            />
          </svg>
          Baixar Vídeo Traduzido
        </a>

        <button
          onClick={onReset}
          className="rounded-xl border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
        >
          Traduzir outro vídeo
        </button>
      </div>
    </div>
  );
}
