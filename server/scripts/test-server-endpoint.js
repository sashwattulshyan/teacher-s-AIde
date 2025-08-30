const fetch = require('node-fetch');

async function testServerEndpoint() {
  console.log('🧪 Testing Server Endpoint Accessibility...\n');

  try {
    // Test if server is running
    console.log('1. Testing server connectivity...');
    const response = await fetch('http://localhost:3001/api/users/delete-account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    if (response.status === 401) {
      console.log('✅ Server is running - 401 Unauthorized (expected without auth token)');
    } else if (response.status === 404) {
      console.log('❌ Server is running but endpoint not found');
    } else {
      console.log('✅ Server is running - Status:', response.status);
    }

    const responseText = await response.text();
    console.log('Response body:', responseText);

  } catch (error) {
    console.error('❌ Server connection failed:', error.message);
    console.log('Make sure the server is running on port 3001');
  }
}

testServerEndpoint();
