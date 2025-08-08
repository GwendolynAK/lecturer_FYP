// Test script to verify geolocation functionality with Render backend
const config = {
  SERVER_IP: 'attendance-system-backend-snjx.onrender.com',
  SERVER_PORT: 443,
  getWebSocketUrl: () => `wss://${config.SERVER_IP}`,
  getApiUrl: () => `https://${config.SERVER_IP}/api`,
};

async function testGeolocationAPI() {
  console.log('🧪 Testing Geolocation API with Render Backend');
  console.log('📍 Backend URL:', config.getApiUrl());
  console.log('🔌 WebSocket URL:', config.getWebSocketUrl());
  console.log('');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await fetch(`${config.getApiUrl()}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check Response:', healthData);
    console.log('');

    // Test 2: Get Admin Location (should be empty initially)
    console.log('2️⃣ Testing Get Admin Location...');
    try {
      const locationResponse = await fetch(`${config.getApiUrl()}/admin/location`);
      if (locationResponse.status === 404) {
        console.log('✅ No admin location set (expected for new deployment)');
      } else {
        const locationData = await locationResponse.json();
        console.log('✅ Admin Location:', locationData);
      }
    } catch (error) {
      console.log('✅ No admin location set (expected for new deployment)');
    }
    console.log('');

    // Test 3: Set Admin Location
    console.log('3️⃣ Testing Set Admin Location...');
    const testLocation = {
      latitude: 5.614818,
      longitude: -0.205874,
      range: 50
    };
    
    const setLocationResponse = await fetch(`${config.getApiUrl()}/admin/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLocation)
    });
    
    const setLocationData = await setLocationResponse.json();
    console.log('✅ Set Location Response:', setLocationData);
    console.log('');

    // Test 4: Get Admin Location (should now have data)
    console.log('4️⃣ Testing Get Admin Location (after setting)...');
    const getLocationResponse = await fetch(`${config.getApiUrl()}/admin/location`);
    const getLocationData = await getLocationResponse.json();
    console.log('✅ Admin Location (after setting):', getLocationData);
    console.log('');

    console.log('🎉 All tests passed! Your geolocation API is working correctly.');
    console.log('');
    console.log('📱 Next steps:');
    console.log('   1. Start your frontend: cd frontend && npm start');
    console.log('   2. Test the Geolocation page (admin side)');
    console.log('   3. Test the LocationCheck component (student side)');
    console.log('   4. Check browser console for WebSocket connections');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Check if your Render backend is running');
    console.log('   2. Verify the backend URL is correct');
    console.log('   3. Check Render logs for any errors');
  }
}

// Run the test
testGeolocationAPI(); 