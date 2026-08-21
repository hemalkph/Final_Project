/**
 * React-native equivalent of main.js's theme-switcher logic (same
 * localStorage key and data-theme attribute, so switching in the React
 * admin app stays in sync with every other page). main.js's own
 * initThemeSwitcher() does raw DOM injection and isn't reusable inside a
 * React tree, hence this small reimplementation rather than an import.
 */
const THEME_STORAGE_KEY = 'theme';

export type Theme = 'spring' | 'ocean';

export function getCurrentTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const attr = document.documentElement.getAttribute('data-theme');
  return (stored === 'ocean' || attr === 'ocean') ? 'ocean' : 'spring';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
