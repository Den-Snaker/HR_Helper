const express = require('express');
const hhApi = require('../services/hh-api');
const tokenManager = require('../services/token-manager');
const settingsManager = require('../services/settings-manager');
const { exportToExcel } = require('../utils/excel-export');

const router = express.Router();

function checkAuth(req, res, next) {
  if (!tokenManager.isValid()) {
    return res.status(401).json({ 
      error: 'Authorization required',
      auth_url: '/auth/login'
    });
  }
  next();
}

function getUserId() {
  return tokenManager.getUserId() || 'default';
}

router.get('/vacancies', async (req, res) => {
  try {
    const params = {
      text: req.query.text,
      area: req.query.area,
      schedule: req.query.schedule,
      experience: req.query.experience,
      salary_from: req.query.salary_from,
      salary_to: req.query.salary_to,
      currency: req.query.currency,
      employment: req.query.employment,
      page: parseInt(req.query.page) || 0,
      per_page: parseInt(req.query.per_page) || 20
    };

    const data = await hhApi.searchVacancies(params);
    res.json(data);
  } catch (error) {
    console.error('Vacancies error:', error);
    res.status(error.status || 500).json({ 
      error: error.message,
      data: error.data 
    });
  }
});

router.get('/resumes', checkAuth, async (req, res) => {
  try {
    const userId = getUserId();
    settingsManager.incrementViewCount(userId);

    if (tokenManager.needsRefresh()) {
      try {
        await fetch(`${req.protocol}://${req.get('host')}/auth/refresh`, {
          method: 'POST'
        });
      } catch (e) {
        console.error('Auto-refresh failed:', e);
      }
    }

    const params = {
      text: req.query.text,
      area: req.query.area,
      schedule: req.query.schedule,
      experience: req.query.experience,
      salary_from: req.query.salary_from,
      salary_to: req.query.salary_to,
      currency: req.query.currency,
      age_from: req.query.age_from,
      age_to: req.query.age_to,
      gender: req.query.gender,
      education: req.query.education,
      employment: req.query.employment,
      professional_role: req.query.professional_role,
      label: req.query.label,
      employer_industry: req.query.employer_industry,
      only_with_salary: req.query.only_with_salary,
      order_by: req.query.order_by,
      page: parseInt(req.query.page) || 0,
      per_page: parseInt(req.query.per_page) || 20
    };

    console.log('Resume search params received:', JSON.stringify(params, null, 2));

    const data = await hhApi.searchResumes(params);
    
    const stats = settingsManager.getUsageStats(userId);
    data._usage = stats;
    
    res.json(data);
  } catch (error) {
    console.error('Resumes error:', error);
    
    if (error.status === 401 || error.status === 403) {
      tokenManager.clear();
      return res.status(error.status).json({ 
        error: 'Authorization required or insufficient permissions',
        auth_url: '/auth/login',
        details: error.data
      });
    }
    
    res.status(error.status || 500).json({ 
      error: error.message,
      data: error.data 
    });
  }
});

router.get('/resumes/:id', checkAuth, async (req, res) => {
  try {
    const userId = getUserId();
    const resumeId = req.params.id;
    
    const canOpen = settingsManager.canOpenContacts(userId);
    
    if (!canOpen.allowed) {
      const stats = settingsManager.getUsageStats(userId);
      
      if (canOpen.reason === 'search-only') {
        return res.status(403).json({ 
          error: 'Search-only mode',
          reason: 'search-only',
          message: 'Открытие контактов отключено в настройках',
          redirectUrl: `https://hh.ru/resume/${resumeId}`
        });
      }
      
      if (canOpen.reason === 'limit-exceeded') {
        return res.status(403).json({ 
          error: 'Limit exceeded',
          reason: 'limit-exceeded',
          message: 'Дневной лимит открытых контактов исчерпан',
          limit: canOpen.limit,
          used: canOpen.used,
          stats
        });
      }
      
      return res.status(403).json({
        error: 'Access denied',
        reason: canOpen.reason,
        stats
      });
    }
    
    const cached = settingsManager.getCachedResume(userId, resumeId);
    
    if (cached.cached) {
      console.log(`Cache hit for resume ${resumeId}`);
      const stats = settingsManager.getUsageStats(userId);
      return res.json({
        ...cached.data,
        _cached: true,
        _usage: stats
      });
    }
    
    const data = await hhApi.getResume(resumeId);
    settingsManager.cacheResume(userId, resumeId, data);
    settingsManager.incrementContactUsage(userId);
    
    const stats = settingsManager.getUsageStats(userId);
    
    res.json({
      ...data,
      _cached: false,
      _usage: stats,
      _limitWarning: canOpen.remaining !== undefined && canOpen.remaining <= 3 ? canOpen.remaining : null
    });
  } catch (error) {
    console.error('Resume detail error:', error);
    res.status(error.status || 500).json({ 
      error: error.message,
      data: error.data 
    });
  }
});

router.get('/settings', checkAuth, async (req, res) => {
  try {
    const userId = getUserId();
    const settings = settingsManager.getUserSettings(userId);
    const stats = settingsManager.getUsageStats(userId);
    
    res.json({
      settings: {
        accessMode: settings.accessMode,
        dailyContactLimit: settings.dailyContactLimit
      },
      usage: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settings', checkAuth, async (req, res) => {
  try {
    const userId = getUserId();
    const { accessMode, dailyContactLimit } = req.body;
    
    if (!['search-only', 'warning', 'limit', 'unlimited'].includes(accessMode)) {
      return res.status(400).json({ error: 'Invalid access mode' });
    }
    
    if (accessMode === 'limit') {
      const limit = parseInt(dailyContactLimit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'Limit must be between 1 and 100' });
      }
    }
    
    const settings = settingsManager.updateAccessMode(userId, accessMode, dailyContactLimit);
    
    res.json({ 
      success: true,
      settings: {
        accessMode: settings.accessMode,
        dailyContactLimit: settings.dailyContactLimit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/usage', checkAuth, async (req, res) => {
  try {
    const userId = getUserId();
    const stats = settingsManager.getUsageStats(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', checkAuth, async (req, res) => {
  try {
    const userId = getUserId();
    const page = parseInt(req.query.page) || 0;
    const perPage = parseInt(req.query.per_page) || 20;
    
    const history = settingsManager.getViewHistory(userId, page, perPage);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cache/clear', checkAuth, async (req, res) => {
  try {
    const userId = getUserId();
    const result = settingsManager.clearCache(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dictionaries', async (req, res) => {
  try {
    const data = await hhApi.getDictionaries();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/dictionaries/areas', async (req, res) => {
  try {
    const data = await hhApi.getAreas();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/dictionaries/professional_roles', async (req, res) => {
  try {
    const data = await hhApi.getProfessionalRoles();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/dictionaries/industries', async (req, res) => {
  try {
    const data = await hhApi.getIndustries();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/me', checkAuth, async (req, res) => {
  try {
    const data = await hhApi.getMe();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ 
      error: error.message,
      data: error.data 
    });
  }
});

router.post('/export', checkAuth, async (req, res) => {
  try {
    const { items, type = 'vacancies' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items to export' });
    }

    const buffer = await exportToExcel(items, type);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;