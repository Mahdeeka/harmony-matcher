import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [systemTheme, setSystemThemeValue] = useState('light');

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemThemeValue(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e) => {
      setSystemThemeValue(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('harmony-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (systemTheme === 'dark') {
      setTheme('dark');
    }
  }, [systemTheme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('harmony-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');
  const setSystemTheme = () => setTheme(systemThemeValue);

  return (
    <ThemeContext.Provider value={{
      theme,
      systemTheme,
      toggleTheme,
      setLightTheme,
      setDarkTheme,
      setSystemTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      isSystem: theme === systemTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
