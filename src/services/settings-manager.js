const fs = require('fs');
const path = require('path');

class SettingsManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.settingsDir = path.join(this.dataDir, 'settings');
    this.cacheDir = path.join(this.dataDir, 'cache');
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.settingsDir)) {
      fs.mkdirSync(this.settingsDir, { recursive: true });
    }
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  getUserIdFromTokens(tokens) {
    if (!tokens || !tokens.access_token) return null;
    try {
      const payload = tokens.access_token.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        return decoded.user_id || decoded.sub || 'default';
      }
    } catch (e) {}
    return 'default';
  }

  getSettingsPath(userId) {
    return path.join(this.settingsDir, `${userId}.json`);
  }

  getCachePath(userId, resumeId) {
    return path.join(this.cacheDir, `${userId}_${resumeId}.json`);
  }

  getDefaultSettings() {
    return {
      accessMode: 'limit',
      dailyContactLimit: 10,
      contactUsageToday: 0,
      viewCountToday: 0,
      lastReset: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      aiSettings: {
        enabled: false,
        provider: null,
        apiKey: null,
        model: null,
        prompt: null,
        maxResumes: 20,
        requirements: null
      }
    };
  }

  getUserSettings(userId) {
    const file = this.getSettingsPath(userId);
    
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return this.checkAndResetLimits(userId, data);
      } catch (e) {
        console.error('Error reading settings:', e);
      }
    }
    
    return this.getDefaultSettings();
  }

  saveUserSettings(userId, settings) {
    const file = this.getSettingsPath(userId);
    const data = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return data;
  }

  checkAndResetLimits(userId, settings = null) {
    const currentSettings = settings || this.getUserSettings(userId);
    const today = new Date().toISOString().split('T')[0];
    
    if (currentSettings.lastReset !== today) {
      currentSettings.contactUsageToday = 0;
      currentSettings.viewCountToday = 0;
      currentSettings.lastReset = today;
      this.saveUserSettings(userId, currentSettings);
    }
    
    return currentSettings;
  }

  updateAccessMode(userId, accessMode, dailyContactLimit = null) {
    const settings = this.getUserSettings(userId);
    
    settings.accessMode = accessMode;
    
    if (dailyContactLimit !== null) {
      settings.dailyContactLimit = Math.max(1, Math.min(100, parseInt(dailyContactLimit) || 10));
    }
    
    return this.saveUserSettings(userId, settings);
  }

  canOpenContacts(userId) {
    const settings = this.checkAndResetLimits(userId);
    
    if (settings.accessMode === 'search-only') {
      return { allowed: false, reason: 'search-only' };
    }
    
    if (settings.accessMode === 'unlimited') {
      return { allowed: true, remaining: -1 };
    }
    
    if (settings.accessMode === 'warning') {
      return { allowed: true, needsConfirmation: true, remaining: -1 };
    }
    
    if (settings.accessMode === 'limit') {
      const remaining = settings.dailyContactLimit - settings.contactUsageToday;
      if (remaining <= 0) {
        return { 
          allowed: false, 
          reason: 'limit-exceeded',
          limit: settings.dailyContactLimit,
          used: settings.contactUsageToday
        };
      }
      return { allowed: true, remaining };
    }
    
    return { allowed: false, reason: 'unknown' };
  }

  incrementContactUsage(userId) {
    const settings = this.checkAndResetLimits(userId);
    settings.contactUsageToday++;
    return this.saveUserSettings(userId, settings);
  }

  incrementViewCount(userId) {
    const settings = this.checkAndResetLimits(userId);
    settings.viewCountToday++;
    return this.saveUserSettings(userId, settings);
  }

  getUsageStats(userId) {
    const settings = this.checkAndResetLimits(userId);
    
    return {
      viewsToday: settings.viewCountToday,
      contactsOpenedToday: settings.contactUsageToday,
      contactLimit: settings.dailyContactLimit,
      remainingContacts: Math.max(0, settings.dailyContactLimit - settings.contactUsageToday),
      accessMode: settings.accessMode,
      lastReset: settings.lastReset
    };
  }

  getCachedResume(userId, resumeId) {
    const file = this.getCachePath(userId, resumeId);
    
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const cacheAge = Date.now() - new Date(data.cachedAt).getTime();
        const maxAge = 24 * 60 * 60 * 1000;
        
        if (cacheAge < maxAge) {
          return { cached: true, data: data.resume };
        }
        
        fs.unlinkSync(file);
      } catch (e) {
        console.error('Cache read error:', e);
      }
    }
    
    return { cached: false };
  }

  cacheResume(userId, resumeId, resumeData) {
    const file = this.getCachePath(userId, resumeId);
    
    const cacheData = {
      resume: resumeData,
      resumeId: resumeId,
      cachedAt: new Date().toISOString()
    };
    
    try {
      fs.writeFileSync(file, JSON.stringify(cacheData, null, 2));
      return true;
    } catch (e) {
      console.error('Cache write error:', e);
      return false;
    }
  }

  getViewHistory(userId, page = 0, perPage = 20) {
    const cacheFiles = fs.readdirSync(this.cacheDir)
      .filter(f => f.startsWith(`${userId}_`))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.cacheDir, f), 'utf8'));
          return {
            resumeId: data.resumeId,
            cachedAt: data.cachedAt,
            title: data.resume?.title || 'Без названия',
            name: `${data.resume?.first_name || ''} ${data.resume?.last_name || ''}`.trim()
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.cachedAt) - new Date(a.cachedAt));
    
    const total = cacheFiles.length;
    const start = page * perPage;
    const items = cacheFiles.slice(start, start + perPage);
    
    return { items, total, page, perPage };
  }

  clearCache(userId) {
    const files = fs.readdirSync(this.cacheDir)
      .filter(f => f.startsWith(`${userId}_`));
    
    files.forEach(f => {
      try {
        fs.unlinkSync(path.join(this.cacheDir, f));
      } catch (e) {}
    });
    
    const settings = this.getUserSettings(userId);
    settings.viewCountToday = 0;
    settings.contactUsageToday = 0;
    this.saveUserSettings(userId, settings);
    
    return { cleared: files.length };
  }

  getAISettings(userId) {
    const settings = this.getUserSettings(userId);
    return settings.aiSettings || this.getDefaultSettings().aiSettings;
  }

  updateAISettings(userId, aiSettings) {
    const settings = this.getUserSettings(userId);
    
    settings.aiSettings = {
      enabled: aiSettings.enabled !== undefined ? aiSettings.enabled : settings.aiSettings?.enabled || false,
      provider: aiSettings.provider || settings.aiSettings?.provider || null,
      apiKey: aiSettings.apiKey !== undefined ? aiSettings.apiKey : settings.aiSettings?.apiKey || null,
      model: aiSettings.model || settings.aiSettings?.model || null,
      prompt: aiSettings.prompt !== undefined ? aiSettings.prompt : settings.aiSettings?.prompt || null,
      maxResumes: parseInt(aiSettings.maxResumes) || 20,
      requirements: aiSettings.requirements !== undefined ? aiSettings.requirements : settings.aiSettings?.requirements || null
    };
    
    return this.saveUserSettings(userId, settings);
  }
}

module.exports = new SettingsManager();