// src/components/Sidebar.jsx
import { IoSettingsOutline, IoMenu } from "react-icons/io5";
import { HiOutlineChartBar } from "react-icons/hi2";
import { LuLayoutDashboard } from "react-icons/lu";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import checkmark from "../assets/images/checkmark.png";
import { NavLink } from "react-router-dom";
import { useState } from "react";

export default function Sidebar({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }) {
  // Sidebar is persistent on md+ (md:flex), drawer on mobile
  return (
    <>
      {/* Persistent sidebar on md+ */}
      <div className={`hidden md:flex flex-col h-screen shadow-lg z-30 fixed top-0 left-0 transition-all duration-300
        ${collapsed ? 'rounded-r-md bg-green-400 w-10' : 'bg-white dark:bg-gray-800 w-46'}
      `}>
        <div className={`flex items-center  ${collapsed ? 'justify-center px-0 mt-16' : 'gap-1 mt-10 mb-5'}  ${collapsed ? 'pl-0 pr-0' : 'pl-4 pr-6'} text-2xl font-bold relative group`}>
          <img src={checkmark} alt="Logo" className={`${collapsed ? 'w-5' : 'w-8'}`}/>
          {!collapsed && (
            <p className="font-reeniebeanie text-lg text-black dark:text-gray-100 font-mulish whitespace-nowrap">
              COURSE CORRECT
            </p>
          )}
          {/* Collapse/expand button (md+ only, show on hover, positioned on sidebar edge) */}
          <button
            className={`absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2  rounded-full  shadow-lg border ${collapsed? 'border-white dark:border-green-900 bg-green-400 text-white hover:bg-green-600': 'dark:text-white text-gray-300 border-gray hover:bg-gray-500 bg-white dark:border-gray-900 dark:bg-gray-800 dark:hover:bg-gray-600'} transition-colors  focus:outline-none hidden md:flex items-center justify-center`}
            style={{ zIndex: 40 }}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            tabIndex={0}
          >
            {collapsed ? <FiChevronRight size={15} /> : <FiChevronLeft size={15} />}
          </button>
        </div>
        <nav className={`flex flex-col  dark:border-gray-700 pt-5  ${collapsed ? 'items-center px-0' : 'items-start px-4 space-y-4  border-t'}`}>
          <NavItem
            icon={<LuLayoutDashboard />}
            label="Dashboard"
            to="/dashboard"
            collapsed={collapsed}
          />
          <NavItem
            icon={<HiOutlineChartBar />}
            label="Report"
            to="/report"
            collapsed={collapsed}
          />
          <NavItem
            icon={<IoSettingsOutline />}
            label="Settings"
            to="/settings"
            collapsed={collapsed}
          />
        </nav>
      </div>
      {/* Drawer sidebar on mobile */}
      <div
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-800 flex flex-col justify-between shadow-lg
          transition-transform duration-300 ease-in-out
          md:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ transitionProperty: 'transform, background-color' }}
      >
        {/* Close button for drawer */}
        <button
          className="absolute top-4 right-4 z-[101] p-2 rounded-md bg-green-500 text-white shadow-lg"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2 mt-10 mb-5 pl-4 pr-6 text-2xl font-bold">
            <img src={checkmark} alt="Logo" className="w-8"/>
            <p className="font-reeniebeanie text-lg text-black dark:text-gray-100 font-mulish">
              COURSE CORRECT
            </p>
          </div>
          <nav className="flex flex-col items-start border-t dark:border-gray-700 pt-10 space-y-4 px-4">
            <NavItem
              icon={<LuLayoutDashboard />}
              label="Dashboard"
              to="/dashboard"
              collapsed={false}
              onClick={() => setSidebarOpen(false)}
            />
            <NavItem
              icon={<HiOutlineChartBar />}
              label="Report"
              to="/report"
              collapsed={false}
              onClick={() => setSidebarOpen(false)}
            />
            <NavItem
              icon={<IoSettingsOutline />}
              label="Settings"
              to="/settings"
              collapsed={false}
              onClick={() => setSidebarOpen(false)}
            />
          </nav>
        </div>
      </div>
      {/* Overlay for drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        ></div>
      )}
    </>
  );
}

function NavItem({ icon, label, to, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        ` group flex items-center w-full rounded-sm cursor-pointer transition-colors ${
          collapsed ? "justify-center p-4 bg-transparent hover:bg-white/20 w-5" : "hover:bg-gray-200 dark:hover:bg-gray-700 gap-3 p-1.5 pl-3"
        } ${isActive && !collapsed ? "bg-green-300 dark:bg-green-600 hover:bg-green-300 dark:hover:bg-green-600 text-black dark:text-white" : "hover:bg-white-200 text-gray-700 dark:text-gray-300"}`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`text-l ${collapsed ? "text-gray-800" : ""}`}>{icon}</div>
          {!collapsed && <span className="text-xs font-light font-mulish">{label}</span>}
          {collapsed && (
            <div
              className={`absolute w-1 right-0 bg-white dark:bg-gray-200 rounded-l-md transition-all duration-300 ${
                isActive
                  ? "h-5 "
                  : "h-0 group-hover:h-10 group-hover:w-full -z-10"
              }`}
            />
          )}
        </>
      )}
    </NavLink>
  );
}
