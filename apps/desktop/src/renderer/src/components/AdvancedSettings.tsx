import React, { useState } from 'react'
import { AdvancedSettings as AdvancedSettingsType } from '../lib/types'
import { WHISPER_MODELS, COMPUTE_TYPES, DEVICES, TRANSLATION_ENGINES } from '../lib/languages'

interface AdvancedSettingsProps {
  settings: AdvancedSettingsType
  onChange: (settings: AdvancedSettingsType) => void
  disabled?: boolean
}

export function AdvancedSettings({ settings, onChange, disabled }: AdvancedSettingsProps) {
  const [open, setOpen] = useState(false)

  const update = <K extends keyof AdvancedSettingsType>(key: K, value: AdvancedSettingsType[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="section">
      <button
        className={`advanced-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen(!open)}
        type="button"
        disabled={disabled}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Advanced settings
      </button>

      {open && (
        <div className="card fade-in" style={{ marginTop: 8, padding: '20px' }}>
          <div className="settings-grid">

            {/* Whisper model */}
            <div>
              <div className="settings-label">Whisper model</div>
              <select
                value={settings.model}
                onChange={(e) => update('model', e.target.value)}
                disabled={disabled}
                style={{ width: '100%' }}
              >
                {WHISPER_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'small' ? `${m} (recommended)` : m}
                  </option>
                ))}
              </select>
              <div className="hint">Larger = more accurate but slower</div>
            </div>

            {/* Device */}
            <div>
              <div className="settings-label">Processing device</div>
              <select
                value={settings.device}
                onChange={(e) => update('device', e.target.value)}
                disabled={disabled}
                style={{ width: '100%' }}
              >
                {DEVICES.map((d) => (
                  <option key={d} value={d}>
                    {d === 'auto' ? 'Auto (recommended)' : d.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Compute type */}
            <div>
              <div className="settings-label">Compute precision</div>
              <select
                value={settings.computeType}
                onChange={(e) => update('computeType', e.target.value)}
                disabled={disabled}
                style={{ width: '100%' }}
              >
                {COMPUTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'auto' ? 'Auto (recommended)' : t}
                  </option>
                ))}
              </select>
            </div>

            {/* Max chars per line */}
            <div>
              <div className="settings-label">Max chars per line</div>
              <input
                type="number"
                min={20}
                max={100}
                value={settings.maxCharsPerLine}
                onChange={(e) => update('maxCharsPerLine', Number(e.target.value))}
                disabled={disabled}
              />
              <div className="hint">Longer lines wrap less, shorter split more</div>
            </div>

            {/* Translation engine */}
            <div className="full-width">
              <div className="settings-label">Translation engine</div>
              <select
                value={settings.translationEngine}
                onChange={(e) => update('translationEngine', e.target.value)}
                disabled={disabled}
                style={{ width: '100%' }}
              >
                {TRANSLATION_ENGINES.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Keep original SRT */}
            <div className="full-width">
              <label>
                <input
                  type="checkbox"
                  checked={settings.keepOriginal}
                  onChange={(e) => update('keepOriginal', e.target.checked)}
                  disabled={disabled}
                />
                Also save original-language subtitle file
              </label>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
