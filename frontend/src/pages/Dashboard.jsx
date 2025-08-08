// src/pages/Dashboard.jsx
import AttendanceDoughnutChart from "../components/AttendanceDoughnutChart";
import DailyAttendanceDoughnutChart from "../components/DailyAttendanceDoughnutChart";
import ModernCalendar from "../components/ModernCalendar";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { students } from "../data/students";
import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  // Build a flat list of course objects from the logged-in user's programs
  const courses = user?.programs
    ? user.programs.flatMap(program => program.courses.map(course => ({ ...course, program: program.name })))
    : [];

  // Unique key for each course
  const getCourseKey = (course) => `${course.code}-${course.program}-${course.level}`;

  // On mount, check localStorage for last selected class
  useEffect(() => {
    if (courses.length > 0) {
      const savedKey = localStorage.getItem('selectedClassKey');
      const found = courses.find(c => getCourseKey(c) === savedKey);
      if (found) {
        setSelectedCourse(getCourseKey(found));
      } else {
        setSelectedCourse(getCourseKey(courses[0]));
      }
    }
    // eslint-disable-next-line
  }, [user]);

  // Handle text scaling
  useEffect(() => {
    const resizeText = () => {
      const title = document.querySelector('.overview-title');
      if (!title) return;
      
      const container = title.parentElement;
      const containerWidth = container.offsetWidth;
      const textWidth = title.scrollWidth;
      
      if (textWidth > containerWidth) {
        const scale = containerWidth / textWidth;
        title.style.setProperty('--scale', scale.toString());
      } else {
        title.style.setProperty('--scale', '1');
      }
    };

    resizeText();
    window.addEventListener('resize', resizeText);
    
    return () => window.removeEventListener('resize', resizeText);
  }, []);

  // On selection, save to localStorage
  const handleSelectCourse = (course) => {
    const key = getCourseKey(course);
    setSelectedCourse(key);
    localStorage.setItem('selectedClassKey', key);
  };

  // Debug: log user and mapped courses
  console.log('User object:', user);
  console.log('Mapped courses:', courses);

  // Debug: log each full course object after flattening
  courses.forEach(course => {
    console.log('Full course:', course);
  });

  // Set default selected course to the first code if available
  const [selectedCourse, setSelectedCourse] = useState(() => courses[0] || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleArrowClick = () => {
    navigate('/report');
  };

  const handlePresentClick = () => {
    navigate('/report', { state: { statusFilter: 'present' } });
  };

  const handleAbsentClick = () => {
    navigate('/report', { state: { statusFilter: 'absent' } });
  };

  const handleCollapsedChange = (newCollapsed) => {
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        collapsed={collapsed} 
        setCollapsed={handleCollapsedChange} 
      />
      
      {/* Main content area */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'md:ml-10' : 'md:ml-46'}`}>
        {/* Topbar */}
        <div className="px-4 py-3">
          <Topbar setSidebarOpen={setSidebarOpen} />
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-hidden p-4 pt-0">
          <div className="h-full w-full overflow-hidden flex">
            <div className="grid grid-cols-1 md:grid-cols-[25%_50%_1fr] md:grid-rows-[15%_1fr_1fr] gap-2 w-full
              sm:grid-cols-1 sm:grid-rows-none
              ">
              {/* My Class Section - First on small screens, positioned on medium+ */}
              <div className="col-span-1 md:col-span-2 md:col-start-2 md:row-start-1 bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 flex flex-row md:flex-row justify-between items-center pl-2 p-1 md:p-1 md:mt-0 order-1 md:order-4">
                <div className="flex items-center justify-between w-full px-3">
                  <div className="text-xl md:text-3xl md:font-normal py-2 rounded content-center font-mulish text-gray-800 dark:text-gray-100">
                    My Class
                  </div>
                </div>
                <div
                  className={
                    `flex gap-1 md:gap-1 h-full mt-0 md:mt-0 w-full whitespace-nowrap overflow-x-auto course-scrollbar ` +
                    (courses.length >= 5 ? 'md:max-w-[31rem]' : 'max-w-max')
                  }
                >
                  {courses.map((course) => {
                    // Robust Top-up detection in level field
                    let programType = course.program?.split(' ')[0] || '';
                    const levelStr = String(course.level || '').toLowerCase().replace(/[()]/g, '');
                    if (levelStr.includes('top up') || levelStr.includes('top-up')) {
                      programType = 'Top-up';
                    }
                    // Debug log
                    console.log('Checking:', course.code, '|', course.program, '|', course.level, '|', programType);
                    return (
                      <div
                        key={getCourseKey(course)}
                        className={`group relative flex flex-col justify-between items-center text-center text-sm border shadow px-3 py-2 gap-1 rounded-xl max-w-32  w-24 cursor-pointer transition-all duration-200 active:scale-95 active:shadow-sm ${
                          selectedCourse === getCourseKey(course)
                            ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600 shadow-md"
                            : "bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-green-300 dark:hover:border-green-600 border-gray-200 dark:border-gray-600"
                        }`}
                        onClick={() => handleSelectCourse(course)}
                      >
                        {/* Selection indicator */}
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-all duration-200 ${
                            selectedCourse === getCourseKey(course)
                              ? "bg-green-500 shadow-sm"
                              : "border-2 border-gray-400 dark:border-gray-500 opacity-0 group-hover:opacity-100"
                          }`}
                        ></div>
                        {/* Centered course code */}
                        <div className="flex-1 flex items-center justify-center w-full">
                          <span className="text-md font-mulish text-gray-800 dark:text-gray-100 font-bold">{course.code}</span>
                        </div>
                        {/* Program type at the bottom */}
                        <div className="w-full flex justify-center">
                          <span className="text-xs font-mulish text-gray-500 dark:text-gray-300">{programType}</span>
                        </div>
                      </div>
                    );
                  })}
                  {courses.length === 0 && (
                    <div className="text-gray-500 px-4 py-2">No courses found for this user.</div>
                  )}
                </div>
              </div>

              {/* Mark Attendance Card - Second on small screens */}
              <div className="md:col-start-3 md:row-start-2 relative group h-full mb-2 md:mt-0 order-2 md:order-5">
                {/* Main card container */}
                <div className="relative h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-500 ease-out transform group-hover:scale-[1.02] group-hover:shadow-xl">
                  {/* Background pattern on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"></div>
                  </div>

                  {/* Main content */}
                  <div className="relative h-full flex flex-col items-center justify-center p-6">
                    {/* Icon */}
                    <div className="relative mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-500 ease-out">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Main title */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors duration-300 font-mulish">
                        Mark Attendance
                      </h3>
                    </div>

                    {/* Hover overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/95 to-emerald-600/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                      <div className="text-center p-6">
                        {/* Main icon */}
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>

                        {/* Description */}
                        <p className="text-white/80 text-sm font-mulish mb-4">
                          Record student attendance using GPS + QR Codes or manual
                          entry
                        </p>

                        {/* Action hint */}
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                          <p className="text-white/80 text-xs font-mulish">
                            Click to start
                          </p>
                          <div
                            className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
                            style={{ animationDelay: "0.5s" }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom accent line */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out"></div>
                  </div>
                </div>

                {/* Click handler */}
                <div
                  className="absolute inset-0 cursor-pointer z-10"
                  onClick={() => navigate("/geolocation")}
                ></div>
              </div>

              {/* Today's Attendance Overview - Third on small screens, first on medium+ */}
              <div className="relative md:row-span-3 md:col-start-1 bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 flex flex-col w-full order-3 md:order-1">
                <div className="w-full px-4 md:px-6 pt-2 pb-5 rounded-2xl shadow dark:shadow-gray-900/20 mb-6 md:mb-5 group relative">
                  <div 
                    className="absolute top-3 right-2 w-7 h-7 flex items-center justify-center group-hover:rotate-90 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 text-gray-50 ease-linear duration-300 rounded-full border border-gray-200 dark:border-gray-600 group-hover:border-none rotate-45 cursor-pointer hover:shadow-md"
                    onClick={handleArrowClick}
                  >
                    <svg
                      className="w-3 h-3 fill-gray-800 dark:fill-gray-200 group-hover:fill-gray-800 dark:group-hover:fill-gray-200"
                      viewBox="0 0 16 19"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between mb-5 w-[90%]">
                    <div className="w-full overflow-hidden">
                      <h3 className="overview-title text-lg font-semibold font-mulish text-gray-800 dark:text-gray-100 whitespace-nowrap w-full text-left transform-gpu origin-left scale-100 [transform:scale(var(--scale))] [--scale:1]" style={{ '--scale': 'var(--scale, 1)' }}>
                        Today's Attendance Overview
                      </h3>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-4xl font-bold font-mulish text-gray-800 dark:text-gray-100">200</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mulish">
                      Total students
                    </p>
                  </div>
                  <div className="">
                    <DailyAttendanceDoughnutChart 
                      onPresentClick={handlePresentClick}
                      onAbsentClick={handleAbsentClick}
                    />
                  </div>
                </div>
                <div className="grid flex-1 grid-rows-[auto_auto_1fr] grid-cols-1 grid-rows-3 p-2">
                  <div className="text-lg font-bold mb-2 font-mulish bg-gradient-to-r text-gray-800 dark:text-gray-100">
                    Top performers
                  </div>
                  <div className="flex-1 grid auto-rows-fr grid-cols-1 grid-rows-4 gap-1">
                    {[...students]
                      .sort((a, b) => b.attendance - a.attendance)
                      .slice(0, 5)
                      .map((student, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[auto_1fr_1fr_auto] items-center text-[12px] gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <img
                            className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-600 shadow-sm"
                            src={student.avatar}
                            alt=""
                          />
                          <span className="font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap font-mulish">
                            {student.firstName} {student.lastName}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300 font-mulish">
                            {student.indexNumber}
                          </span>
                          <span className="font-bold text-green-600 dark:text-green-400 font-mulish">
                            {student.attendance}%
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className=" text-[11px] py-1">
                    <Link to="/report" className="block">
                      <div className="flex items-center gap-1 mb-2">
                        <p className="text-gray-500 dark:text-gray-400 font-mulish">View more</p>
                        <ChevronRight className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Monthly Attendance - Third on small screens */}
              <div className="relative bg-white dark:bg-gray-800 pt-2.5 px-2 md:px-4 pb-8 border dark:border-gray-700 rounded-2xl shadow dark:shadow-gray-900/20 md:row-span-2 md:col-start-2 group md:mt-0 order-3 md:order-2">
                <div className=" text-lg  font-bold text-gray-800 dark:text-gray-100 mb-2 font-mulish">
                  Monthly Attendance
                </div>
                <div className="h-64 md:h-full">
                  <AttendanceDoughnutChart />
                </div>
              </div>

              {/* Modern Calendar Component - Fourth on small screens */}
              <div className="md:col-start-3 md:mt-0 order-4 md:order-3">
                <ModernCalendar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
