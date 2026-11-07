const crypto = require('crypto');

function createKeyVault(masterKeyBase64) {
  if (typeof masterKeyBase64 !== 'string') {
    throw new TypeError('masterKeyBase64 must be a base64 string');
  }
  let key;
  try {
    key = Buffer.from(masterKeyBase64, 'base64');
  } catch (err) {
    throw new TypeError('masterKeyBase64 must be a valid base64 string');
  }
  if (key.length !== 32) {
    throw new TypeError('masterKeyBase64 must decode to exactly 32 bytes');
  }

  function encrypt(plaintext, aad) {
    if (typeof plaintext !== 'string' || plaintext.length === 0 || plaintext.length > 4096) {
      throw new TypeError('plaintext must be a non-empty string of at most 4096 characters');
    }
    if (typeof aad !== 'string' || aad.length === 0) {
      throw new TypeError('aad must be a non-empty string');
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  function decrypt(token, aad) {
    if (typeof aad !== 'string' || aad.length === 0) {
      throw new Error('invalid_ciphertext');
    }
    if (typeof token !== 'string') {
      throw new Error('invalid_ciphertext');
    }
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('invalid_ciphertext');
    }
    let iv;
    let tag;
    let ciphertext;
    try {
      iv = Buffer.from(parts[1], 'base64url');
      tag = Buffer.from(parts[2], 'base64url');
      ciphertext = Buffer.from(parts[3], 'base64url');
    } catch (err) {
      throw new Error('invalid_ciphertext');
    }
    if (iv.length !== 12 || tag.length !== 16) {
      throw new Error('invalid_ciphertext');
    }
    let decipher;
    try {
      decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (err) {
      throw new Error('decrypt_failed');
    }
  }

  return { encrypt, decrypt };
}

module.exports = { createKeyVault };
