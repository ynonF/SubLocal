import { execFile } from 'child_process'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Returns the path to the FFmpeg binary.
 * Checks bundled resources first, then falls back to system PATH.
 */
export function getFFmpegPath(): string {
  // Check bundled FFmpeg in app resources
  const resourcesPath = process.resourcesPath || ''
  const win = path.join(resourcesPath, 'ffmpeg', 'ffmpeg.exe')
  const unix = path.join(resourcesPath, 'ffmpeg', 'ffmpeg')

  if (fs.existsSync(win)) return win
  if (fs.existsSync(unix)) return unix

  // Dev: also check local worker/ffmpeg folder
  const devWin = path.resolve(__dirname, '../../../../worker/ffmpeg/ffmpeg.exe')
  const devUnix = path.resolve(__dirname, '../../../../worker/ffmpeg/ffmpeg')
  if (fs.existsSync(devWin)) return devWin
  if (fs.existsSync(devUnix)) return devUnix

  // Fall back to system PATH
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
}

/**
 * Checks whether FFmpeg is available and executable.
 */
export async function checkFFmpeg(): Promise<boolean> {
  const ffmpegPath = getFFmpegPath()
  try {
    await execFileAsync(ffmpegPath, ['-version'], { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Returns the FFmpeg version string.
 */
export async function getFFmpegVersion(): Promise<string | null> {
  const ffmpegPath = getFFmpegPath()
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ['-version'], { timeout: 5000 })
    const match = stdout.match(/ffmpeg version ([^\s]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
