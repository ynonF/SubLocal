export interface Language {
  code: string
  name: string
  nativeName: string
  rtl?: boolean
}

export const TARGET_LANGUAGES: Language[] = [
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
]

export const SOURCE_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Auto Detect', nativeName: 'Auto Detect' },
  ...TARGET_LANGUAGES,
]

export function getLanguageByCode(code: string): Language | undefined {
  return TARGET_LANGUAGES.find((l) => l.code === code) ||
    SOURCE_LANGUAGES.find((l) => l.code === code)
}

export function isRTL(code: string): boolean {
  return !!TARGET_LANGUAGES.find((l) => l.code === code)?.rtl
}

export const WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large-v3'] as const
export const COMPUTE_TYPES = ['auto', 'int8', 'float16', 'float32'] as const
export const DEVICES = ['auto', 'cpu', 'cuda'] as const
export const TRANSLATION_ENGINES = [
  { id: 'argos', name: 'Argos Translate (local, offline)' },
  { id: 'none', name: 'No translation (same language)' },
  { id: 'ollama', name: 'Ollama (coming soon)' },
  { id: 'nllb', name: 'NLLB (coming soon)' },
] as const
