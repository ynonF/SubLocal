export interface SelectedFile {
  path: string
  name: string
  size: number
}

export interface JobConfig {
  jobId: string
  files: string[]
  targetLang: string
  sourceLang: string
  outputMode: 'srt' | 'srt+burn'
  keepOriginal: boolean
  burnSubtitles: boolean
  model: string
  device: string
  computeType: string
  maxCharsPerLine: number
  outputFolder?: string
  translationEngine: string
}

export interface ProgressMessage {
  type: 'progress'
  stage: string
  percent: number
  message: string
  file?: string
}

export interface DoneMessage {
  type: 'done'
  outputSrtPath: string
  outputVideoPath?: string
  detectedLanguage?: string
}

export interface ErrorMessage {
  type: 'error'
  message: string
  details?: string
}

export type WorkerMessage = ProgressMessage | DoneMessage | ErrorMessage

export interface FileResult {
  file: SelectedFile
  status: 'pending' | 'processing' | 'done' | 'error' | 'cancelled'
  progress: number
  stage: string
  message: string
  outputSrtPath?: string
  outputVideoPath?: string
  errorMessage?: string
  errorDetails?: string
  detectedLanguage?: string
}

export type AppState = 'idle' | 'files-selected' | 'processing' | 'completed' | 'failed'

export interface AdvancedSettings {
  model: string
  device: string
  computeType: string
  keepOriginal: boolean
  burnSubtitles: boolean
  maxCharsPerLine: number
  outputFolder?: string
  translationEngine: string
}
