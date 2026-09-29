export const TARGET_LANGUAGES = [
  { code: "en", label: "Inglês", flag: "🇺🇸" },
  { code: "es", label: "Espanhol", flag: "🇪🇸" },
  { code: "de", label: "Alemão", flag: "🇩🇪" },
  { code: "fr", label: "Francês", flag: "🇫🇷" },
  { code: "zh", label: "Chinês", flag: "🇨🇳" },
  { code: "ru", label: "Russo", flag: "🇷🇺" },
];

// Vozes do TTS da OpenAI usadas para dublar cada idioma. O modelo de voz
// não é "nativo" de um idioma específico — ele lê o texto no idioma em que
// foi escrito com um sotaque neutro. Variamos a voz só por variedade.
export const TTS_VOICE_MAP = {
  en: "alloy",
  es: "nova",
  de: "onyx",
  fr: "shimmer",
  zh: "echo",
  ru: "fable",
};

export function getLanguageLabel(code) {
  return TARGET_LANGUAGES.find((l) => l.code === code)?.label || code;
}

export function getTtsVoice(code) {
  return TTS_VOICE_MAP[code] || "alloy";
}