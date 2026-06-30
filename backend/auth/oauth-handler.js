const crypto = require('crypto');

class OAuthHandler {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.googleOAuthUrl = 'https://oauth2.googleapis.com';
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state) {
    const scope = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/generative-language'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scope,
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${this.googleOAuthUrl}/auth?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    try {
      const response = await fetch(`${this.googleOAuthUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri
        }).toString()
      });

      if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error('OAuth token exchange error:', err);
      throw err;
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(`${this.googleOAuthUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }).toString()
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      return await response.json();
    } catch (err) {
      console.error('Token refresh error:', err);
      throw err;
    }
  }

  // Get user profile from Google
  async getUserProfile(accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      return await response.json();
    } catch (err) {
      console.error('User profile fetch error:', err);
      throw err;
    }
  }
}

module.exports = OAuthHandler;
