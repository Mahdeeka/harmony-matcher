import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme, setSystemTheme, isSystem } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleTheme}
        className={`${sizeClasses[size]} rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-200 flex items-center justify-center btn-touch`}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className={`${iconSizeClasses[size]} text-yellow-500`} />
        ) : (
          <Moon className={`${iconSizeClasses[size]} text-gray-600`} />
        )}
      </button>

      {/* System theme indicator */}
      {isSystem && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
          <Monitor className="w-2 h-2 text-white" />
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
