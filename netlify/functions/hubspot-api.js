const axios = require('axios');

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  
  if (!HUBSPOT_API_KEY || HUBSPOT_API_KEY === 'YOUR_HUBSPOT_API_KEY') {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'HubSpot API key not configured' })
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/hubspot-api', '');
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : null;

    // Proxy request to HubSpot API
    const config = {
      method,
      url: `${HUBSPOT_BASE_URL}${path}`,
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      config.data = body;
    }

    const response = await axios(config);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };

  } catch (error) {
    console.error('HubSpot API Error:', error.response?.data || error.message);
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data || error.message
      })
    };
  }
};
