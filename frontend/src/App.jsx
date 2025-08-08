// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SliceNameProvider } from './context/SliceNameContext';
import { ThemeProvider } from './theme/ThemeContext';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Settings from './pages/Settings';
import Geolocation from './pages/Geolocation';
import ManualAttendance from './pages/ManualAttendance';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <PublicRoute>
          <Landing />
        </PublicRoute>
      } />
     {/*  <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} /> */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute>
          <Report />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/geolocation" element={
        <ProtectedRoute>
          <Geolocation />
        </ProtectedRoute>
      } />
      <Route path="/manual-attendance" element={
     <ProtectedRoute>
       <ManualAttendance />
     </ProtectedRoute>
   } />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SliceNameProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </SliceNameProvider>
    </ThemeProvider>
  );
}

export default App;
