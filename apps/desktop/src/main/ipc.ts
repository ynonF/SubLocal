import { ipcMain, dialog, shell, app } from 'electron'
import path from 'path'
import { mainWindow } from './main'
import { startWorkerJob, cancelWorkerJob } from './workers'
import { scanFolderForVideos } from './fileScanner'
import { checkFFmpeg } from './ffmpeg'
import fs from 'fs'

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v']

export function registerIpcHandlers(): void {
  // Select individual video files
  ipcMain.handle('select-videos', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select video files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'm4v'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled) return []

    return result.filePaths.map((p) => ({
      path: p,
      name: path.basename(p),
      size: fs.statSync(p).size,
    }))
  })

  // Select folder and scan for videos
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select folder containing videos',
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) return []

    const folderPath = result.filePaths[0]
    return scanFolderForVideos(folderPath)
  })

  // Start a processing job
  ipcMain.handle('start-job', async (_event, config) => {
    const jobId = config.jobId
    startWorkerJob(config, (msg) => {
      mainWindow?.webContents.send('job-progress', msg)
    })
    return jobId
  })

  // Cancel a running job
  ipcMain.handle('cancel-job', async (_event, jobId: string) => {
    cancelWorkerJob(jobId)
  })

  // Open a file with the default system application
  ipcMain.handle('open-path', async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  // Open the folder containing a file
  ipcMain.handle('open-folder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // Check if FFmpeg and Python worker are available
  ipcMain.handle('check-dependencies', async () => {
    const ffmpegOk = await checkFFmpeg()
    const workerOk = await checkWorkerAvailable()
    return { ffmpeg: ffmpegOk, worker: workerOk }
  })

  // Install a translation package
  ipcMain.handle(
    'install-translation-package',
    async (_event, sourceLang: string, targetLang: string) => {
      await installTranslationPackage(sourceLang, targetLang)
    }
  )

  // Get app version
  ipcMain.handle('get-app-version', () => app.getVersion())
}

async function checkWorkerAvailable(): Promise<boolean> {
  const workerPath = getWorkerPath()
  if (!workerPath) return false
  return fs.existsSync(workerPath)
}

export function getWorkerPath(): string | null {
  // In packaged app, worker is in extraResources
  const resourcesPath = process.resourcesPath
  const bundledWorker = path.join(resourcesPath, 'worker', 'sublocal_worker')
  if (fs.existsSync(bundledWorker)) return bundledWorker

  // In dev, look for Python in PATH or use the worker directory
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    // Return null to indicate we use Python from PATH
    return null
  }

  return null
}

async function installTranslationPackage(
  sourceLang: string,
  targetLang: string
): Promise<void> {
  // Delegate to worker process for package installation
  const { spawn } = await import('child_process')
  return new Promise((resolve, reject) => {
    const workerCmd = getWorkerCommand()
    const args = [
      '--install-translation-package',
      sourceLang,
      targetLang,
    ]

    const proc = spawn(workerCmd.cmd, [...workerCmd.args, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Install failed with code ${code}`))
    })

    proc.on('error', reject)
  })
}

export function getWorkerCommand(): { cmd: string; args: string[] } {
  const isDev = process.env.NODE_ENV === 'development'
  const resourcesPath = process.resourcesPath || ''

  if (!isDev) {
    // Packaged: use bundled PyInstaller binary
    const exePath = path.join(resourcesPath, 'worker', 'sublocal_worker.exe')
    if (fs.existsSync(exePath)) {
      return { cmd: exePath, args: [] }
    }
    // Unix
    const unixPath = path.join(resourcesPath, 'worker', 'sublocal_worker')
    return { cmd: unixPath, args: [] }
  }

  // Dev: use python from PATH
  const workerDir = path.resolve(__dirname, '../../../../worker')
  return {
    cmd: process.platform === 'win32' ? 'python' : 'python3',
    args: ['-m', 'sublocal_worker.main'],
  }
}
