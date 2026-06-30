const crypto = require('crypto');

class TokenManager {
  constructor(encryptionKey) {
    // Use first 32 chars of key for AES-256
    this.encryptionKey = Buffer.from(encryptionKey.substring(0, 32).padEnd(32, '0'), 'utf8');
  }

  // Encrypt token for storage
  encryptToken(token) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted token
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Decrypt token from storage
  decryptToken(encryptedToken) {
    try {
      const [ivHex, encrypted] = encryptedToken.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err) {
      console.error('Token decryption error:', err);
      throw new Error('Failed to decrypt token');
    }
  }

  // Check if token is expired
  isTokenExpired(expiresAt) {
    return Date.now() > expiresAt * 1000;
  }

  // Calculate token expiration time
  getTokenExpiration(expiresIn) {
    return Math.floor(Date.now() / 1000) + expiresIn;
  }
}

module.exports = TokenManager;
