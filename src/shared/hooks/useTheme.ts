import { useEffect, useState } from 'react';

export type ColorTheme = 'light' | 'dark';

const STORAGE_KEY = 'mp4-to-gif:theme';

function readStoredTheme(): ColorTheme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    // Storage can be blocked (private mode, strict settings); fall back to the OS theme.
    return null;
  }
}

function systemTheme(): ColorTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Light or dark theme. Follows the OS until the user picks one, then remembers the choice. */
export function useTheme(): { theme: ColorTheme; toggleTheme: () => void } {
  const [choice, setChoice] = useState<ColorTheme | null>(readStoredTheme);
  const theme = choice ?? systemTheme();

  useEffect(() => {
    if (choice) document.documentElement.dataset.theme = choice;
  }, [choice]);

  const toggleTheme = () => {
    const next: ColorTheme = theme === 'dark' ? 'light' : 'dark';
    setChoice(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted, but the theme still applies for this visit.
    }
  };

  return { theme, toggleTheme };
}
