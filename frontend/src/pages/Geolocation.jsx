import React, { useEffect, useState, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate, useLocation } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";
import { io } from "socket.io-client";
import config from "../config.js";
import Sidebar from "../components/Sidebar";

// Fix default marker icon issue in leaflet
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// Custom red location pin icon
const redPinIcon = L.divIcon({
  className: "custom-pin-marker",
  html: `
    <div style="
      width: 24px;
      height: 32px;
      position: relative;
    ">
      <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.63-5.37-12-12-12z" fill="#ef4444"/>
        <circle cx="12" cy="12" r="6" fill="white"/>
      </svg>
    </div>
  `,
  iconSize: [24, 32],
  iconAnchor: [12, 32], // Anchor at the bottom tip of the pin
});

const DEFAULT_POSITION = [5.614818, -0.205874]; // Accra, Ghana as fallback

function SetViewOnLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 18); // Zoom in closer for better visibility
    }
  }, [position, map]);
  return null;
}

const GreenRoundedQRCode = ({ value, size }) => {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current) return;
    let width = 120,
      height = 120;
    if (size) {
      width = height = size;
    } else {
      const parent = ref.current.parentElement;
      width = parent ? parent.offsetWidth : 120;
      height = parent ? parent.offsetHeight : 120;
    }
    const qrCode = new QRCodeStyling({
      width,
      height,
      data: value,
      dotsOptions: {
        color: "#22c55e",
        type: "rounded",
      },
      backgroundOptions: {
        color: "transparent",
      },
      cornersSquareOptions: {
        color: "#22c55e",
        type: "extra-rounded",
      },
      cornersDotOptions: {
        color: "#22c55e",
      },
    });
    ref.current.innerHTML = "";
    qrCode.append(ref.current);
    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [value, size]);
  return <div ref={ref} className="w-full h-full" />;
};

// Responsive QR wrapper for robust mounting on mobile only
function ResponsiveQR({ value, size = 180 }) {
  const containerRef = useRef(null);
  const [canRender, setCanRender] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let timeout;
    let observer;
    function checkSize() {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 50 && height > 50) {
          setCanRender(true);
        }
      }
    }
    checkSize();
    timeout = setTimeout(checkSize, 200);
    if (window.ResizeObserver && containerRef.current) {
      observer = new ResizeObserver(checkSize);
      observer.observe(containerRef.current);
    }
    return () => {
      clearTimeout(timeout);
      if (observer && containerRef.current) observer.disconnect();
    };
  }, [isMobile]);

  return (
    <div ref={containerRef} className="flex justify-center items-center w-full h-full min-h-[120px]">
      {canRender && <GreenRoundedQRCode value={value} size={isMobile ? size : undefined} />}
    </div>
  );
}

