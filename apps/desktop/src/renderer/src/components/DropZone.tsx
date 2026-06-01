import React, { useState, useRef, useCallback } from 'react'
import { SelectedFile } from '../lib/types'

interface DropZoneProps {
  onFiles: (files: SelectedFile[]) => void
  disabled?: boolean
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v'])

function getExt(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setDragOver(false)

      if (disabled) return

      const items = Array.from(e.dataTransfer.items)
      const files: SelectedFile[] = []

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            const ext = getExt(file.name)
            if (VIDEO_EXTENSIONS.has(ext)) {
              files.push({
                // @ts-expect-error Electron exposes the full path on dropped files
                path: file.path || file.name,
                name: file.name,
                size: file.size,
              })
            }
          }
        }
      }

      if (files.length > 0) {
        onFiles(files)
      }
    },
    [disabled, onFiles]
  )

  const handlePickFiles = async () => {
    if (disabled) return
    const result = await window.subLocalAPI.selectVideos()
    if (result.length > 0) onFiles(result)
  }

  const handlePickFolder = async () => {
    if (disabled) return
    const result = await window.subLocalAPI.selectFolder()
    if (result.length > 0) onFiles(result)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className={`drop-zone${dragOver ? ' drag-over' : ''}${disabled ? '' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handlePickFiles}
        style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handlePickFiles()}
        aria-label="Drop video files or click to choose"
      >
        <div className="drop-zone-icon">
          {dragOver ? '📂' : '🎬'}
        </div>
        <div className="drop-zone-text">
          {dragOver ? 'Drop to add videos' : 'Drop a video file or folder here'}
        </div>
        <div className="drop-zone-hint">
          Supports MP4, MKV, MOV, AVI, WebM, M4V
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn-secondary"
          onClick={handlePickFiles}
          disabled={disabled}
          style={{ flex: 1 }}
          type="button"
        >
          Choose video
        </button>
        <button
          className="btn-secondary"
          onClick={handlePickFolder}
          disabled={disabled}
          style={{ flex: 1 }}
          type="button"
        >
          Choose folder
        </button>
      </div>
    </div>
  )
}
