module.exports = {
  HH_CLIENT_ID: process.env.HH_CLIENT_ID || 'HM6IQ1ID72NVQLBSA421O3L75FAKQN',
  HH_CLIENT_SECRET: process.env.HH_CLIENT_SECRET || 'GG4MR4A5BEL6CN093NN94EIF8VQKLQQ7MTGA001O',
  REDIRECT_URI: process.env.REDIRECT_URI || 'http://localhost:5001/auth/callback',
  PORT: process.env.PORT || 5001,
  SESSION_SECRET: process.env.SESSION_SECRET || 'hr-helper-secret-key-change-in-production',
  TOKENS_FILE: process.env.TOKENS_FILE || '.tokens.json',
  HH_API_BASE: 'https://api.hh.ru',
  HH_OAUTH_AUTHORIZE: 'https://hh.ru/oauth/authorize',
  HH_OAUTH_TOKEN: 'https://api.hh.ru/token',
  USER_AGENT: 'HR_Helper/1.0 (sergeevags@icomplect.com)'
};