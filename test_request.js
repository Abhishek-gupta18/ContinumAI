const http = require('http');

const data = JSON.stringify({
  session_id: 'geminitest1',
  message: 'What is the capital of France?'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let response = '';
  res.on('data', (chunk) => { response += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', JSON.stringify(res.headers));
    console.log('RESPONSE:', response);
  });
});

req.on('error', (e) => {
  console.log('ERROR:', e.message);
});

req.write(data);
req.end();