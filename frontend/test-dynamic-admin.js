// Test script to verify dynamic admin system
const { io } = require('socket.io-client');

const config = {
  SERVER_IP: 'attendance-system-backend-snjx.onrender.com',
  SERVER_PORT: 443,
  getWebSocketUrl: () => `wss://${config.SERVER_IP}`,
  getApiUrl: () => `https://${config.SERVER_IP}/api`,
};

async function testDynamicAdmin() {
  console.log('🧪 Testing Dynamic Admin System');
  console.log('📍 Backend URL:', config.getWebSocketUrl());
  console.log('');

  // Test 1: First connection should become admin
  console.log('1️⃣ Testing first connection (should become admin)...');
  const socket1 = io(config.getWebSocketUrl(), {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true
  });

  socket1.on('connect', () => {
    console.log('✅ Socket 1 connected:', socket1.id);
  });

  socket1.on('roleAssigned', (data) => {
    console.log('✅ Socket 1 role assigned:', data);
    if (data.role === 'admin') {
      console.log('✅ First user correctly assigned as admin');
    } else {
      console.log('❌ First user should be admin but got:', data.role);
    }
  });

  // Test 2: Second connection should become student
  setTimeout(() => {
    console.log('');
    console.log('2️⃣ Testing second connection (should become student)...');
    const socket2 = io(config.getWebSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socket2.on('connect', () => {
      console.log('✅ Socket 2 connected:', socket2.id);
    });

    socket2.on('roleAssigned', (data) => {
      console.log('✅ Socket 2 role assigned:', data);
      if (data.role === 'student') {
        console.log('✅ Second user correctly assigned as student');
      } else {
        console.log('❌ Second user should be student but got:', data.role);
      }
    });

    // Test 3: Admin disconnection should promote student to admin
    setTimeout(() => {
      console.log('');
      console.log('3️⃣ Testing admin disconnection (student should become admin)...');
      
      socket2.on('adminChanged', (data) => {
        console.log('✅ Admin changed event received:', data);
        if (data.newAdminId === socket2.id) {
          console.log('✅ Student correctly promoted to admin');
        } else {
          console.log('❌ Student should be promoted to admin');
        }
      });

      console.log('🔄 Disconnecting admin (socket 1)...');
      socket1.disconnect();
    }, 2000);

    // Cleanup
    setTimeout(() => {
      console.log('');
      console.log('🧹 Cleaning up connections...');
      socket2.disconnect();
      console.log('✅ Test completed');
      process.exit(0);
    }, 4000);

  }, 2000);
}

// Run the test
testDynamicAdmin(); 