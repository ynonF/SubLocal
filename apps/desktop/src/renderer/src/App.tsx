import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DropZone } from './components/DropZone'
import { LanguageRow } from './components/LanguageSelect'
import { FileQueue } from './components/FileQueue'
import { ProgressPanel } from './components/ProgressPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { AdvancedSettings } from './components/AdvancedSettings'
import {
  SelectedFile,
  FileResult,
  AppState,
  AdvancedSettings as AdvancedSettingsType,
  WorkerMessage,
} from './lib/types'

const DEFAULT_ADVANCED: AdvancedSettingsType = {
  model: 'small',
  device: 'auto',
  computeType: 'auto',
  keepOriginal: false,
  burnSubtitles: false,
  maxCharsPerLine: 42,
  translationEngine: 'argos',
}

let jobCounter = 0
function makeJobId(): string {
  return `job-${Date.now()}-${++jobCounter}`
}

function makeInitialResult(file: SelectedFile): FileResult {
  return {
    file,
    status: 'pending',
    progress: 0,
    stage: '',
    message: '',
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [results, setResults] = useState<FileResult[]>([])
  const [targetLang, setTargetLang] = useState('he')
  const [sourceLang, setSourceLang] = useState('auto')
  const [burnSubtitles, setBurnSubtitles] = useState(false)
  const [advanced, setAdvanced] = useState<AdvancedSettingsType>(DEFAULT_ADVANCED)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [depWarning, setDepWarning] = useState<string | null>(null)

  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Check dependencies on first load
  useEffect(() => {
    window.subLocalAPI.checkDependencies().then(({ ffmpeg, worker }) => {
      if (!ffmpeg) {
        setDepWarning(
          'SubLocal could not find FFmpeg. Audio extraction will fail. Please install FFmpeg or check your installation.'
        )
      }
    }).catch(() => {})
  }, [])

  const handleFiles = useCallback((newFiles: SelectedFile[]) => {
    setFiles((prev) => {
      // Deduplicate by path
      const existingPaths = new Set(prev.map((f) => f.path))
      const fresh = newFiles.filter((f) => !existingPaths.has(f.path))
      return [...prev, ...fresh]
    })
    setResults((prev) => {
      const existingCount = prev.length
      const fresh = newFiles.slice(0, newFiles.length)
      return [
        ...prev,
        ...newFiles.slice(existingCount - prev.length >= 0 ? 0 : 0).map(makeInitialResult),
      ]
    })
    setAppState('files-selected')
  }, [])

  // Simpler: rebuild results whenever files change
  useEffect(() => {
    setResults((prev) => {
      if (prev.length === files.length) return prev
      if (prev.length < files.length) {
        return [
          ...prev,
          ...files.slice(prev.length).map(makeInitialResult),
        ]
      }
      return prev.slice(0, files.length)
    })
  }, [files])

  const handleRemoveFile = (index: number) => {
    if (appState === 'processing') return
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setResults((prev) => prev.filter((_, i) => i !== index))
    if (files.length === 1) setAppState('idle')
  }

  const handleGenerate = async () => {
    if (files.length === 0 || appState === 'processing') return

    const jobId = makeJobId()
    setCurrentJobId(jobId)
    setCurrentFileIndex(0)
    setAppState('processing')

    // Reset results
    setResults(files.map(makeInitialResult))

    // Subscribe to progress
    if (unsubscribeRef.current) unsubscribeRef.current()
    const unsub = window.subLocalAPI.onProgress((msg) => {
      const { jobId: msgJobId, fileIndex, ...rest } = msg
      if (msgJobId !== jobId) return

      setCurrentFileIndex(fileIndex)

      if (rest.type === 'progress') {
        setResults((prev) => {
          const updated = [...prev]
          updated[fileIndex] = {
            ...updated[fileIndex],
            status: 'processing',
            progress: rest.percent ?? 0,
            stage: rest.stage,
            message: rest.message,
          }
          return updated
        })
      } else if (rest.type === 'done') {
        setResults((prev) => {
          const updated = [...prev]
          updated[fileIndex] = {
            ...updated[fileIndex],
            status: 'done',
            progress: 100,
            stage: 'done',
            message: 'Done!',
            outputSrtPath: rest.outputSrtPath,
            outputVideoPath: rest.outputVideoPath,
            detectedLanguage: rest.detectedLanguage,
          }
          return updated
        })

        // Check if all done
        setResults((current) => {
          const allDone = current.every(
            (r) => r.status === 'done' || r.status === 'error' || r.status === 'cancelled'
          )
          if (allDone) {
            setAppState('completed')
            setCurrentJobId(null)
          }
          return current
        })
      } else if (rest.type === 'error') {
        setResults((prev) => {
          const updated = [...prev]
          updated[fileIndex] = {
            ...updated[fileIndex],
            status: 'error',
            progress: 0,
            stage: 'error',
            message: '',
            errorMessage: rest.message,
            errorDetails: rest.details,
          }
          return updated
        })

        setResults((current) => {
          const allDone = current.every(
            (r) => r.status === 'done' || r.status === 'error' || r.status === 'cancelled'
          )
          if (allDone) {
            const anyError = current.some((r) => r.status === 'error')
            setAppState(anyError ? 'failed' : 'completed')
            setCurrentJobId(null)
          }
          return current
        })
      }
    })
    unsubscribeRef.current = unsub

    // Start the job
    await window.subLocalAPI.startJob({
      jobId,
      files: files.map((f) => f.path),
      targetLang,
      sourceLang,
      outputMode: burnSubtitles ? 'srt+burn' : 'srt',
      keepOriginal: advanced.keepOriginal,
      burnSubtitles,
      model: advanced.model,
      device: advanced.device,
      computeType: advanced.computeType,
      maxCharsPerLine: advanced.maxCharsPerLine,
      outputFolder: advanced.outputFolder,
      translationEngine: advanced.translationEngine,
    })
  }

  const handleCancel = async () => {
    if (!currentJobId) return
    await window.subLocalAPI.cancelJob(currentJobId)
    setResults((prev) =>
      prev.map((r) =>
        r.status === 'processing' || r.status === 'pending'
          ? { ...r, status: 'cancelled' }
          : r
      )
    )
    setAppState('failed')
    setCurrentJobId(null)
  }

  const handleReset = () => {
    setFiles([])
    setResults([])
    setAppState('idle')
    setCurrentJobId(null)
    if (unsubscribeRef.current) unsubscribeRef.current()
  }

  const isProcessing = appState === 'processing'
  const hasFiles = files.length > 0
  const isDone = appState === 'completed' || appState === 'failed'

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">SubLocal</h1>
        <p className="app-subtitle">Generate subtitles in your language. Locally.</p>
      </header>

      {/* Dependency warning */}
      {depWarning && (
        <div className="card section fade-in" style={{
          borderColor: 'rgba(251, 191, 36, 0.3)',
          background: 'var(--accent-warning-bg)',
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: 13, color: 'var(--accent-warning)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span>{depWarning}</span>
          </div>
        </div>
      )}

      {/* Drop zone — hide during processing if files already selected */}
      {!isProcessing && !isDone && (
        <div className="section">
          <DropZone onFiles={handleFiles} disabled={isProcessing} />
        </div>
      )}

      {/* Language row */}
      {hasFiles && (
        <div className="card section" style={{ padding: '18px 20px' }}>
          <LanguageRow
            targetLang={targetLang}
            sourceLang={sourceLang}
            onTargetChange={setTargetLang}
            onSourceChange={setSourceLang}
            disabled={isProcessing}
          />

          <hr className="divider" />

          {/* Output options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ opacity: 0.5, cursor: 'default' }}>
              <input type="checkbox" checked={true} readOnly />
              <span>
                Save <span style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>.srt</span> subtitle file next to video
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={burnSubtitles}
                onChange={(e) => setBurnSubtitles(e.target.checked)}
                disabled={isProcessing}
              />
              Burn subtitles into video (creates a new file)
            </label>
          </div>
        </div>
      )}

      {/* File queue */}
      {hasFiles && (
        <FileQueue
          files={files}
          results={results}
          onRemove={!isProcessing && !isDone ? handleRemoveFile : undefined}
          disabled={isProcessing}
        />
      )}

      {/* Progress */}
      <ProgressPanel
        results={results}
        currentFileIndex={currentFileIndex}
        onCancel={isProcessing ? handleCancel : undefined}
      />

      {/* Results */}
      <ResultsPanel results={results} />

      {/* CTA */}
      {hasFiles && !isProcessing && (
        <div className="cta-area section" style={{ marginTop: 8 }}>
          {!isDone ? (
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={!hasFiles}
              type="button"
            >
              Generate Subtitles
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleReset} type="button">
                Start over
              </button>
              <button
                className="btn-primary"
                onClick={handleGenerate}
                type="button"
                style={{ flex: 'unset' }}
              >
                Run again
              </button>
            </>
          )}
        </div>
      )}

      {/* Advanced settings */}
      {hasFiles && (
        <AdvancedSettings
          settings={advanced}
          onChange={setAdvanced}
          disabled={isProcessing}
        />
      )}

      {/* Privacy note */}
      <footer className="privacy-note">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1L1.5 3v3c0 2.76 1.88 5.35 4.5 6 2.62-.65 4.5-3.24 4.5-6V3L6 1z"
            stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Everything runs on your computer. Your videos are not uploaded.
      </footer>
    </div>
  )
}
