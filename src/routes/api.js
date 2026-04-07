const express = require('express');
const hhApi = require('../services/hh-api');
const tokenManager = require('../services/token-manager');
const { exportToExcel } = require('../utils/excel-export');

const router = express.Router();

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

router.get('/resumes', async (req, res) => {
  try {
    if (!tokenManager.isValid()) {
      return res.status(401).json({ 
        error: 'Authorization required',
        auth_url: '/auth/login'
      });
    }

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
      page: parseInt(req.query.page) || 0,
      per_page: parseInt(req.query.per_page) || 20
    };

    const data = await hhApi.searchResumes(params);
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

router.get('/resumes/:id', async (req, res) => {
  try {
    if (!tokenManager.isValid()) {
      return res.status(401).json({ 
        error: 'Authorization required',
        auth_url: '/auth/login'
      });
    }

    const data = await hhApi.getResume(req.params.id);
    res.json(data);
  } catch (error) {
    console.error('Resume detail error:', error);
    res.status(error.status || 500).json({ 
      error: error.message,
      data: error.data 
    });
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

router.get('/me', async (req, res) => {
  try {
    if (!tokenManager.isValid()) {
      return res.status(401).json({ 
        error: 'Authorization required',
        auth_url: '/auth/login'
      });
    }

    const data = await hhApi.getMe();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ 
      error: error.message,
      data: error.data 
    });
  }
});

router.post('/export', async (req, res) => {
  try {
    if (!tokenManager.isValid()) {
      return res.status(401).json({ 
        error: 'Authorization required',
        auth_url: '/auth/login'
      });
    }

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