const Geolocation = () => {
  const [isMarking, setIsMarking] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(50);
  const [venue, setVenue] = useState("");
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [isEditingVenue, setIsEditingVenue] = useState(false);
  const [venueInput, setVenueInput] = useState("");
  const [isEditingRange, setIsEditingRange] = useState(false);
  const [rangeInput, setRangeInput] = useState("");
  const [qrFullScreen, setQrFullScreen] = useState(false);
  const [rippleBackgroundRadius, setRippleBackgroundRadius] = useState(range);
  const [rippleBackgroundOpacity, setRippleBackgroundOpacity] = useState(0.1);
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleCollapsedChange = (newCollapsed) => {
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
  };

  // Establish WebSocket connection immediately for settings updates
  useEffect(() => {
    socketRef.current = io(config.getWebSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    
    socketRef.current.on("connect", () => {
      console.log("Connected to WebSocket server for settings");
      console.log("Socket ID:", socketRef.current.id);
    });
    
    socketRef.current.on("roleAssigned", (data) => {
      console.log("Role assigned:", data.role);
      if (data.role === 'admin') {
        console.log("This client is now admin, sending current settings");
        // Send current settings immediately when becoming admin
        socketRef.current.emit("adminSettings", {
          range: range,
          venue: venue,
          timestamp: Date.now(),
        });
        console.log("Sent initial adminSettings: range=", range, "venue=", venue);
      }
    });
    
    socketRef.current.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });
    
    socketRef.current.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [range, venue]); // Add range and venue as dependencies

  // Test function to manually send settings
  const testSendSettings = () => {
    console.log("Testing manual settings send...");
    console.log("Current range:", range);
    console.log("Current venue:", venue);
    console.log("Socket connected:", socketRef.current?.connected);
    
    if (socketRef.current) {
      socketRef.current.emit("adminSettings", {
        range: range,
        venue: venue,
        timestamp: Date.now(),
      });
      console.log("Manually sent adminSettings: range=", range, "venue=", venue);
    } else {
      console.error("No WebSocket connection available");
    }
  };

  // Only connect to socket and share GPS when marking is active
  const startMarking = () => {
    // WebSocket connection is already established, just start GPS sharing
    setIsMarking(true);
    console.log("START MARKING: GPS sharing started");
    
    // Start geolocation sharing
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      console.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        console.log("Initial position:", pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setError("Unable to retrieve your location");
        console.error("Error getting initial position:", err);
      }
    );
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        console.log("Position update:", pos.coords.latitude, pos.coords.longitude);
        // Optionally, emit location to server here
        if (socketRef.current) {
          socketRef.current.emit("adminLocation", {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            range: range,
            venue: venue,
            timestamp: Date.now(),
          });
          console.log("Sent adminLocation to server:", pos.coords.latitude, pos.coords.longitude, "range:", range);
        }
      },
      (err) => {
        console.error("Error watching position:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const stopMarking = () => {
    setIsMarking(false);
    setPosition(null);
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      console.log("Stopped GPS sharing.");
    }
    
    // Clear admin location from backend when stopping marking
    if (socketRef.current) {
      socketRef.current.emit("clearAdminLocation", {
        timestamp: Date.now(),
      });
      console.log("Sent clearAdminLocation to server");
    }
    
    // Don't disconnect WebSocket - keep it alive for settings updates
    console.log("STOP MARKING: GPS sharing stopped, WebSocket remains connected for settings.");
  };

  // Ripple effect for background when marking is active
  useEffect(() => {
    if (!isMarking) {
      setRippleBackgroundRadius(range);
      setRippleBackgroundOpacity(0.1);
      return;
    }
    let animationFrame;
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % 2000) / 2000; // 2 second cycle
      // Create a sine wave effect for smooth pulsing
      const scale = 1 + 0.2 * Math.sin(progress * 2 * Math.PI);
      const opacity = 0.1 + 0.15 * Math.sin(progress * 2 * Math.PI);
      setRippleBackgroundRadius(range * scale);
      setRippleBackgroundOpacity(opacity);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isMarking, range]);

  // Restore state when returning from Manual Attendance page
  useEffect(() => {
    if (location.state?.fromManualAttendance) {
      // Restore the state that was passed from Manual Attendance
      if (location.state.venue !== undefined) setVenue(location.state.venue);
      if (location.state.range !== undefined) setRange(location.state.range);
      if (location.state.isMarking !== undefined)
        setIsMarking(location.state.isMarking);
      if (location.state.attendanceCount !== undefined)
        setAttendanceCount(location.state.attendanceCount);

      // Clear the state to prevent re-triggering on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Restore state from sessionStorage on component mount (ONLY ONCE)
  useEffect(() => {
    const savedState = sessionStorage.getItem("geolocationState");

    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        const stateAge = Date.now() - parsedState.timestamp;

        // Only restore state if it's less than 1 hour old
        if (stateAge < 3600000) {
          if (parsedState.venue !== undefined) setVenue(parsedState.venue);
          if (parsedState.range !== undefined) setRange(parsedState.range);
          if (parsedState.isMarking !== undefined)
            setIsMarking(parsedState.isMarking);
          if (parsedState.attendanceCount !== undefined)
            setAttendanceCount(parsedState.attendanceCount);
          if (parsedState.position !== undefined)
            setPosition(parsedState.position);
        } else {
          sessionStorage.removeItem("geolocationState");
        }
      } catch (error) {
        console.error("Error restoring geolocation state:", error);
        sessionStorage.removeItem("geolocationState");
      }
    }

    // Mark as initialized after restoration attempt
    setIsInitialized(true);
  }, []);

  // Save state to sessionStorage whenever it changes (ONLY AFTER INITIALIZATION)
  useEffect(() => {
    if (!isInitialized) return; // Don't save during initial load

    const stateToSave = {
      venue,
      range,
      isMarking,
      attendanceCount,
      position,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("geolocationState", JSON.stringify(stateToSave));
  }, [venue, range, isMarking, attendanceCount, position, isInitialized]);

  // Handle page refresh - preserve state
  useEffect(() => {
    const handleBeforeUnload = () => {
      // State is already saved in sessionStorage, so it will be restored on reload
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleVenueSubmit = () => {
    const newVenue = venueInput.trim().toUpperCase();
    setVenue(newVenue);
    setVenueInput("");
    setIsEditingVenue(false);
    
    console.log("handleVenueSubmit called, new venue:", newVenue);
    console.log("socketRef.current exists:", !!socketRef.current);
    
    // Emit settings update to server
    if (socketRef.current) {
      socketRef.current.emit("adminSettings", {
        range: range,
        venue: newVenue,
        timestamp: Date.now(),
      });
      console.log("Sent adminSettings update: venue=", newVenue);
    } else {
      console.error("WebSocket not connected, cannot send venue update");
    }
  };

  const startEditingVenue = () => {
    setVenueInput(venue);
    setIsEditingVenue(true);
  };

  const cancelEditingVenue = () => {
    setVenueInput("");
    setIsEditingVenue(false);
  };

  const handleRangeSubmit = () => {
    const newRange = parseInt(rangeInput);
    if (newRange && newRange > 0 && newRange <= 1000) {
      setRange(newRange);
      setRangeInput("");
      setIsEditingRange(false);
      
      console.log("handleRangeSubmit called, new range:", newRange);
      console.log("socketRef.current exists:", !!socketRef.current);
      
      // Emit settings update to server
      if (socketRef.current) {
        socketRef.current.emit("adminSettings", {
          range: newRange,
          venue: venue,
          timestamp: Date.now(),
        });
        console.log("Sent adminSettings update: range=", newRange);
      } else {
        console.error("WebSocket not connected, cannot send range update");
      }
    }
  };

  const startEditingRange = () => {
    setRangeInput(range.toString());
    setIsEditingRange(true);
  };

  const cancelEditingRange = () => {
    setRangeInput("");
    setIsEditingRange(false);
  };

  useEffect(() => {
    if (!qrFullScreen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setQrFullScreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [qrFullScreen]);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={handleCollapsedChange}
      />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'md:ml-10' : 'md:ml-46'}`}>
        <div className="flex-1 overflow-hidden p-4 pb-8">
          {/* Mobile layout: flex-col, map under back button, then controls */}
          <div className="flex flex-col md:hidden h-screen w-full">
            <div className="flex items-center cursor-pointer rounded-lg p-2 transition-colors group" onClick={() => navigate(-1)}>
              <IoChevronBack className="h-5 w-5 text-gray-600 group-hover:text-black dark:group-hover:text-gray-100 transition-colors" />
              <span className="text-gray-600 group-hover:text-black dark:group-hover:text-gray-100 font-mulish transition-colors">Back</span>
            </div>
            <div className="w-full h-[50vh] rounded-xl shadow relative overflow-hidden mb-4">
              <MapContainer
                center={position || DEFAULT_POSITION}
                zoom={18}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <SetViewOnLocation position={position || DEFAULT_POSITION} />
                <Marker position={position || DEFAULT_POSITION} icon={redPinIcon}>
                  <Popup>{position ? "You are here" : "Default location"}</Popup>
                </Marker>
                {isMarking && (
                  <Circle
                    center={position || DEFAULT_POSITION}
                    radius={rippleBackgroundRadius}
                    pathOptions={{
                      color: "#22c55e",
                      fillColor: "#22c55e",
                      fillOpacity: rippleBackgroundOpacity,
                      weight: 0,
                    }}
                  />
                )}
                <Circle
                  center={position || DEFAULT_POSITION}
                  radius={range}
                  pathOptions={{
                    color: "#22c55e",
                    fillColor: "#22c55e",
                    fillOpacity: 0.2,
                    weight: 2,
                  }}
                />
              </MapContainer>
            </div>
            {/* Controls and content (QR, attendance, venue, range, manual mark, error) */}
            <div className="flex-1 flex flex-col gap-4 px-2 pb-8 overflow-y-auto">
              {/* QR code and fullscreen modal */}
              <div className="rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-center group relative w-full h-full min-h-[120px]"
                  onDoubleClick={() => setQrFullScreen(true)}
                  title="Double-click to show QR code full screen"
                >
                  <ResponsiveQR value="https://your-attendance-url.com" size={180} />
                  {/* Full screen button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    <button
                      className="bg-white/90 hover:bg-white rounded-full p-3 shadow transition pointer-events-auto"
                      onClick={() => setQrFullScreen(true)}
                      title="Show QR code full screen"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4m12-4v4h-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              {/* Full screen QR code modal (shared) */}
              {qrFullScreen && (
                <div
                  className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setQrFullScreen(false);
                  }}
                >
                  <div className="relative">
                    <button
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                      onClick={() => setQrFullScreen(false)}
                      title="Close"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center justify-center">
                      <GreenRoundedQRCode value="https://your-attendance-url.com" size={500} />
                    </div>
                  </div>
                </div>
              )}
              {/* Attendance count */}
              <div className="border bg-white rounded-xl flex items-center justify-center mx-4 px-4 py-3 shadow-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 font-mulish">{attendanceCount}</div>
                  <div className="text-sm text-gray-600 font-mulish">Students Marked</div>
                </div>
              </div>
              {/* Venue editing */}
              <div className="border bg-white rounded-xl flex justify-between items-center mx-4 px-4 py-3 shadow-sm">
                <div className="text-gray-700 flex items-center">
                  <span className="text-sm text-gray-500 font-mulish">Venue:</span>
                  {isEditingVenue ? (
                    <div className="flex items-center gap-1 ml-2 flex-nowrap">
                      <input
                        type="text"
                        value={venueInput}
                        onChange={(e) => setVenueInput(e.target.value)}
                        placeholder="Venue"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 flex-shrink-0 uppercase font-mulish"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleVenueSubmit();
                          if (e.key === "Escape") cancelEditingVenue();
                        }}
                      />
                      <button onClick={handleVenueSubmit} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish">✓</button>
                      <button onClick={cancelEditingVenue} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish">✕</button>
                    </div>
                  ) : (
                    <span className="ml-2 font-semibold cursor-pointer hover:text-green-600 min-w-[2rem] inline-block font-mulish" onClick={startEditingVenue}>{venue || "Not set"}</span>
                  )}
                </div>
                {!isEditingVenue && (
                  <button onClick={startEditingVenue} className="bg-green-500 w-[30%] hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-mulish">{venue === "" ? "Set" : "Edit"}</button>
                )}
              </div>
              {/* Range editing */}
              <div className="border bg-white rounded-xl flex justify-between items-center mx-4 px-4 py-3 shadow-sm">
                <div className="text-gray-700 flex items-center">
                  <span className="text-sm text-gray-500 font-mulish">Range:</span>
                  {isEditingRange ? (
                    <div className="flex items-center gap-1 ml-2 flex-nowrap">
                      <input
                        type="number"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="Range"
                        min="1"
                        max="1000"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 flex-shrink-0 font-mulish"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRangeSubmit();
                          if (e.key === "Escape") cancelEditingRange();
                        }}
                      />
                      <span className="text-sm text-gray-500 flex-shrink-0 font-mulish">m</span>
                      <button onClick={handleRangeSubmit} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish">✓</button>
                      <button onClick={cancelEditingRange} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish">✕</button>
                    </div>
                  ) : (
                    <span className="ml-2 font-semibold cursor-pointer hover:text-green-600 min-w-[2rem] inline-block font-mulish" onClick={startEditingRange}>{range}m</span>
                  )}
                </div>
                {!isEditingRange && (
                  <button onClick={startEditingRange} className="bg-green-500 w-[30%] hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-mulish">Edit</button>
                )}
              </div>
              {/* Manual mark button */}
              <div className="flex items-end justify-center">
                <button
                  className="w-full max-w-xs bg-gradient-to-r from-green-500 to-green-600 hover:bg-green-600 hover:to-green-700 text-white font-bold text-lg py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 font-mulish"
                  type="button"
                  onClick={() => navigate("/manual-attendance", { state: { fromGeolocation: true, venue, range, isMarking, attendanceCount, position } })}
                >
                  MARK MANUALLY
                </button>
              </div>
              {/* Error message */}
              {error && (
                <div className="z-[999] bg-red-50 border border-red-200 rounded-lg shadow-lg flex items-center gap-2 px-4 py-2 max-w-sm mx-auto mt-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div className="text-red-700 text-sm font-medium">{error}</div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Desktop layout: original grid, unchanged */}
          <div className="hidden md:grid grid-cols-2 grid-rows-3 gap-4 h-screen w-full grid-cols-[20%_1fr] grid-rows-[5%_1fr_15%] pb-8">
            <div
              className="col-start-1 row-start-1 flex items-center cursor-pointer rounded-lg p-2 transition-colors group"
              onClick={() => navigate(-1)}
            >
              <IoChevronBack className="h-5 w-5 text-gray-600 group-hover:text-black dark:group-hover:text-gray-100 transition-colors" />
              <span className="text-gray-600 group-hover:text-black dark:group-hover:text-gray-100 font-mulish transition-colors">Back</span>
            </div>
            
            <div className="col-start-1 row-start-2 rounded-xl grid grid-cols-1 grid-rows-4 grid-rows-[50%_1fr_1fr_1fr] gap-4">
              <div className=" col-start-1 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-2xl w-full h-full flex items-center justify-center group relative"
                      onDoubleClick={() => setQrFullScreen(true)}
                      title="Double-click to show QR code full screen"
                    >
                      {/* Replace GreenRoundedQRCode with ResponsiveQR for main QR code */}
                      <ResponsiveQR value="https://your-attendance-url.com" size={180} />
                    {/* Full screen button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition  pointer-events-none">
                      <button
                        className="bg-white/90 hover:bg-white rounded-full p-3 shadow transition pointer-events-auto"
                        onClick={() => setQrFullScreen(true)}
                        title="Show QR code full screen"
                      >
                        <svg
                          className="w-4 h-4 text-gray-700"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 8V4h4M20 8V4h-4M4 16v4h4m12-4v4h-4"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Full screen QR code modal */}
              {qrFullScreen && (
                <div
                  className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
                  onClick={(e) => {
                    // Only close if the backdrop itself is clicked
                    if (e.target === e.currentTarget) setQrFullScreen(false);
                  }}
                >
                  <div className="relative">
                    <button
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                      onClick={() => setQrFullScreen(false)}
                      title="Close"
                    >
                      <svg
                        className="w-4 h-4 text-gray-700"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center justify-center">
                      <GreenRoundedQRCode
                        value="https://your-attendance-url.com"
                        size={500}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="border col-start-1 row-start-2 bg-white rounded-xl flex items-center justify-center mx-4 px-4 py-3 shadow-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 font-mulish">
                    {attendanceCount}
                  </div>
                  <div className="text-sm text-gray-600 font-mulish">
                    Students Marked
                  </div>
                </div>
              </div>
              <div className="border row-start-3 bg-white rounded-xl flex justify-between items-center mx-4 px-4 py-3 shadow-sm">
                <div className="text-gray-700 flex items-center">
                  <span className="text-sm text-gray-500 font-mulish">Venue:</span>
                  {isEditingVenue ? (
                    <div className="flex items-center gap-1 ml-2 flex-nowrap">
                      <input
                        type="text"
                        value={venueInput}
                        onChange={(e) => setVenueInput(e.target.value)}
                        placeholder="Venue"
                        /* maxLength={5} */
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 flex-shrink-0 uppercase font-mulish"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleVenueSubmit();
                          if (e.key === "Escape") cancelEditingVenue();
                        }}
                      />
                      <button
                        onClick={handleVenueSubmit}
                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditingVenue}
                        className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span
                      className="ml-2 font-semibold cursor-pointer hover:text-green-600 min-w-[2rem] inline-block font-mulish"
                      onClick={startEditingVenue}
                    >
                      {venue || "Not set"}
                    </span>
                  )}
                </div>
                {!isEditingVenue && (
                  <button
                    onClick={startEditingVenue}
                    className="bg-green-500 w-[30%] hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-mulish"
                  >
                    {venue === "" ? "Set" : "Edit"}
                  </button>
                )}
              </div>
              <div className="border row-start-4 bg-white rounded-xl flex justify-between items-center mx-4 px-4 py-3 shadow-sm">
                <div className="text-gray-700 flex items-center">
                  <span className="text-sm text-gray-500 font-mulish">Range:</span>
                  {isEditingRange ? (
                    <div className="flex items-center gap-1 ml-2 flex-nowrap">
                      <input
                        type="number"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="Range"
                        min="1"
                        max="1000"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 flex-shrink-0 font-mulish"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRangeSubmit();
                          if (e.key === "Escape") cancelEditingRange();
                        }}
                      />
                      <span className="text-sm text-gray-500 flex-shrink-0 font-mulish">
                        m
                      </span>
                      <button
                        onClick={handleRangeSubmit}
                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditingRange}
                        className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded flex-shrink-0 font-mulish"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span
                      className="ml-2 font-semibold cursor-pointer hover:text-green-600 min-w-[2rem] inline-block font-mulish"
                      onClick={startEditingRange}
                    >
                      {range}m
                    </span>
                  )}
                </div>
                {!isEditingRange && (
                  <button
                    onClick={startEditingRange}
                    className="bg-green-500 w-[30%] hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-mulish"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="col-start-1 row-start-3 flex items-end justify-center  ">
              <button
                className="w-full max-w-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 font-mulish"
                type="button"
                onClick={() => navigate("/manual-attendance", { state: { fromGeolocation: true, venue, range, isMarking, attendanceCount, position } })}
              >
                MARK MANUALLY
              </button>
            </div>
            {/* <h1 className="text-2xl font-bold mb-4">Geolocation Attendance Page</h1> */}
            {/* {error && <div className="text-red-500 mb-2">{error}</div>} */}
            <div
              className="col-span-2 row-span-1 h-[60vh] md:col-start-2 md:row-span-3 md:col-span-1 md:h-full w-full rounded-xl shadow relative overflow-hidden"
            >
            <MapContainer
              center={position || DEFAULT_POSITION}
              zoom={18}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <SetViewOnLocation position={position || DEFAULT_POSITION} />
              <Marker position={position || DEFAULT_POSITION} icon={redPinIcon}>
                <Popup>{position ? "You are here" : "Default location"}</Popup>
              </Marker>

              {/* Rippling background circle */}
              {isMarking && (
                <Circle
                  center={position || DEFAULT_POSITION}
                  radius={rippleBackgroundRadius}
                  pathOptions={{
                    color: "#22c55e",
                    fillColor: "#22c55e",
                    fillOpacity: rippleBackgroundOpacity,
                    weight: 0,
                  }}
                />
              )}

              {/* Static green circle (main circle) */}
              <Circle
                center={position || DEFAULT_POSITION}
                radius={range}
                pathOptions={{
                  color: "#22c55e",
                  fillColor: "#22c55e",
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            </MapContainer>
            <div className="z-[999] bg-white/95 backdrop-blur-sm absolute bottom-4 left-1/2 -translate-x-1/2 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-6 px-6 py-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 font-medium">LEVEL 300</div>
                <div className="text-lg font-bold text-gray-800">
                  COMPUTER SCIENCE
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <button
                className={`font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform active:scale-95 relative ${
                  !venue || venue.trim() === ""
                    ? "bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed"
                    : isMarking
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white cursor-pointer animate-pulse"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-105 cursor-pointer"
                }`}
                disabled={!venue || venue.trim() === ""}
                onClick={() => {
                  if (venue && venue.trim() !== "") {
                    if (isMarking) {
                      stopMarking();
                    } else {
                      startMarking();
                    }
                  }
                }}
                title={!venue || venue.trim() === "" ? "Set venue first" : ""}
              >
                {isMarking ? "STOP MARKING" : "START MARKING"}
              </button>
            </div>

            {error && (
              <div className="z-[999] bg-red-50 border border-red-200 absolute top-4 left-1/2 -translate-x-1/2 rounded-lg shadow-lg flex items-center gap-2 px-4 py-2 max-w-sm">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div className="text-red-700 text-sm font-medium">{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Geolocation;
