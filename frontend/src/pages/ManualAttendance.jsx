import React, { useState, useMemo, useEffect } from "react";
import { students } from "../data/students";
import { ChevronLeft, Search, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const ManualAttendance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [attendance, setAttendance] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleCollapsedChange = (newCollapsed) => {
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
  };

  // Check if we came from Geolocation page
  const fromGeolocation = location.state?.fromGeolocation;
  const geolocationState = location.state;

  // Save attendance data to sessionStorage whenever it changes
  useEffect(() => {
    if (Object.keys(attendance).length > 0) {
      const stateToSave = {
        attendance,
        searchTerm,
        fromGeolocation,
        geolocationState,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(
        "manualAttendanceState",
        JSON.stringify(stateToSave)
      );
    }
  }, [attendance, searchTerm, fromGeolocation, geolocationState]);

  // Restore attendance data from sessionStorage on component mount
  useEffect(() => {
    const savedState = sessionStorage.getItem("manualAttendanceState");
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        const stateAge = Date.now() - parsedState.timestamp;

        // Only restore state if it's less than 1 hour old
        if (stateAge < 3600000) {
          if (parsedState.attendance) setAttendance(parsedState.attendance);
          if (parsedState.searchTerm) setSearchTerm(parsedState.searchTerm);
        } else {
          // Clear old state
          sessionStorage.removeItem("manualAttendanceState");
        }
      } catch (error) {
        console.error("Error restoring manual attendance state:", error);
        sessionStorage.removeItem("manualAttendanceState");
      }
    }
  }, []);

  // Sort students A-Z by name and filter by search term
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        const fullName =
          `${student.firstName} ${student.lastName}`.toLowerCase();
        const indexNumber = student.indexNumber.toLowerCase();
        const search = searchTerm.toLowerCase();

        return fullName.includes(search) || indexNumber.includes(search);
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [searchTerm]);

  const handleCheckboxChange = (studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSubmit = () => {
    // Handle attendance submission
    console.log("Attendance submitted:", attendance);
    // You can add navigation or success message here
  };

  const handleBack = () => {
    if (fromGeolocation) {
      // If coming from Geolocation, return to GPS marking with preserved state
      navigate("/geolocation", {
        state: {
          fromManualAttendance: true,
          venue: geolocationState?.venue,
          range: geolocationState?.range,
          isMarking: geolocationState?.isMarking,
          attendanceCount: geolocationState?.attendanceCount,
          position: geolocationState?.position,
          manualAttendanceData: attendance, // Pass back the manual attendance data
        },
        replace: true,
      });
    } else {
      // Normal back navigation
      navigate(-1);
    }
  };

  // Count attendance only for filtered students
  const presentCount = filteredStudents.reduce((count, student) => {
    const key = `${student.firstName}-${student.lastName}-${student.indexNumber}`;
    return attendance[key] ? count + 1 : count;
  }, 0);

  const absentCount = filteredStudents.reduce((count, student) => {
    const key = `${student.firstName}-${student.lastName}-${student.indexNumber}`;
    return attendance[key] ? count : count + 1;
  }, 0);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={handleCollapsedChange}
      />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'md:ml-10' : 'md:ml-46'}`}>
        <div className="flex-1 overflow-hidden p-4">
          {/* --- Original ManualAttendance content starts here --- */}
          <div className="h-[98dvh] grid grid-cols-1 grid-rows-[auto_1fr] gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="flex items-center cursor-pointer rounded-lg transition-colors group"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-black dark:group-hover:text-gray-100 transition-colors" />
                  <span className="text-gray-600 group-hover:text-black dark:group-hover:text-gray-100 font-mulish transition-colors">Back</span>
                </button>
                <h1 className="text-2xl font-bold font-mulish text-gray-800 dark:text-gray-100">Manual Attendance</h1>
              </div>

              <div className="flex items-center gap-4">
                {/* Student Count */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 font-mulish">
                  {/* Show venue info if coming from Geolocation */}
                  {fromGeolocation && geolocationState?.venue && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg">
                      <MapPin className="w-4 h-4" />
                      <span className="font-mulish">
                        Venue: {geolocationState.venue}
                      </span>
                    </div>
                  )}
                  <div>
                    Total: {" "}
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {filteredStudents.length}
                    </span>
                  </div>
                  <div>
                    Present: {" "}
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {presentCount}
                    </span>
                  </div>
                  {/* <div>Absent: <span className="font-semibold text-red-600 dark:text-red-400">{absentCount}</span></div> */}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Name or Index Number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mulish w-64 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors font-mulish"
                >
                  Submit Attendance
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="relative bg-white dark:bg-gray-800 h-[96%] rounded-xl shadow dark:shadow-gray-900/20 overflow-hidden">
              <div className="overflow-auto scrollbar-hover h-[100%] animate-slide-in">
                <table className="min-w-full table-auto">
                  <thead className="text-left text-sm font-semibold text-gray-500 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left font-mulish">FULL NAME</th>
                      <th className="px-6 py-3 text-center font-mulish">
                        INDEX NUMBER
                      </th>
                      <th className="px-6 py-3 text-center font-mulish">
                        ATTENDANCE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-600 dark:text-gray-300 animate-fade-in relative">
                    {filteredStudents.map((student, index) => (
                      <tr
                        key={student.id || index}
                        className="border-t border-gray-200 dark:border-gray-700 font-light text-gray-600 dark:text-gray-300 animate-fade-in hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <td className="px-6 py-4 font-semibold font-mulish text-gray-800 dark:text-gray-100">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-6 py-4 text-center font-mulish">
                          {student.indexNumber}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={
                              attendance[
                                `${student.firstName}-${student.lastName}-${student.indexNumber}`
                              ] || false
                            }
                            onChange={() =>
                              handleCheckboxChange(
                                `${student.firstName}-${student.lastName}-${student.indexNumber}`
                              )
                            }
                            className="w-5 h-5 text-green-600 dark:text-green-400 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-green-500 dark:focus:ring-green-400 focus:ring-2 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* --- End ManualAttendance content --- */}
        </div>
      </div>
    </div>
  );
};

export default ManualAttendance;
