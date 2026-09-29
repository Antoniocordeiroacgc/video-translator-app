"use client";

import { useState, useRef, useEffect } from "react";
import { TARGET_LANGUAGES } from "@/lib/languages";

export default function LanguageSelect({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = TARGET_LANGUAGES.find((l) => l.code === value) || TARGET_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-64" ref={containerRef}>
      <label className="block text-sm font-medium text-neutral-400 mb-1.5">
        Traduzir vídeo para
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-left text-sm font-medium text-neutral-100 shadow-sm transition hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{selected.flag}</span>
          {selected.label}
        </span>
        <svg
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl shadow-black/40">
          {TARGET_LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-brand-600/20 ${
                  lang.code === value ? "bg-brand-600/10 text-brand-400" : "text-neutral-200"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
