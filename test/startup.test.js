'use strict';

// Starts the REAL server entry (node server.js) as a child process, the way Render does, and talks to it.
// This catches wiring mistakes in the `require.main === module` block that createApp-level tests cannot see.

const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const SERVER = path.join(__dirname, '..', 'server.js');

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Minimal clean environment: nothing from the developer's shell or .env leaks into the child.
function childEnv(extra) {
  const env = { PATH: process.env.PATH || '', ...extra };
  if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  return env;
}

async function startServer(extraEnv) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-start-'));
  const port = await freePort();
  const child = spawn(process.execPath, [SERVER], {
    cwd,
    env: childEnv({ PORT: String(port), ...extraEnv }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      clearInterval(poll);
      child.kill();
      reject(new Error(`server did not start within 10s. Output:\n${output}`));
    }, 10000);
    const poll = setInterval(() => {
      if (output.includes('gateway running on port')) {
        clearTimeout(timer);
        clearInterval(poll);
        resolve();
      }
    }, 50);
    child.once('exit', (code) => {
      clearTimeout(timer);
      clearInterval(poll);
      reject(new Error(`server exited early with code ${code}. Output:\n${output}`));
    });
  });

  const stop = () => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', () => resolve());
    child.kill();
    return undefined;
  });
  return { port, stop };
}

test('S1 entry with KEY_ENCRYPTION_SECRET and ALLOW_UNAUTHENTICATED starts; /health 200; /providers is empty without env keys', async (t) => {
  const { port, stop } = await startServer({
    ALLOW_UNAUTHENTICATED: 'true',
    KEY_ENCRYPTION_SECRET: crypto.randomBytes(32).toString('base64'),
  });
  t.after(stop);
  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  const providers = await fetch(`http://127.0.0.1:${port}/providers`);
  assert.equal(providers.status, 200);
  assert.deepEqual(await providers.json(), { providers: [] });
});

test('S2 entry builds the env providers through the real factories (fake key, no network call)', async (t) => {
  const { port, stop } = await startServer({
    ALLOW_UNAUTHENTICATED: 'true',
    KEY_ENCRYPTION_SECRET: crypto.randomBytes(32).toString('base64'),
    OPENAI_API_KEY: 'sk-fake-startup-test-0000000000',
  });
  t.after(stop);
  const providers = await fetch(`http://127.0.0.1:${port}/providers`);
  assert.equal(providers.status, 200);
  assert.deepEqual(await providers.json(), { providers: ['openai'] });
});
