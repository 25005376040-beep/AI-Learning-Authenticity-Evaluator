const SUPPORTED = {
  en: { label: 'English', instruction: 'Use English only for all questions and feedback.' },
  ur: { label: 'Urdu', instruction: 'Use Urdu (اردو) only. Write questions in Urdu script. Accept answers in Urdu or Roman Urdu.' },
  hi: { label: 'Hindi', instruction: 'Use Hindi (हिन्दी) only. Write questions in Devanagari script. Accept answers in Hindi or Roman Hindi.' }
};

function normalizeLanguage(code) {
  const c = String(code || 'en').toLowerCase().slice(0, 2);
  return SUPPORTED[c] ? c : 'en';
}

function languageInstruction(code) {
  const lang = normalizeLanguage(code);
  return SUPPORTED[lang].instruction;
}

module.exports = { SUPPORTED, normalizeLanguage, languageInstruction };
