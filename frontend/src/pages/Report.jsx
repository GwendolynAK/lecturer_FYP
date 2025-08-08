import Icon from "@mdi/react";
import { mdiExportVariant } from "@mdi/js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Filter as FilterIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';

import { students } from "../data/students";
import Sidebar from "../components/Sidebar";

const Report = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleCollapsedChange = (newCollapsed) => {
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
  };
  const [displayCount, setDisplayCount] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [dropdown, setDropdown] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const itemsPerPage = displayCount;

  const dropdownRef = useRef(null);
  const exportRef = useRef(null);

  const location = useLocation();
  const [sliceName, setSliceName] = useState(location.state?.sliceName || "JAN");

  // Handle selected date from calendar
  useEffect(() => {
    if (location.state?.selectedDate && location.state?.fromCalendar) {
      setSelectedDate(new Date(location.state.selectedDate));
      // Clear the state to prevent re-triggering on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle status filter from navigation
  useEffect(() => {
    if (location.state?.statusFilter) {
      setStatusFilter(location.state.statusFilter);
      // Clear the state to prevent re-triggering on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutsideExport = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideExport);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideExport);
    };
  }, []);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const toggleDropdown = (column) => {
    setDropdown((prev) => (prev === column ? null : column));
  };

  const filteredStudents = students.filter((student) => {
    // Filter by status
    if (statusFilter === "present" && student.status !== "present") return false;
    if (statusFilter === "absent" && student.status !== "absent") return false;
    
    // Filter by selected date
    if (selectedDate) {
      const studentDate = new Date(student.date);
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const studentDateOnly = new Date(studentDate.getFullYear(), studentDate.getMonth(), studentDate.getDate());
      
      if (studentDateOnly.getTime() !== selectedDateOnly.getTime()) {
        return false;
      }
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const generateFileName = (ext) => {
    const reportDate = filteredStudents[0]?.date || new Date().toISOString();
    const dateObj = new Date(reportDate);
    const dateStr = dateObj
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "_");

    const filterLabel =
      statusFilter !== "all" ? `_filtered-${statusFilter}` : "";

    return `attendance_report${filterLabel}_For_${dateStr}.${ext}`;
  };

  const exportAsPDF = () => {
    setExportDropdownOpen(false);
    const doc = new jsPDF();
    const tableColumn = ["Full Name", "Index Number", "Status", "Date", "Time"];
    const tableRows = filteredStudents.map((s) => [
      `${s.firstName} ${s.lastName}`,
      s.indexNumber,
      s.status,
      s.date,
      s.time,
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
    });
    doc.save(generateFileName("pdf"));
  };

  const exportAsExcel = () => {
    setExportDropdownOpen(false);
    const worksheet = XLSX.utils.json_to_sheet(
      filteredStudents.map((s) => ({
        "Full Name": `${s.firstName} ${s.lastName}`,
        "Index Number": s.indexNumber,
        Status: s.status,
        Date: s.date,
        Time: s.time,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, generateFileName("xlsx"));
  };

  const exportAsCSV = () => {
    setExportDropdownOpen(false);
    const headers = ["Full Name", "Index Number", "Status", "Date", "Time"];
    const rows = filteredStudents.map((s) =>
      [
        s.firstName + " " + s.lastName,
        s.indexNumber,
        s.status,
        s.date,
        s.time,
      ].join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", generateFileName("csv"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === "name") {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return sortDirection === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }
    if (sortBy === "status") {
      const statusOrder = { present: 1, absent: 2 };
      return sortDirection === "asc"
        ? statusOrder[a.status] - statusOrder[b.status]
        : statusOrder[b.status] - statusOrder[a.status];
    }
    if (sortBy === "time") {
      return sortDirection === "asc"
        ? a.time.localeCompare(b.time)
        : b.time.localeCompare(a.time);
    }
    return 0;
  });

  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDisplayCountChange = (e) => {
    const value = e.target.value;
    setDisplayCount(value === "all" ? students.length : parseInt(value));
  };

  useEffect(() => {
  if (location.state?.showAlert && location.state?.sliceName) {
    const timeout = setTimeout(() => {
      alert(`Navigated from the "${location.state.sliceName}" section of the chart.`);
      window.history.replaceState({}, document.title);
    }, 300); // slight delay to ensure page renders

    return () => clearTimeout(timeout);
  }
}, [location.state]);

const handleView = () => {
    console.log("VIEW triggered for:", sliceName);
    // your actual view logic here
  };
  
  useEffect(() => {
  if (location.state?.fromChart) {
    handleView();
    window.history.replaceState({}, '');
  }
}, [location.state?.fromChart, sliceName]);

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
        {/* Main content */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-[98dvh] grid grid-cols-1 grid-rows-[auto_1fr_auto] gap-4">
      <div className=" col-start-1">
        <div className="flex justify-between">
          <div className="ml-5 text-xl font-bold content-center font-mulish text-gray-800 dark:text-gray-100">Attendance</div>

          <div className=" content-center justify-right">
            <label className="text-sm flex items-center gap-2 font-mulish text-gray-700 dark:text-gray-300">
              Showing
              <div className="relative">
                <select
                  className="appearance-none rounded px-2 py-1 pr-5 text-sm bg-green-200 dark:bg-green-700 dark:text-white focus:outline-none font-mulish"
                  value={
                    displayCount === students.length ? "all" : displayCount
                  }
                  onChange={handleDisplayCountChange}
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">All</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
              </div>
            </label>
          </div>

          <div className=" flex gap-6">
            <div className="relative">
              <select className="appearance-none bg-white dark:bg-gray-700 shadow rounded-full px-4 py-2 text-sm pr-8 border border-gray-300 dark:border-gray-600 focus:outline-none font-mulish text-gray-800 dark:text-gray-100">
                <option
                  value="2025"
                  selected={new Date().getFullYear() === 2025}
                >
                  2025/2026
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="appearance-none bg-white dark:bg-gray-700 shadow rounded-full px-4 py-2 text-sm pr-8 border border-gray-300 dark:border-gray-600 focus:outline-none font-mulish text-gray-800 dark:text-gray-100">
                <option value="SEM 1">SEM 1</option>
                <option value="SEM 2">SEM 2</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="appearance-none bg-white dark:bg-gray-700 shadow rounded-full px-4 py-2 text-sm pr-8 border border-gray-300 dark:border-gray-600 focus:outline-none font-mulish text-gray-800 dark:text-gray-100"
              value={sliceName}
              onChange={(e) => setSliceName(e.target.value)}
              >
                <option value="JAN">JAN</option>
                <option value="FEB">FEB</option>
                <option value="MAR">MAR</option>
                <option value="APR">APR</option>
                <option value="MAY">MAY</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className=" gap-2  flex items-center">
            <button className="shadow bg-green-500 text-white text-sm rounded-lg px-6 py-2 hover:bg-green-800 transition font-mulish" onClick={handleView}>
              View
            </button>
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="border bg-white dark:bg-gray-700 shadow text-black dark:text-white text-sm rounded-lg px-6 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center gap-2 font-mulish border-gray-300 dark:border-gray-600"
              >
                <Icon path={mdiExportVariant} size={0.7} />
                Export
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-4 w-40 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow z-20 text-sm animate-roll-down origin-top">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAsPDF();
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 font-mulish text-gray-800 dark:text-gray-100"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAsExcel();
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 font-mulish text-gray-800 dark:text-gray-100"
                  >
                    Export as Excel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAsCSV();
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 font-mulish text-gray-800 dark:text-gray-100"
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Indicator */}
      {selectedDate && (
        <div className="col-start-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800 dark:text-green-300 font-mulish">
              Showing attendance for: {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium px-2 py-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors font-mulish"
          >
            Clear Filter
          </button>
        </div>
      )}

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/20 col-start-1 row-start-2 overflow-hidden">
        <div className="overflow-auto h-[90%] scrollbar-hover animate-slide-in">
          <table className="min-w-full table-auto">
            <thead
              ref={dropdownRef}
              className="text-left text-sm font-semibold text-gray-500 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-800"
            >
              <tr>
                <th className="relative px-6 py-3 text-left">
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => toggleDropdown("name")}
                  >
                    <span className="relative flex items-center gap-1 font-mulish">
                      <span>FULL NAME</span>
                      <span className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 ${
                            sortBy === "name" && sortDirection === "asc"
                              ? "text-green-500"
                              : ""
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            sortBy === "name" && sortDirection === "desc"
                              ? "text-green-500"
                              : ""
                          }`}
                        />
                        {dropdown === "name" && (
                          <div className="absolute top-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow z-10 text-xs animate-roll-down origin-top">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSortBy("name");
                                setSortDirection("asc");
                                setDropdown(null);
                              }}
                              className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left font-mulish text-gray-800 dark:text-gray-100"
                            >
                              Ascending
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSortBy("name");
                                setSortDirection("desc");
                                setDropdown(null);
                              }}
                              className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left font-mulish text-gray-800 dark:text-gray-100"
                            >
                              Descending
                            </button>
                          </div>
                        )}
                      </span>
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-center font-mulish">INDEX NUMBER</th>
                <th className="relative px-6 py-3 text-right">
                  <div
                    className="flex items-center gap-1 justify-center cursor-pointer"
                    onClick={() => toggleDropdown("status")}
                  >
                    <span className="font-mulish">STATUS</span>
                    <span className="relative flex flex-col">
                      <ChevronUp
                        className={`w-3 h-3 ${
                          sortBy === "status" && sortDirection === "asc"
                            ? "text-green-500"
                            : ""
                        }`}
                      />
                      <ChevronDown
                        className={`w-3 h-3 -mt-1 ${
                          sortBy === "status" && sortDirection === "desc"
                            ? "text-green-500"
                            : ""
                        }`}
                      />
                      {dropdown === "status" && (
                        <div className="absolute  top-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow z-10 text-xs animate-roll-down origin-top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusFilter("all");
                              setDropdown(null);
                            }}
                            className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left font-mulish text-gray-800 dark:text-gray-100"
                          >
                            All
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusFilter("present");
                              setDropdown(null);
                            }}
                            className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left font-mulish text-gray-800 dark:text-gray-100"
                          >
                            Present
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusFilter("absent");
                              setDropdown(null);
                            }}
                            className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left font-mulish text-gray-800 dark:text-gray-100"
                          >
                            Absent
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                </th>
                <th className="relative px-6 py-3 text-right">
                  <div
                    className="flex items-center gap-1 justify-center cursor-pointer"
                    onClick={() => toggleDropdown("date")}
                  >
                    <span className="font-mulish">DATE</span>
                    <span className="relative flex flex-col">
                      <ChevronUp className="w-3 h-3" />
                      <ChevronDown className="w-3 h-3 -mt-1" />
                      {dropdown === "date" && (
                        <div className="absolute  top-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow z-10 text-xs animate-roll-down origin-top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdown(null);
                            }}
                            className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left whitespace-nowrap font-mulish text-gray-800 dark:text-gray-100"
                          >
                            W.I.P🙏🏼
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                </th>
                <th className="relative px-6 py-3 text-right">
                  <div
                    className="flex items-center gap-1 justify-center cursor-pointer"
                    onClick={() => toggleDropdown("time")}
                  >
                    <span className="font-mulish">TIME</span>
                    <span className="relative flex flex-col">
                      <ChevronUp
                        className={`w-3 h-3 ${
                          sortBy === "time" && sortDirection === "asc"
                            ? "text-green-500"
                            : ""
                        }`}
                      />
                      <ChevronDown
                        className={`w-3 h-3 -mt-1 ${
                          sortBy === "time" && sortDirection === "desc"
                            ? "text-green-500"
                            : ""
                        }`}
                      />
                      {dropdown === "time" && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow z-10 text-xs animate-roll-down origin-top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortBy("time");
                              setSortDirection("desc");
                              setDropdown(null);
                            }}
                            className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left font-mulish text-gray-800 dark:text-gray-100"
                          >
                            Latest
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortBy("time");
                              setSortDirection("asc");
                              setDropdown(null);
                            }}
                            className="block px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left font-mulish text-gray-800 dark:text-gray-100"
                          >
                            Earliest
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody
              className="text-sm text-gray-600 dark:text-gray-300 animate-fade-in relative"
              key={currentPage}
            >
              {paginatedStudents.map((student, i) => (
                <tr
                  className={`border-t border-gray-200 dark:border-gray-700 font-light text-gray-600 dark:text-gray-300 animate-fade-in ${
                    i === paginatedStudents.length - 1 ? "border-b" : ""
                  }`}
                  key={i}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-6 py-2 font-semibold font-mulish text-gray-800 dark:text-gray-100">{`${student.firstName} ${student.lastName}`}</td>
                  <td className="px-6 text-center font-mulish">{student.indexNumber}</td>
                  <td className="px-6 text-xs">
                    <div className="flex items-center justify-center h-full text-center">
                      <div
                        className={`${
                          student.status === "present"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-500 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                        } px-4 rounded-full py-1 font-bold font-mulish`}
                      >
                        {student.status}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 text-center font-mulish">
                    {new Date(student.date)
                      .toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                      .replace(/(\d{1,2})(st|nd|rd|th)?/, (match, d) => {
                        const day = parseInt(d, 10);
                        const suffix =
                          day % 10 === 1 && day !== 11
                            ? "st"
                            : day % 10 === 2 && day !== 12
                            ? "nd"
                            : day % 10 === 3 && day !== 13
                            ? "rd"
                            : "th";
                        return `${day}${suffix}`;
                      })}
                  </td>
                  <td className="px-6 text-center font-mulish">{student.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-start-1 row-start-3 flex absolute bottom-0 justify-center items-center w-full py-5 animate-fade-in animate-slide-in">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm disabled:opacity-50 flex items-center font-mulish text-gray-700 dark:text-gray-300"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, Math.min(currentPage - 3, totalPages - 5)),
                Math.max(5, Math.min(currentPage + 2, totalPages))
              )
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 text-sm flex items-center justify-center rounded-full font-mulish ${
                    currentPage === page
                      ? "bg-green-400 text-white "
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {page}
                </button>
              ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm disabled:opacity-50 flex items-center font-mulish text-gray-700 dark:text-gray-300"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
