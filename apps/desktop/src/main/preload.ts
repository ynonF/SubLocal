import { contextBridge, ipcRenderer } from 'electron'

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

const subLocalAPI = {
  selectVideos: (): Promise<SelectedFile[]> =>
    ipcRenderer.invoke('select-videos'),

  selectFolder: (): Promise<SelectedFile[]> =>
    ipcRenderer.invoke('select-folder'),

  startJob: (config: JobConfig): Promise<string> =>
    ipcRenderer.invoke('start-job', config),

  cancelJob: (jobId: string): Promise<void> =>
    ipcRenderer.invoke('cancel-job', jobId),

  onProgress: (
    callback: (msg: WorkerMessage & { jobId: string; fileIndex: number }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      msg: WorkerMessage & { jobId: string; fileIndex: number }
    ) => callback(msg)
    ipcRenderer.on('job-progress', handler)
    return () => ipcRenderer.removeListener('job-progress', handler)
  },

  openPath: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('open-path', filePath),

  openFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('open-folder', filePath),

  checkDependencies: (): Promise<{ ffmpeg: boolean; worker: boolean }> =>
    ipcRenderer.invoke('check-dependencies'),

  installTranslationPackage: (
    sourceLang: string,
    targetLang: string
  ): Promise<void> =>
    ipcRenderer.invoke('install-translation-package', sourceLang, targetLang),

  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-app-version'),
}

contextBridge.exposeInMainWorld('subLocalAPI', subLocalAPI)

declare global {
  interface Window {
    subLocalAPI: typeof subLocalAPI
  }
}
