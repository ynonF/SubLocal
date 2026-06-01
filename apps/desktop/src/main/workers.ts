import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { getWorkerCommand } from './ipc'

interface JobConfig {
  jobId: string
  files: string[]
  targetLang: string
  sourceLang: string
  outputMode: string
  keepOriginal: boolean
  burnSubtitles: boolean
  model: string
  device: string
  computeType: string
  maxCharsPerLine: number
  outputFolder?: string
  translationEngine: string
}

type ProgressCallback = (msg: Record<string, unknown> & { jobId: string; fileIndex: number }) => void

const activeJobs = new Map<string, ChildProcess>()

export function startWorkerJob(config: JobConfig, onMessage: ProgressCallback): void {
  const { jobId, files, targetLang, sourceLang, keepOriginal, burnSubtitles,
    model, device, computeType, maxCharsPerLine, outputFolder, translationEngine } = config

  const workerCmd = getWorkerCommand()

  let fileIndex = 0
  const processNextFile = () => {
    if (fileIndex >= files.length) return

    const file = files[fileIndex]
    const currentIndex = fileIndex
    fileIndex++

    const args = [
      '--input', file,
      '--target-lang', targetLang,
      '--source-lang', sourceLang,
      '--output-mode', burnSubtitles ? 'srt+burn' : 'srt',
      '--keep-original', keepOriginal ? 'true' : 'false',
      '--burn-video', burnSubtitles ? 'true' : 'false',
      '--model', model,
      '--device', device,
      '--compute-type', computeType,
      '--max-chars', String(maxCharsPerLine),
      '--translation-engine', translationEngine,
    ]

    if (outputFolder) {
      args.push('--output-folder', outputFolder)
    }

    const allArgs = [...workerCmd.args, ...args]

    // Set up PYTHONPATH in dev mode
    const env = { ...process.env }
    if (process.env.NODE_ENV === 'development') {
      const workerDir = path.resolve(__dirname, '../../../../worker')
      env.PYTHONPATH = workerDir
    }

    const proc = spawn(workerCmd.cmd, allArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    })

    activeJobs.set(`${jobId}:${currentIndex}`, proc)

    let buffer = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const msg = JSON.parse(trimmed)
          onMessage({ ...msg, jobId, fileIndex: currentIndex })

          if (msg.type === 'done') {
            activeJobs.delete(`${jobId}:${currentIndex}`)
            // Process next file
            processNextFile()
          }
        } catch {
          // Non-JSON line from worker — treat as a status message
          onMessage({
            type: 'progress',
            stage: 'info',
            percent: 0,
            message: trimmed,
            jobId,
            fileIndex: currentIndex,
          })
        }
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) {
        // Log stderr to console in dev, silently swallow in production
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Worker stderr] ${text}`)
        }
      }
    })

    proc.on('error', (err) => {
      activeJobs.delete(`${jobId}:${currentIndex}`)
      onMessage({
        type: 'error',
        message: friendlyWorkerError(err),
        details: err.message,
        jobId,
        fileIndex: currentIndex,
      })
    })

    proc.on('close', (code) => {
      activeJobs.delete(`${jobId}:${currentIndex}`)
      if (code !== 0 && code !== null) {
        onMessage({
          type: 'error',
          message: 'Something went wrong while processing this video.',
          details: `Worker exited with code ${code}`,
          jobId,
          fileIndex: currentIndex,
        })
      }
    })
  }

  processNextFile()
}

export function cancelWorkerJob(jobId: string): void {
  // Cancel all processes for this job
  for (const [key, proc] of activeJobs.entries()) {
    if (key.startsWith(jobId)) {
      proc.kill('SIGTERM')
      activeJobs.delete(key)
    }
  }
}

function friendlyWorkerError(err: Error): string {
  if (err.message.includes('ENOENT')) {
    return 'SubLocal could not find the processing engine. Please check your installation.'
  }
  if (err.message.includes('EACCES') || err.message.includes('EPERM')) {
    return 'SubLocal does not have permission to run the processing engine.'
  }
  return 'Something went wrong while starting the subtitle generator.'
}
