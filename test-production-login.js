#!/usr/bin/env node

const https = require('https');

// Test login en producción
const data = JSON.stringify({
  action: "login",
  email: "david.dorantes@coacharte.mx",
  password: "David2025New!"
});

const options = {
  hostname: 'zljualvricugqvcvaeht.supabase.co',
  port: 443,
  path: '/functions/v1/unified-auth',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    // Usando una clave temporal - necesita ser reemplazada con la correcta
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MzY4ODQsImV4cCI6MjA0OTAxMjg4NH0.CQPU7v_l-LVr7JqpD8AZJBXCg-HgS-D_xKVQJJX1aVY'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
