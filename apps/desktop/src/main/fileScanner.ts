import fs from 'fs'
import path from 'path'

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v'])

// Patterns to skip
const SKIP_PATTERNS = [
  /^\./, // hidden files/folders
  /^__pycache__$/,
  /node_modules/,
  /\.he\.srt$/,
  /\.en\.srt$/,
  /\.fr\.srt$/,
  /\.de\.srt$/,
  /\.es\.srt$/,
  /\.ar\.srt$/,
  /\.ru\.srt$/,
  /\.ja\.srt$/,
  /\.ko\.srt$/,
  /\.zh\.srt$/,
  /\.original\./,
  /\.with-.*-subtitles\./,
]

export interface ScannedFile {
  path: string
  name: string
  size: number
}

function shouldSkip(name: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(name))
}

/**
 * Scans a folder for video files (first-level and one level deep).
 * Returns an array of scanned file objects.
 */
export function scanFolderForVideos(
  folderPath: string,
  maxDepth = 2,
  currentDepth = 0
): ScannedFile[] {
  const results: ScannedFile[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(folderPath, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue

    const fullPath = path.join(folderPath, entry.name)

    if (entry.isDirectory()) {
      if (currentDepth < maxDepth - 1) {
        const nested = scanFolderForVideos(fullPath, maxDepth, currentDepth + 1)
        results.push(...nested)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (VIDEO_EXTENSIONS.has(ext)) {
        try {
          const stat = fs.statSync(fullPath)
          results.push({
            path: fullPath,
            name: entry.name,
            size: stat.size,
          })
        } catch {
          // Skip files we can't stat
        }
      }
    }
  }

  return results
}

/**
 * Generates the output SRT path for a video file.
 * Example: Monster_S1E1.mkv → Monster_S1E1.he.srt
 */
export function getOutputSrtPath(
  videoPath: string,
  langCode: string,
  outputFolder?: string
): string {
  const dir = outputFolder || path.dirname(videoPath)
  const base = path.basename(videoPath, path.extname(videoPath))
  return path.join(dir, `${base}.${langCode}.srt`)
}

/**
 * Generates the output burned video path.
 * Example: Monster_S1E1.mkv → Monster_S1E1.with-hebrew-subtitles.mp4
 */
export function getOutputVideoPath(
  videoPath: string,
  langName: string,
  outputFolder?: string
): string {
  const dir = outputFolder || path.dirname(videoPath)
  const base = path.basename(videoPath, path.extname(videoPath))
  const slug = langName.toLowerCase().replace(/\s+/g, '-')
  return path.join(dir, `${base}.with-${slug}-subtitles.mp4`)
}

/**
 * Format bytes to human-readable size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
