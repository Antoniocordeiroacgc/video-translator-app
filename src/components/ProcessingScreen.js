"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Enviando vídeo original", duration: 2000 },
  { label: "Transcrevendo áudio (Whisper AI)", duration: 6000 },
  { label: "Traduzindo legendas (GPT-4o-mini)", duration: 5000 },
  { label: "Renderizando legendas no vídeo (FFmpeg)", duration: 9000 },
  { label: "Finalizando e salvando resultado", duration: 3000 },
];

/**
 * Barra de progresso puramente visual/simulada: a requisição real ao backend
 * roda em paralelo e é independente desta animação. Isso evita telas em
 * branco/estáticas enquanto o pipeline (que pode levar minutos) é executado.
 */
export default function ProcessingScreen() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function runSteps() {
      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return;
        setCurrentStepIndex(i);

        const stepDuration = STEPS[i].duration;
        const intervalMs = 100;
        const increments = stepDuration / intervalMs;
        const targetProgress = ((i + 1) / STEPS.length) * 100;
        const startProgress = (i / STEPS.length) * 100;
        const step = (targetProgress - startProgress) / increments;

        for (let j = 0; j < increments; j++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, intervalMs));
          setProgress((p) => Math.min(p + step, targetProgress));
        }
      }
      // Mantém-se na última etapa "girando" caso o backend ainda não tenha respondido
    }

    runSteps();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full border-4 border-neutral-800" />
        <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-neutral-200">
          {Math.round(progress)}%
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-neutral-100">
          Processando seu vídeo com IA...
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Isso pode levar alguns minutos dependendo da duração do vídeo.
        </p>
      </div>

      <div className="w-full max-w-md space-y-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ul className="space-y-2 text-left">
          {STEPS.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isActive = index === currentStepIndex;
            return (
              <li key={step.label} className="flex items-center gap-2.5 text-sm">
                {isDone ? (
                  <svg className="h-4 w-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isActive ? (
                  <span className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                ) : (
                  <span className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-neutral-700" />
                )}
                <span
                  className={
                    isDone
                      ? "text-neutral-500 line-through"
                      : isActive
                      ? "text-neutral-100 font-medium"
                      : "text-neutral-600"
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
