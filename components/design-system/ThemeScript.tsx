import { generateCSSVariables } from '@/lib/design-system/css-variables'

export function ThemeScript(): React.JSX.Element {
  const script = `
    (function() {
      function getTheme() {
        const stored = localStorage.getItem('enxi-theme');
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          return stored;
        }
        return 'system';
      }
      
      function getResolvedTheme(theme) {
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      }
      
      function applyTheme() {
        const theme = getTheme();
        const resolved = getResolvedTheme(theme);
        const root = document.documentElement;
        
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
        root.style.colorScheme = resolved;
      }
      
      applyTheme();
    })();
  `

  // Generate CSS for both themes
  const lightVars = generateCSSVariables('light')
  const darkVars = generateCSSVariables('dark')

  const cssContent = `
    :root.light {
      ${Object.entries(lightVars).map(([key, value]) => `${key}: ${value};`).join('\n      ')}
    }
    
    :root.dark {
      ${Object.entries(darkVars).map(([key, value]) => `${key}: ${value};`).join('\n      ')}
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssContent }} />
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  )
}