const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SESSION_ID = 'memtest1';

// First, make sure data directory exists and clean up old session data
const sessionsDir = path.join(__dirname, 'data', 'sessions');
if (fs.existsSync(sessionsDir)) {
  const files = fs.readdirSync(sessionsDir);
  for (const f of files) {
    fs.unlinkSync(path.join(sessionsDir, f));
  }
} else {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// Start the server in background
console.log('Starting server...');
const serverProc = require('child_process').fork('server.js', [], {
  detached: true,
  stdio: 'ignore'
});
serverProc.unref();
startSleeper(2000);

// First request
console.log('\n--- FIRST REQUEST ---');
const firstOpts = {
  method: 'POST',
  hostname: 'localhost',
  port: 3000,
  path: '/chat',
  headers: {
    'Content-Type': 'application/json'
  }
};

const firstReq = http.request(firstOpts, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
    
    // Second request
    console.log('\n--- SECOND REQUEST ---');
    const secondOpts = {
      method: 'POST',
      hostname: 'localhost',
      port: 3000,
      path: '/chat',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const secondReq = http.request(secondOpts, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('Response:', data2);
        
        // Read session file
        console.log('\n--- SESSION FILE ---');
        const sessionFile = path.join(sessionsDir, 'memtest1.json');
        if (fs.existsSync(sessionFile)) {
          const content = fs.readFileSync(sessionFile, 'utf8');
          console.log(content);
        } else {
          console.log('Session file not found:', sessionFile);
        }
        
        console.log('\n=== Done ===');
        serverProc.kill();
        process.exit(0);
      });
    });
    
    secondReq.on('error', (e) => {
      console.error('Second request error:', e.message);
      serverProc.kill();
      process.exit(1);
    });
    
    secondReq.write(JSON.stringify({ session_id: SESSION_ID, message: 'What is my name?' }));
    secondReq.end();
  });
});

firstReq.on('error', (e) => {
  console.error('First request error:', e.message, e.code);
  serverProc.kill();
  process.exit(1);
});

firstReq.write(JSON.stringify({ session_id: SESSION_ID, message: 'My name is Abhishek.' }));
firstReq.end();

function startSleeper(ms) {
  return new Promise(r => setTimeout(r, ms));
}