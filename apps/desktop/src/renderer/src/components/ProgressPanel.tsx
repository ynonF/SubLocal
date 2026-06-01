import React, { useEffect, useRef } from 'react'
import { FileResult } from '../lib/types'

interface ProgressPanelProps {
  results: FileResult[]
  currentFileIndex: number
  onCancel?: () => void
}

const STAGE_LABELS: Record<string, string> = {
  extract_audio: 'Preparing audio...',
  transcribe: 'Listening to the video...',
  translate: 'Translating subtitles...',
  write_srt: 'Saving your subtitle file...',
  burn_video: 'Creating video with subtitles...',
  download_model: 'Downloading AI model...',
  install_package: 'Installing translation pack...',
  info: '',
}

function getFriendlyStage(stage: string): string {
  return STAGE_LABELS[stage] || stage
}

export function ProgressPanel({ results, currentFileIndex, onCancel }: ProgressPanelProps) {
  const messagesRef = useRef<HTMLDivElement>(null)
  const current = results[currentFileIndex]
  const processing = results.some((r) => r.status === 'processing')

  const messages = results
    .filter((r) => r.status === 'processing' || r.status === 'done' || r.status === 'error')
    .flatMap((r) => (r.message ? [r.message] : []))

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages.length])

  if (!processing && results.every((r) => r.status === 'pending')) {
    return null
  }

  const totalPercent = results.length > 0
    ? Math.round(
        results.reduce((sum, r) => sum + (r.status === 'done' ? 100 : r.progress), 0) /
          results.length
      )
    : 0

  return (
    <div className="card section fade-in" style={{ padding: '20px', gap: 16, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {processing && (
            <div className="status-dot processing" />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {processing ? 'Generating subtitles...' : 'Processing complete'}
          </span>
        </div>
        {processing && onCancel && (
          <button className="btn-ghost" onClick={onCancel} type="button" style={{ fontSize: 13 }}>
            Cancel
          </button>
        )}
      </div>

      {/* Current file */}
      {current && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {current.file.name}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>
              {current.progress}%
            </span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${current.progress}%` }} />
          </div>
          {current.stage && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {getFriendlyStage(current.stage)}
            </div>
          )}
        </div>
      )}

      {/* Overall progress for batch */}
      {results.length > 1 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Overall ({results.filter((r) => r.status === 'done').length} / {results.length} done)
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalPercent}%</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${totalPercent}%`, opacity: 0.5 }} />
          </div>
        </div>
      )}

      {/* Console messages */}
      {messages.length > 0 && (
        <div ref={messagesRef} className="console-messages">
          {messages.slice(-8).map((msg, i) => (
            <div key={i} className="msg-line">{msg}</div>
          ))}
        </div>
      )}
    </div>
  )
}
