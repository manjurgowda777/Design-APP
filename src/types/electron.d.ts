export interface ElectronSaveFileResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export interface ElectronOpenFileResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  content?: string;
  canceled?: boolean;
  error?: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  saveFile: (options: {
    defaultName?: string;
    content: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    isBinary?: boolean;
  }) => Promise<ElectronSaveFileResult>;
  openFile: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<ElectronOpenFileResult>;
  getLocalPaths: () => Promise<{
    userData: string;
    documents: string;
    desktop: string;
    appPath: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
