// src/theme/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  // Get theme from localStorage immediately to prevent flash
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        // Apply theme immediately to prevent flash
        document.documentElement.classList.toggle('dark', savedTheme === 'dark')
        return savedTheme
      }
    }
    return 'light'
  }

  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    // Apply theme class to document element
    document.documentElement.classList.toggle('dark', theme === 'dark')
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)