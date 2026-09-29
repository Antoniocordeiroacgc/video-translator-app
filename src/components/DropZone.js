"use client";

import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export default function DropZone({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  const validateAndSelect = useCallback(
    (file) => {
      setErrorMsg("");
      if (!file) return;

      const isAcceptedType =
        ACCEPTED_TYPES.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name);

      if (!isAcceptedType) {
        setErrorMsg("Formato não suportado. Envie um arquivo .mp4 ou .mov.");
        return;
      }

      const MAX_SIZE_MB = 200;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErrorMsg(`O arquivo excede o limite de ${MAX_SIZE_MB}MB.`);
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSelect(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition cursor-pointer ${
        isDragging
          ? "border-brand-500 bg-brand-500/10"
          : "border-neutral-700 bg-neutral-900/50 hover:border-neutral-600"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => validateAndSelect(e.target.files?.[0])}
      />

      <div className="rounded-full bg-neutral-800 p-3">
        <svg className="h-6 w-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      </div>

      <div>
        <p className="text-sm font-medium text-neutral-200">
          Arraste e solte seu vídeo aqui
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          ou clique para selecionar (.mp4, .mov — até 200MB)
        </p>
      </div>

      {errorMsg && <p className="text-xs font-medium text-red-400 mt-1">{errorMsg}</p>}
    </div>
  );
}
