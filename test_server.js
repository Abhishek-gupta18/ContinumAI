const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', JSON.stringify(res.headers));
    console.log('RESPONSE:', data);
  });
});

req.on('error', (e) => {
  console.log('ERROR:', e.message);
});

const body = JSON.stringify({ session_id: 'geminitest1', message: 'What is the capital of France?' });
req.write(body);
req.end();