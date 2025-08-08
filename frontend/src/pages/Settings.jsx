import { useState, useRef, useEffect } from "react";
import { IoPersonCircleOutline } from "react-icons/io5";
import { IoMdSunny } from "react-icons/io";
import {
  FaSignOutAlt,
  FaSave,
  FaCheck,
  FaUser,
  FaGraduationCap,
  FaUsers,
  FaClock,
  FaCalendarAlt,
  FaPencilAlt,
  FaMoon,
  FaTimes,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import ConfirmDialog from "../components/ConfirmDialog";
import CourseAttendanceChart from "../components/CourseAttendanceChart";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Build a flat list of course objects from the logged-in user's programs
  const courses = user?.programs
    ? user.programs.flatMap((program) =>
        program.courses.map((course) => ({ ...course, program: program.name }))
      )
    : [];

  const handleCollapsedChange = (newCollapsed) => {
    setCollapsed(newCollapsed);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newCollapsed));
  };

  // Ref for scroll container
  const scrollContainerRef = useRef(null);

  // Profile state
  const [profileName, setProfileName] = useState(user?.lecturerName || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [editMode, setEditMode] = useState(false);
  const [editEmail, setEditEmail] = useState(profileEmail);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalEmail, setModalEmail] = useState(profileEmail);
  const [modalPassword, setModalPassword] = useState("");
  const [modalConfirmPassword, setModalConfirmPassword] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Email modal multi-step states
  const [emailStep, setEmailStep] = useState(1); // 1: email input, 2: verification, 3: success
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  
  const fileInputRef = useRef();

  // Function to capitalize first letter of each word
  const capitalizeFirstLetter = (str) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Get selected course from localStorage (same as Dashboard.jsx)
  const getCourseKey = (course) =>
    `${course.code}-${course.program}-${course.level}`;

  const selectedCourseKey = localStorage.getItem("selectedClassKey");
  const selectedCourse =
    courses.find((course) => getCourseKey(course) === selectedCourseKey) ||
    courses[0];

  // Function to scroll to course in Allocated Courses section
  const scrollToCourse = () => {
    if (selectedCourse) {
      const courseIndex = courses.findIndex(
        (course) => getCourseKey(course) === getCourseKey(selectedCourse)
      );
      const courseElement = document.querySelector(
        `[data-course-index="${courseIndex}"]`
      );
      if (courseElement) {
        courseElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Add highlight effect
        courseElement.classList.add(
          "ring-2",
          "ring-green-500",
          "ring-opacity-50"
        );
        setTimeout(() => {
          courseElement.classList.remove(
            "ring-2",
            "ring-green-500",
            "ring-opacity-50"
          );
        }, 2000);
      }
    }
  };

  // Update profile data when user data changes
  useEffect(() => {
    if (user) {
      setProfileName(user.lecturerName || "");
      setProfileEmail(user.email || "");
      setEditEmail(user.email || "");
    }
  }, [user]);

  // Tab state
  const [activeTab, setActiveTab] = useState("profile");
  const [tabsVisible, setTabsVisible] = useState(true); // Initially true
  const tabsVisibleRef = useRef(tabsVisible);

  // Keep tabsVisibleRef in sync with tabsVisible state
  useEffect(() => {
    tabsVisibleRef.current = tabsVisible;
  }, [tabsVisible]);

  // Scroll handler with timeout-based detection
  useEffect(() => {
    const threshold = 200;
    let timeoutId = null;
    const scrollContainer = scrollContainerRef.current;

    const handleScroll = () => {
      const scrollY = scrollContainer.scrollTop;

      if (scrollY <= threshold) {
        if (!tabsVisibleRef.current) {
          setTabsVisible(true);
          tabsVisibleRef.current = true;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        return;
      }

      if (!tabsVisibleRef.current) {
        setTabsVisible(true);
        tabsVisibleRef.current = true;
      }

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (scrollContainer.scrollTop > threshold) {
          setTabsVisible(false);
          tabsVisibleRef.current = false;
        }
      }, 1500);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Animation states
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Intersection Observer for active tab detection
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px", // Adjust these values to control when sections are considered "in view"
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id.replace("tab-", "");
          if (sectionId !== activeTab) {
            setActiveTab(sectionId);
          }
        }
      });
    }, observerOptions);

    // Observe both sections
    const profileSection = document.getElementById("tab-profile");
    const classesSection = document.getElementById("tab-classes");

    if (profileSection) observer.observe(profileSection);
    if (classesSection) observer.observe(classesSection);

    return () => {
      if (profileSection) observer.unobserve(profileSection);
      if (classesSection) observer.unobserve(classesSection);
    };
  }, [activeTab]);

  // Add CSS for hiding scrollbar
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Handle email modal step 1 - send verification code
  const handleEmailStep1 = async () => {
    if (!modalEmail.trim()) {
      setModalError("Email is required");
      return;
    }
    
    setModalLoading(true);
    setModalError("");
    
    // Simulate sending verification code
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setCodeSent(true);
    setEmailStep(2);
    setModalLoading(false);
  };

  // Handle email modal step 2 - verify code
  const handleEmailStep2 = async () => {
    if (!verificationCode.trim()) {
      setModalError("Verification code is required");
      return;
    }
    
    if (verificationCode.length !== 6) {
      setModalError("Please enter the 6-digit verification code");
      return;
    }
    
    setModalLoading(true);
    setModalError("");
    
    // Simulate verification
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setProfileEmail(modalEmail);
    setEmailStep(3);
    setModalLoading(false);
    
    // Auto close after success message
    setTimeout(() => {
      setShowEmailModal(false);
      setEmailStep(1);
      setVerificationCode("");
      setCodeSent(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 2000);
  };

  // Handle password modal save
  const handlePasswordModalSave = async () => {
    if (!modalPassword.trim()) {
      setModalError("Password is required");
      return;
    }
    
    if (modalPassword !== modalConfirmPassword) {
      setModalError("Passwords do not match");
      return;
    }
    
    if (modalPassword.length < 6) {
      setModalError("Password must be at least 6 characters");
      return;
    }
    
    setModalLoading(true);
    setModalError("");
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setShowPasswordModal(false);
    setModalPassword("");
    setModalConfirmPassword("");
    setModalLoading(false);
    setSaveSuccess(true);
    
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle logout
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    logout(); // Use AuthContext logout function
    window.location.href = "/";
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: FaUser },
    { id: "classes", label: "Classes", icon: FaGraduationCap },
  ];

  return (
    <>
      <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={handleCollapsedChange}
        />

        {/* Main content area */}
        <div
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            collapsed ? "md:ml-10" : "md:ml-46"
          }`}
        >
          {/* Header */}
          <div className="px-6 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-xl font-bold content-center font-mulish text-gray-800 dark:text-gray-100
                "
                >
                  Settings
                </h1>
                {/* <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p> */}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg  transition-all duration-200 font-bold font-mulish"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto p-6 pt-0"
          >
            <div
              className={`transition-all duration-300 ${
                mounted ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Tab Navigation - Floating Sticky with Origin Behavior */}
              <div
                className={`sticky top-1 z-10 flex justify-center mb-4 transition-all duration-500 ${
                  tabsVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-4 pointer-events-none"
                }`}
              >
                <div className="flex space-x-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-xl backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          const element = document.getElementById(
                            `tab-${tab.id}`
                          );
                          if (element) {
                            element.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
                          activeTab === tab.id
                            ? "!bg-green-500 !text-white shadow-md"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {tab.id === "classes" && (
                          <div
                            className={`min-w-[1.5rem] h-6 rounded-full flex items-center justify-center text-sm font-bold px-1 ${
                              activeTab === tab.id
                                ? "bg-white text-green-500"
                                : "bg-gray-500 text-white"
                            }`}
                          >
                            {courses.length}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vertical Content Container */}
              <div className="space-y-8">
                {/* Profile Section */}
                <div id="tab-profile" className="scroll-mt-8">
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex-shrink-0">
                          <IoPersonCircleOutline className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Member Since: January 2024
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Last Login: Today, 2:30 PM
                          </p>
                        </div>
                      </div>

                      {/* Account Information Fields */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 dark:text-gray-300">
                              {" "}
                              Name
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {capitalizeFirstLetter(profileName)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-3">
                            <span className="text-sm  text-gray-500 dark:text-gray-300">
                              Email
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {profileEmail}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setModalEmail(profileEmail);
                              setEmailStep(1);
                              setVerificationCode("");
                              setCodeSent(false);
                              setModalError("");
                              setShowEmailModal(true);
                            }}
                            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-green-400 dark:hover:border-green-400 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                            title="Edit Email"
                          >
                            <FaPencilAlt className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 dark:text-gray-300">
                              Password
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              ••••••••
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setModalPassword("");
                              setModalConfirmPassword("");
                              setModalError("");
                              setShowPassword(false);
                              setShowConfirmPassword(false);
                              setShowPasswordModal(true);
                            }}
                            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-green-400 dark:hover:border-green-400 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                            title="Change Password"
                          >
                            <FaPencilAlt className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 dark:text-gray-300">
                              Theme
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                            </span>
                          </div>
                          <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-green-400 dark:hover:border-green-400 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                            title="Toggle Theme"
                          >
                            {theme === 'light' ? (
                              <FaMoon className="w-3 h-3" />
                            ) : (
                              <IoMdSunny className="w-3 h-3" />
                            )}
                          </button>
                        </div>



                        {saveSuccess && (
                          <div className="mt-4 flex items-center gap-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <FaCheck className="w-5 h-5" />
                            <span className="font-medium">
                              Profile updated successfully!
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected Course Card */}
                    <div
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 group relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300"
                      onClick={scrollToCourse}
                    >
                      <div className="relative">
                        {/* Header with badge and "Selected Course" text aligned horizontally */}
                        <div className="flex items-center mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-2xl">
                              {courses.findIndex(
                                (course) =>
                                  getCourseKey(course) ===
                                  getCourseKey(selectedCourse)
                              ) + 1}
                            </span>
                          </div>
                          <h4 className="text-lg font-semibold bg-gradient-to-br from-green-500 to-emerald-600 px-5 py-1 rounded-r-full text-white -ml-2 shadow-lg">
                            Selected Class
                          </h4>
                        </div>

                        {/* Course details */}
                        {selectedCourse ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {selectedCourse.code}
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {selectedCourse.level}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {selectedCourse.program}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <FaUsers className="w-4 h-4" />
                                  <span className="font-medium">Students:</span>
                                  <span>
                                    {selectedCourse.studentCount || "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <FaCalendarAlt className="w-4 h-4" />
                                  <span className="font-medium">Semester:</span>
                                  <span>
                                    {selectedCourse.semester || "Not specified"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">
                              No course selected
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Hover message with slide-up effect */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-emerald-600 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <p className="text-center py-3 font-medium">
                          Click to view class
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Classes Section */}
                <div id="tab-classes" className="scroll-mt-8">
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <IoPersonCircleOutline className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Total Courses
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {courses.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <FaUsers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Total Students
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {courses.reduce(
                                (sum, course) =>
                                  sum + (course.studentCount || 0),
                                0
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <FaClock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Active Sessions
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {
                                courses.filter(
                                  (course) => course.status === "active"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <FaCalendarAlt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              This Semester
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {
                                courses.filter(
                                  (course) =>
                                    course.semester === "First Semester"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Course List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                      <div className="p-4 pl-6 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Classes
                        </h3>
                        {/* <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your course allocations and schedules</p> */}
                      </div>

                      <div className="p-6">
                        <div className="space-y-4">
                          {courses.map((course, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600"
                              data-course-index={index}
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                                      <span className="text-white font-bold text-lg">
                                        {index + 1}
                                      </span>
                                    </div>
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {course.code}
                                      </h4>
                                      <p className="text-gray-600 dark:text-gray-400">
                                        {course.name}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">
                                          Program:
                                        </span>
                                        <span>{course.program}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">
                                          Level:
                                        </span>
                                        <span>{course.level}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">
                                          Semester:
                                        </span>
                                        <span>
                                          {course.semester || "Not specified"}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FaUsers className="w-4 h-4" />
                                        <span className="font-medium">
                                          Students:
                                        </span>
                                        <span>
                                          {course.studentCount || "N/A"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FaCalendarAlt className="w-4 h-4" />
                                        <span className="font-medium">
                                          Academic Year:
                                        </span>
                                        <span>
                                          {course.academicYear || "2024/2025"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Schedule - if available */}
                                  {course.schedule &&
                                    course.schedule.length > 0 && (
                                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                                          Schedule
                                        </h5>
                                        <div className="grid md:grid-cols-2 gap-3">
                                          {course.schedule.map(
                                            (session, sessionIndex) => (
                                              <div
                                                key={sessionIndex}
                                                className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500"
                                              >
                                                <div className="flex items-center gap-2 text-sm">
                                                  <FaClock className="w-4 h-4 text-green-500" />
                                                  <span className="font-medium text-gray-900 dark:text-white">
                                                    {session.day}
                                                  </span>
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                  {session.time} •{" "}
                                                  {session.venue}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 lg:flex-shrink-0">
                                  <div className="w-32 h-32 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
                                    <CourseAttendanceChart 
                                      attendanceData={{ 
                                        present: Math.floor(Math.random() * 30) + 70, // Random between 70-100%
                                        absent: Math.floor(Math.random() * 30) + 0 // Random between 0-30%
                                      }} 
                                    />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Overall Attendance</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      {/* Email Edit Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {emailStep === 1 ? "Edit Email" : emailStep === 2 ? "Verify Email" : "Success"}
              </h3>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailStep(1);
                  setVerificationCode("");
                  setCodeSent(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            {/* Step 1: Email Input */}
            {emailStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your email"
                  />
                </div>
                
                {modalError && (
                  <div className="text-red-600 dark:text-red-400 text-sm">{modalError}</div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handleEmailStep1}
                    disabled={modalLoading}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {modalLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FaSave />
                    )}
                    {modalLoading ? "Sending Code..." : "Verify Email"}
                  </button>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Verification Code */}
            {emailStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Verification Code Sent
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We've sent a 6-digit verification code to <strong>{modalEmail}</strong>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg font-mono"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                
                {modalError && (
                  <div className="text-red-600 dark:text-red-400 text-sm">{modalError}</div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handleEmailStep2}
                    disabled={modalLoading}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {modalLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FaCheck />
                    )}
                    {modalLoading ? "Verifying..." : "Verify Code"}
                  </button>
                  <button
                    onClick={() => setEmailStep(1)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {emailStep === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  Email Updated Successfully!
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your email has been updated to <strong>{modalEmail}</strong>
                </p>
                <div className="pt-4">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Edit Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <FaEye className="w-4 h-4" />
                    ) : (
                      <FaEyeSlash className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={modalConfirmPassword}
                    onChange={(e) => setModalConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? (
                      <FaEye className="w-4 h-4" />
                    ) : (
                      <FaEyeSlash className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              {modalError && (
                <div className="text-red-600 dark:text-red-400 text-sm">{modalError}</div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handlePasswordModalSave}
                  disabled={modalLoading}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {modalLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaSave />
                  )}
                  {modalLoading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
