import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';

const ModernCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDaysArray = (date) => {
    const days = [];
    const totalDays = daysInMonth(date);
    const firstDay = firstDayOfMonth(date);
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day) => {
    return selectedDate && day === selectedDate.getDate() && 
           currentDate.getMonth() === selectedDate.getMonth() && 
           currentDate.getFullYear() === selectedDate.getFullYear();
  };

  const handleDateClick = (day) => {
    if (day) {
      const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      setSelectedDate(newSelectedDate);
      
      // Navigate to Report page with the selected date
      navigate('/report', { 
        state: { 
          selectedDate: newSelectedDate.toISOString(),
          fromCalendar: true 
        } 
      });
    }
  };

  const handleManualAttendance = () => {
    navigate('/manual-attendance');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/20 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 font-mulish">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px] text-center font-mulish">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1 font-mulish">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {getDaysArray(currentDate).map((day, index) => (
          <div
            key={index}
            className={`
              aspect-square flex items-center justify-center text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 font-mulish
              ${!day ? 'text-transparent' : ''}
              ${day && isToday(day) ? 'bg-green-500 text-white font-bold' : ''}
              ${day && isSelected(day) && !isToday(day) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-600' : ''}
              ${day && !isToday(day) && !isSelected(day) ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' : ''}
            `}
            onClick={() => handleDateClick(day)}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Footer with manual attendance button */}
   {/*    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mulish">
              {selectedDate ? selectedDate.toLocaleDateString() : 'No date selected'}
            </span>
          </div>
        </div>
        <button
          onClick={handleManualAttendance}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm font-mulish"
        >
          Mark Attendance
        </button>
      </div> */}
    </div>
  );
};

export default ModernCalendar; 