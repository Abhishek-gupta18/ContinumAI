const net = require('net');
const dns = require('dns');

const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

const V4_RANGES = [
  { base: '0.0.0.0', bits: 8 },
  { base: '10.0.0.0', bits: 8 },
  { base: '100.64.0.0', bits: 10 },
  { base: '127.0.0.0', bits: 8 },
  { base: '169.254.0.0', bits: 16 },
  { base: '172.16.0.0', bits: 12 },
  { base: '192.0.0.0', bits: 24 },
  { base: '192.0.2.0', bits: 24 },
  { base: '192.168.0.0', bits: 16 },
  { base: '198.18.0.0', bits: 15 },
  { base: '198.51.100.0', bits: 24 },
  { base: '203.0.113.0', bits: 24 },
  { base: '224.0.0.0', bits: 3 },
];

function reject(reason) {
  const err = new Error('unsafe_base_url');
  err.reason = reason;
  return err;
}

function ipv4ToInt(addr) {
  const parts = addr.split('.');
  if (parts.length !== 4) {
    return null;
  }
  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      return null;
    }
    value = (value * 256) + n;
  }
  return value >>> 0;
}

function inV4Range(value, baseAddr, bits) {
  const base = ipv4ToInt(baseAddr);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (base & mask);
}

function ipv6ToBigInt(addr) {
  const zone = addr.indexOf('%');
  const a = (zone === -1 ? addr : addr.slice(0, zone)).toLowerCase();

  let v4 = null;
  let hexPart = a;
  const dottedMatch = a.match(/[0-9.]+$/);
  if (dottedMatch && dottedMatch[0].includes('.')) {
    v4 = ipv4ToInt(dottedMatch[0]);
    if (v4 === null) {
      return null;
    }
    hexPart = a.slice(0, a.length - dottedMatch[0].length);
  }

  const doubleIdx = hexPart.indexOf('::');
  if (doubleIdx !== -1 && hexPart.indexOf('::', doubleIdx + 1) !== -1) {
    return null;
  }

  const headStr = doubleIdx === -1 ? hexPart : hexPart.slice(0, doubleIdx);
  let tailStr = doubleIdx === -1 ? '' : hexPart.slice(doubleIdx + 2);
  if (tailStr.endsWith(':')) {
    tailStr = tailStr.slice(0, -1);
  }
  const head = headStr === '' ? [] : headStr.split(':');
  const tail = tailStr === '' ? [] : tailStr.split(':');
  for (const g of head.concat(tail)) {
    if (g === '' || !/^[0-9a-f]{1,4}$/.test(g)) {
      return null;
    }
  }

  const v4Groups = v4 === null
    ? []
    : [((v4 >>> 16) & 0xffff).toString(16), (v4 & 0xffff).toString(16)];
  const known = head.length + tail.length + v4Groups.length;

  let groups;
  if (doubleIdx !== -1) {
    const missing = 8 - known;
    if (missing < 1) {
      return null;
    }
    groups = head.concat(
      new Array(missing).fill('0'),
      tail,
      v4Groups
    );
  } else {
    if (known !== 8) {
      return null;
    }
    groups = head.concat(tail, v4Groups);
  }
  if (groups.length !== 8) {
    return null;
  }

  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value = (value << 16n) + BigInt(parseInt(groups[i], 16));
  }
  return value;
}

function inV6Range(value, prefixHex, bits) {
  let prefix = BigInt('0x' + prefixHex);
  prefix = prefix << BigInt(128 - prefixHex.length * 4);
  const mask = ((1n << BigInt(bits)) - 1n) << (128n - BigInt(bits));
  return (value & mask) === (prefix & mask);
}

function isPublicV4(value) {
  for (const { base, bits } of V4_RANGES) {
    if (inV4Range(value, base, bits)) {
      return false;
    }
  }
  return true;
}

function isPublicV6(value) {
  if (value === 0n || value === 1n) {
    return false; // :: and ::1
  }
  if (inV6Range(value, 'fc00', 7)) {
    return false;
  }
  if (inV6Range(value, 'fe80', 10)) {
    return false;
  }
  if (inV6Range(value, 'ff00', 8)) {
    return false;
  }
  if (inV6Range(value, '20010db8', 32)) {
    return false;
  }
  // IPv4-mapped (::ffff:0:0/96): top 96 bits zero, next 16 bits = ffff
  if ((value >> 96n) === 0n && ((value >> 32n) & 0xffffn) === 0xffffn) {
    return isPublicV4(Number(value & 0xffffffffn));
  }
  return true;
}

function hostHasForbiddenName(hostname) {
  if (hostname === 'localhost') {
    return 'local_hostname';
  }
  for (const suffix of LOCAL_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return 'local_hostname';
    }
  }
  if (!hostname.includes('.')) {
    return 'bare_hostname';
  }
  return null;
}

async function assertSafeBaseUrl(input, { lookup = dns.promises.lookup } = {}) {
  let url;
  try {
    url = new URL(input);
  } catch (err) {
    throw reject('unparsable_url');
  }

  if (url.protocol !== 'https:') {
    throw reject('non_https');
  }
  if (url.username !== '' || url.password !== '') {
    throw reject('credentials_in_url');
  }
  if (url.port !== '' && url.port !== '443') {
    throw reject('bad_port');
  }

  const rawHost = url.hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (net.isIP(rawHost) !== 0) {
    throw reject('ip_literal_hostname');
  }
  const forbiddenName = hostHasForbiddenName(rawHost.toLowerCase());
  if (forbiddenName) {
    throw reject(forbiddenName);
  }

  let addresses;
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch (err) {
    throw reject('lookup_failed');
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw reject('lookup_failed');
  }

  for (const address of addresses) {
    let ok;
    if (address.family === 4) {
      const value = ipv4ToInt(address.address);
      ok = value !== null && isPublicV4(value);
    } else {
      const value = ipv6ToBigInt(address.address);
      ok = value !== null && isPublicV6(value);
    }
    if (!ok) {
      throw reject('private_address');
    }
  }

  let path = url.pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path === '/' ? url.origin : url.origin + path;
}

module.exports = { assertSafeBaseUrl };
