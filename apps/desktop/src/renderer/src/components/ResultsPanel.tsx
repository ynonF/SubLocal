import React, { useState } from 'react'
import { FileResult } from '../lib/types'

interface ResultsPanelProps {
  results: FileResult[]
}

function ResultItem({ result }: { result: FileResult }) {
  const [showDetails, setShowDetails] = useState(false)

  const openFile = () => {
    if (result.outputSrtPath) {
      window.subLocalAPI.openPath(result.outputSrtPath)
    }
  }

  const openFolder = () => {
    const p = result.outputSrtPath || result.outputVideoPath || result.file.path
    window.subLocalAPI.openFolder(p)
  }

  const openVideo = () => {
    if (result.outputVideoPath) {
      window.subLocalAPI.openPath(result.outputVideoPath)
    }
  }

  if (result.status === 'pending' || result.status === 'processing') return null

  return (
    <div className={`result-item ${result.status === 'done' ? 'success' : 'error'}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {result.status === 'done' ? (
              <span className="badge badge-success">✓ Done</span>
            ) : (
              <span className="badge badge-error">✗ Failed</span>
            )}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            wordBreak: 'break-all',
            lineHeight: 1.5,
          }}>
            {result.file.name}
          </div>
          {result.outputSrtPath && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, wordBreak: 'break-all' }}>
              → {result.outputSrtPath.split(/[/\\]/).pop()}
            </div>
          )}
        </div>
      </div>

      {result.status === 'done' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {result.outputSrtPath && (
            <button className="btn-secondary" onClick={openFile} type="button">
              Open subtitle file
            </button>
          )}
          <button className="btn-secondary" onClick={openFolder} type="button">
            Open folder
          </button>
          {result.outputVideoPath && (
            <button className="btn-secondary" onClick={openVideo} type="button">
              Open burned video
            </button>
          )}
        </div>
      )}

      {result.status === 'error' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent-error)', marginBottom: 8 }}>
            {result.errorMessage || 'Something went wrong while processing this video.'}
          </div>
          {result.errorDetails && (
            <div>
              <button
                className="btn-ghost"
                onClick={() => setShowDetails(!showDetails)}
                type="button"
                style={{ fontSize: 12, color: 'var(--text-muted)', padding: '2px 0' }}
              >
                {showDetails ? 'Hide details ▲' : 'Show details ▼'}
              </button>
              {showDetails && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 8,
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}>
                  {result.errorDetails}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  const completed = results.filter(
    (r) => r.status === 'done' || r.status === 'error'
  )

  if (completed.length === 0) return null

  return (
    <div className="section fade-in">
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
        Results
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map((result, index) => (
          <ResultItem key={`${result.file.path}-${index}`} result={result} />
        ))}
      </div>
    </div>
  )
}
