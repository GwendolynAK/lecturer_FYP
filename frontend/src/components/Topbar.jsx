// src/components/Topbar.jsx
import { useState } from 'react';
import { useTheme } from '../theme/ThemeContext'
import { FaMoon } from 'react-icons/fa'
import { IoMdSunny } from 'react-icons/io'
import { IoMenu } from 'react-icons/io5'
import { FiLogOut } from 'react-icons/fi'
import { IoPersonCircleOutline } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from './ConfirmDialog'

export default function Topbar({ setSidebarOpen }) {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAvatarClick = () => {
    navigate('/settings')
  }

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = () => {
    logout();
    navigate('/');
  }

  const handleThemeToggle = () => {
    setIsAnimating(true)
    toggleTheme()
    setTimeout(() => setIsAnimating(false), 300)
  }

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    let greeting = 'Good evening';
    if (currentHour < 12) {
      greeting = 'Good morning';
    } else if (currentHour < 18) {
      greeting = 'Good afternoon';
    }
    const fullName = user?.lecturerName || 'User';
    const firstName = fullName.split(' ')[0].toLowerCase(); // Get just the first name and make it lowercase
    const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1); // Capitalize first letter
    return `${greeting}, ${capitalizedFirstName}!`;
  }

  return (
    <>
      <div className="flex justify-between items-center pl-4">
        <div className="flex items-center gap-2">
          {/* Hamburger icon for mobile only */}
          <button
            className="md:hidden p-2 rounded-md bg-green-500 text-white shadow-lg"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <IoMenu className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold font-mulish">{getGreeting()}</h2>
        </div>
        <div className="flex items-center gap-1">
          <IoPersonCircleOutline
            className="w-8 h-8 text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100 transition-colors" 
            onClick={handleAvatarClick}
          />
          <button 
            onClick={handleThemeToggle} 
            className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
            disabled={isAnimating}
          >
            {theme === 'light' ? (
              <FaMoon className="text-gray-700 dark:text-gray-300" />
            ) : (
              <div className={`transition-transform duration-300 ${isAnimating ? 'rotate-180' : ''}`}>
                <IoMdSunny className="text-gray-700 dark:text-gray-300" />
              </div>
            )}
          </button>
          <button 
            onClick={handleLogoutClick} 
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            title="Logout"
          >
            <FiLogOut className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will be redirected to the login page."
        confirmText="Logout"
        cancelText="Cancel"
        confirmColor="red"
      />
    </>
  )
}