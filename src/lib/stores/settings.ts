import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'sts-settings';

export interface RunsPathInfo {
  /** Currently active path (custom if set and valid, otherwise auto-detected) */
  current_path: string | null;
  /** Whether a custom path is currently set */
  is_custom: boolean;
  /** The auto-detected path (if any) */
  auto_detected_path: string | null;
  /** Whether the current path exists and is valid */
  path_exists: boolean;
}

export interface Settings {
  /** Custom runs path set by the user */
  customRunsPath: string | null;
}

const defaultSettings: Settings = {
  customRunsPath: null,
};

function loadSettings(): Settings {
  if (!browser) return defaultSettings;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  
  return defaultSettings;
}

function saveSettings(settings: Settings): void {
  if (!browser) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<Settings>(loadSettings());

  return {
    subscribe,
    
    /** Set a custom runs path */
    setCustomPath: (path: string | null) => {
      update(s => {
        const newSettings = { ...s, customRunsPath: path };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    /** Clear the custom runs path */
    clearCustomPath: () => {
      update(s => {
        const newSettings = { ...s, customRunsPath: null };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    /** Get current settings value */
    get: () => get({ subscribe }),
    
    /** Initialize settings (call on app start) */
    initialize: () => {
      if (browser) {
        set(loadSettings());
      }
    },
  };
}

export const settings = createSettingsStore();

// Tauri invoke wrapper for settings
export async function invokeGetPathInfo(): Promise<RunsPathInfo> {
  if (!browser) {
    return {
      current_path: null,
      is_custom: false,
      auto_detected_path: null,
      path_exists: false,
    };
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<RunsPathInfo>('get_runs_path_info');
  } catch (e) {
    console.error('Failed to get runs path info:', e);
    return {
      current_path: null,
      is_custom: false,
      auto_detected_path: null,
      path_exists: false,
    };
  }
}

export async function invokeSetPath(path: string): Promise<RunsPathInfo> {
  if (!browser) {
    throw new Error('Not in browser environment');
  }
  
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke<RunsPathInfo>('set_runs_path', { path });
  
  // Also persist to localStorage
  settings.setCustomPath(path);
  
  return result;
}

export async function invokeClearPath(): Promise<RunsPathInfo> {
  if (!browser) {
    throw new Error('Not in browser environment');
  }
  
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke<RunsPathInfo>('clear_runs_path');
  
  // Also clear from localStorage
  settings.clearCustomPath();
  
  return result;
}

/** 
 * Initialize the backend with the saved custom path from localStorage.
 * Call this on app startup to restore persisted settings.
 */
export async function initializePathFromStorage(): Promise<void> {
  if (!browser) return;
  
  const stored = settings.get();
  if (stored.customRunsPath) {
    try {
      await invokeSetPath(stored.customRunsPath);
      console.log('Restored custom runs path from storage:', stored.customRunsPath);
    } catch (e) {
      console.warn('Failed to restore custom path, clearing:', e);
      settings.clearCustomPath();
    }
  }
}
