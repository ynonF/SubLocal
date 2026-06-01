import React from 'react'
import { TARGET_LANGUAGES, SOURCE_LANGUAGES, Language } from '../lib/languages'

interface LanguageSelectProps {
  label: string
  value: string
  onChange: (code: string) => void
  languages: Language[]
  disabled?: boolean
}

export function LanguageSelect({ label, value, onChange, languages, disabled }: LanguageSelectProps) {
  return (
    <div>
      <div className="settings-label">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ width: '100%' }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
            {lang.nativeName && lang.nativeName !== lang.name ? ` — ${lang.nativeName}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

interface LanguageRowProps {
  targetLang: string
  sourceLang: string
  onTargetChange: (code: string) => void
  onSourceChange: (code: string) => void
  disabled?: boolean
}

export function LanguageRow({
  targetLang,
  sourceLang,
  onTargetChange,
  onSourceChange,
  disabled,
}: LanguageRowProps) {
  return (
    <div className="language-row">
      <LanguageSelect
        label="Subtitle language"
        value={targetLang}
        onChange={onTargetChange}
        languages={TARGET_LANGUAGES}
        disabled={disabled}
      />
      <LanguageSelect
        label="Source language"
        value={sourceLang}
        onChange={onSourceChange}
        languages={SOURCE_LANGUAGES}
        disabled={disabled}
      />
    </div>
  )
}
