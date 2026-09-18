const net = require('net');

const client = net.connect({ port: 3000, host: 'localhost' }, () => {
  console.log('connected to server');
  client.end();
});

client.on('error', (err) => {
  console.log('error connecting:', err.code);
  process.exit(1);
});

client.on('data', (data) => {
  console.log('data:', data);
});