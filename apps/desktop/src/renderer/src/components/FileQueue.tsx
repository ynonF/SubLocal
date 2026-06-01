import React from 'react'
import { SelectedFile, FileResult } from '../lib/types'

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileQueueProps {
  files: SelectedFile[]
  results: FileResult[]
  onRemove?: (index: number) => void
  disabled?: boolean
}

export function FileQueue({ files, results, onRemove, disabled }: FileQueueProps) {
  if (files.length === 0) return null

  return (
    <div className="card section fade-in" style={{ padding: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {files.length} video{files.length !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
        {files.map((file, index) => {
          const result = results[index]
          const status = result?.status ?? 'pending'

          return (
            <div key={`${file.path}-${index}`} className="file-queue-item">
              <div
                className={`status-dot ${status}`}
                title={status}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatSize(file.size)}
                  {result?.detectedLanguage && (
                    <span style={{ marginLeft: 8 }}>
                      · Detected: {result.detectedLanguage}
                    </span>
                  )}
                </div>
              </div>

              {status === 'processing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                  <div className="progress-bar-track" style={{ flex: 1 }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${result?.progress ?? 0}%` }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' }}>
                    {result?.progress ?? 0}%
                  </span>
                </div>
              )}

              {status === 'done' && (
                <span className="badge badge-success">Done</span>
              )}

              {status === 'error' && (
                <span className="badge badge-error">Failed</span>
              )}

              {status === 'pending' && !disabled && onRemove && (
                <button
                  className="btn-ghost"
                  onClick={() => onRemove(index)}
                  title="Remove from queue"
                  style={{ padding: '4px 8px', fontSize: 16, lineHeight: 1 }}
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
