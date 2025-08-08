import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartSimple, faChartPie, faListCheck } from '@fortawesome/free-solid-svg-icons';
import AuthForm from '../components/AuthForm';

function FeatureIcons() {
  return (
    <div className="flex gap-4 mt-8">
      <div className="w-16 h-16 flex items-center justify-center rounded-lg border border-blue-200 ">
        <FontAwesomeIcon icon={faChartSimple} className="!text-white" style={{ width: '70%', height: '70%' }} />
      </div>
      <div className="w-16 h-16 flex items-center justify-center rounded-lg border border-blue-200 ">
        <FontAwesomeIcon icon={faChartPie} className="!text-white" style={{ width: '70%', height: '70%' }} />
      </div>
      <div className="w-16 h-16 flex items-center justify-center rounded-lg border border-blue-200 ">
        <FontAwesomeIcon icon={faListCheck} className="!text-white" style={{ width: '70%', height: '70%' }} />
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login');

  // Removed the hardcoded theme override to allow proper theme persistence

  const handleModeChange = (newMode) => {
    setAuthMode(newMode);
  };

  return (
    <div className="z-10 w-full h-[100dvh] flex flex-col md:flex-row overflow-hidden">
      {/* Left: Emerald panel */}
      <div className="md:w-1/2 w-full !bg-emerald-500 !text-white flex flex-col justify-between p-8 md:p-10">
        <div 
          className="flex items-center gap-3 mb-6 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('/')}
        >
          <img src={require("../assets/images/checkmark.png")} alt="Checkmark Logo" className="w-20 h-20" style={{filter: 'brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.15))'}} />
          <span className="font-reeniebeanie text-4xl font-extrabold tracking-wide text-white drop-shadow-lg">COURSE CORRECT</span>
        </div>
        <p className="mb-6 text-white/90 max-w-xs text-lg font-mulish">A platform for managing courses, attendance, and insights with ease and style.</p>
        <FeatureIcons />
        <div></div>
      </div>
      {/* Right: White panel with concave curve */}
      <div className="md:w-1/2 w-full !bg-white !text-gray-900 flex flex-col items-center justify-center relative md:h-auto">
        {/* SVG concave curve mask for desktop */}
        <svg className="hidden md:block absolute -left-24 top-0 h-full w-48 z-10" viewBox="0 0 120 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M120 0 Q 0 300 120 600 V600 H0 V0 H120 Z" fill="#10b981" />
        </svg>
        <div className="flex-1 flex flex-col items-center justify-center z-20 w-full">
         <AuthForm mode={authMode} onModeChange={handleModeChange}/>
        </div>
      </div>
    </div>
  );
}
