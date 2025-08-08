// Configuration file for the attendance system
// Updated for Render deployment

const config = {
  // Server configuration - Replace with your actual Render URL
  SERVER_IP: 'https://attendance-system-backend-snjx.onrender.com', // Replace with your actual Render backend URL
  SERVER_PORT: 443, // HTTPS port for Render
  
  // WebSocket configuration - uses secure WebSocket
  getWebSocketUrl: () => `wss://${config.SERVER_IP}`,
  
  // API configuration - uses HTTPS
  getApiUrl: () => `https://${config.SERVER_IP}/api`,
};

export default config; 