import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createThemeStore() {
  // Default to dark mode
  const { subscribe, set, update } = writable(true);

  return {
    subscribe,
    toggle: () => update(isDark => {
      const newValue = !isDark;
      if (browser) {
        localStorage.setItem('theme', newValue ? 'dark' : 'light');
        document.documentElement.classList.toggle('light', !newValue);
        document.documentElement.classList.toggle('dark', newValue);
      }
      return newValue;
    }),
    initialize: () => {
      if (browser) {
        const stored = localStorage.getItem('theme');
        let isDark: boolean;
        if (stored) {
          isDark = stored === 'dark';
        } else {
          isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        set(isDark);
        document.documentElement.classList.toggle('light', !isDark);
        document.documentElement.classList.toggle('dark', isDark);
      }
    }
  };
}

export const isDarkMode = createThemeStore();
