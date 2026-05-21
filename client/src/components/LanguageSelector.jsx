import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ur', label: 'Urdu', flag: '🇵🇰' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' }
];

export default function LanguageSelector({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5" /> Viva Language
      </label>
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            disabled={disabled}
            onClick={() => onChange(lang.code)}
            className={`tap-target py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
              value === lang.code
                ? 'border-blue-500/50 bg-blue-600/20 text-blue-300'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            } disabled:opacity-50`}
          >
            <span className="block text-base mb-0.5">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
