import type { ElectronSaveFileResult, ElectronOpenFileResult } from '../types/electron';

/**
 * Checks if the application is running inside the standalone offline Electron container.
 */
export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

/**
 * Saves a file to local disk.
 * In Electron: Uses native OS Save File dialog with exact directory selection.
 * In Web Browser: Uses standard HTML5 blob download anchor.
 */
export async function saveFileLocally(
  defaultName: string,
  content: string,
  filters?: Array<{ name: string; extensions: string[] }>,
  isBinary: boolean = false
): Promise<ElectronSaveFileResult> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.saveFile({
      defaultName,
      content,
      filters,
      isBinary,
    });
  }

  // Web Browser fallback
  try {
    const mimeType = defaultName.endsWith('.json')
      ? 'application/json'
      : defaultName.endsWith('.svg')
      ? 'image/svg+xml'
      : defaultName.endsWith('.md')
      ? 'text/markdown'
      : 'text/plain';

    let href = content;
    if (!content.startsWith('data:')) {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      href = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (!content.startsWith('data:')) {
      URL.revokeObjectURL(href);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Opens a file from local disk.
 * In Electron: Uses native OS Open File dialog.
 * In Web Browser: Returns null, allowing the standard file <input> to handle it.
 */
export async function openFileLocally(
  filters?: Array<{ name: string; extensions: string[] }>
): Promise<ElectronOpenFileResult | null> {
  if (isElectronApp() && window.electronAPI) {
    return await window.electronAPI.openFile({ filters });
  }
  return null;
}
