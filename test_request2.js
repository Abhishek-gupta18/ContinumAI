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

console.log('Making request to localhost:3000/chat');

const req = http.request(options, (res) => {
  let response = '';
  console.log('Status Code:', res.statusCode);
  res.on('data', (chunk) => { response += chunk; });
  res.on('end', () => {
    console.log('Response:', response);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log('ERROR:', e.message);
  process.exit(1);
});

req.write(data);
req.end();