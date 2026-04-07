const express = require('express');
const fetch = require('node-fetch');
const config = require('../config');
const tokenManager = require('../services/token-manager');

const router = express.Router();

router.get('/login', (req, res) => {
  const authUrl = `${config.HH_OAUTH_AUTHORIZE}?response_type=code&client_id=${config.HH_CLIENT_ID}&redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}`;
  res.redirect(authUrl);
});

router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    const response = await fetch(config.HH_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'HH-User-Agent': config.USER_AGENT
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.HH_CLIENT_ID,
        client_secret: config.HH_CLIENT_SECRET,
        code: code,
        redirect_uri: config.REDIRECT_URI
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Token exchange error:', data);
      return res.redirect(`/?error=${encodeURIComponent(data.error_description || 'token_error')}`);
    }

    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: tokenManager.setExpiresAt(data.expires_in),
      token_type: data.token_type
    };

    tokenManager.save(tokens);

    res.redirect('/?auth=success');
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }
});

router.get('/status', (req, res) => {
  const tokens = tokenManager.load();
  const isAuthenticated = tokens && tokens.access_token && tokenManager.isValid();
  
  res.json({
    authenticated: isAuthenticated,
    expires_at: tokens?.expires_at || null
  });
});

router.post('/refresh', async (req, res) => {
  const tokens = tokenManager.load();

  if (!tokens || !tokens.refresh_token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const response = await fetch(config.HH_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'HH-User-Agent': config.USER_AGENT
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.HH_CLIENT_ID,
        client_secret: config.HH_CLIENT_SECRET,
        refresh_token: tokens.refresh_token
      })
    });

    const data = await response.json();

    if (!response.ok) {
      tokenManager.clear();
      return res.status(401).json({ error: data.error_description || 'refresh_failed' });
    }

    const newTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: tokenManager.setExpiresAt(data.expires_in),
      token_type: data.token_type
    };

    tokenManager.save(newTokens);

    res.json({ success: true, expires_at: newTokens.expires_at });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/logout', (req, res) => {
  tokenManager.clear();
  res.redirect('/?logout=success');
});

module.exports = router;