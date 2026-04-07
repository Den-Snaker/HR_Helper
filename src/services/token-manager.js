const fs = require('fs');
const path = require('path');
const config = require('../config');

class TokenManager {
  constructor() {
    this.tokensFile = path.join(__dirname, '..', '..', config.TOKENS_FILE);
  }

  load() {
    try {
      if (fs.existsSync(this.tokensFile)) {
        const data = fs.readFileSync(this.tokensFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading tokens:', error.message);
    }
    return null;
  }

  save(tokens) {
    try {
      const data = {
        ...tokens,
        saved_at: new Date().toISOString()
      };
      fs.writeFileSync(this.tokensFile, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving tokens:', error.message);
      return false;
    }
  }

  isValid() {
    const tokens = this.load();
    if (!tokens || !tokens.access_token) return false;
    if (!tokens.expires_at) return true;
    return new Date(tokens.expires_at) > new Date();
  }

  needsRefresh() {
    const tokens = this.load();
    if (!tokens || !tokens.refresh_token) return false;
    if (!tokens.expires_at) return true;
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    return (expiresAt - now) < fiveMinutes;
  }

  setExpiresAt(expiresIn) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
    return expiresAt.toISOString();
  }

  clear() {
    try {
      if (fs.existsSync(this.tokensFile)) {
        fs.unlinkSync(this.tokensFile);
      }
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error.message);
      return false;
    }
  }

  getUserId() {
    const tokens = this.load();
    if (!tokens || !tokens.access_token) return null;
    
    try {
      const parts = tokens.access_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.user_id || payload.sub || 'default';
      }
    } catch (e) {
      console.error('Error extracting user ID:', e);
    }
    
    return 'default';
  }
}

module.exports = new TokenManager();