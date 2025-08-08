// Test script to check the API endpoint
const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🧪 Testing API endpoint...');

        const response = await fetch('http://localhost:9002/api/requests?page=1&pageSize=10', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        console.log('📊 Response status:', response.status);
        console.log('📋 Response data:', JSON.stringify(data, null, 2));

        if (data.data && data.data.length > 0) {
            console.log('✅ API is returning data correctly');
            console.log('📝 Sample request:', data.data[0]);
        } else {
            console.log('⚠️ API returned no data');
        }

    } catch (error) {
        console.error('❌ API test failed:', error.message);
    }
}

testAPI();
