const fetch = require('node-fetch');
const config = require('../config');
const tokenManager = require('./token-manager');

class HHApi {
  constructor() {
    this.baseUrl = config.HH_API_BASE;
  }

  async request(endpoint, options = {}) {
    const tokens = tokenManager.load();
    const headers = {
      'Accept': 'application/json',
      'HH-User-Agent': config.USER_AGENT,
      ...options.headers
    };

    if (tokens && tokens.access_token) {
      headers['Authorization'] = `Bearer ${tokens.access_token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.description || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async searchVacancies(params) {
    const queryParams = new URLSearchParams();
    
    if (params.text) queryParams.append('text', params.text);
    if (params.area) {
      if (Array.isArray(params.area)) {
        params.area.forEach(a => queryParams.append('area', a));
      } else {
        queryParams.append('area', params.area);
      }
    }
    if (params.schedule) {
      if (Array.isArray(params.schedule)) {
        params.schedule.forEach(s => queryParams.append('schedule', s));
      } else {
        queryParams.append('schedule', params.schedule);
      }
    }
    if (params.experience) queryParams.append('experience', params.experience);
    if (params.salary_from) queryParams.append('salary_from', params.salary_from);
    if (params.salary_to) queryParams.append('salary_to', params.salary_to);
    if (params.currency) queryParams.append('currency', params.currency);
    if (params.employment) queryParams.append('employment', params.employment);
    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    
    return this.request(`/vacancies?${queryParams.toString()}`);
  }

  async searchResumes(params) {
    const queryParams = new URLSearchParams();
    
    if (params.text) queryParams.append('text', params.text);
    if (params.area) {
      if (Array.isArray(params.area)) {
        params.area.forEach(a => queryParams.append('area', a));
      } else {
        queryParams.append('area', params.area);
      }
    }
    if (params.schedule) {
      if (Array.isArray(params.schedule)) {
        params.schedule.forEach(s => queryParams.append('schedule', s));
      } else {
        queryParams.append('schedule', params.schedule);
      }
    }
    if (params.experience) queryParams.append('experience', params.experience);
    if (params.salary_from) queryParams.append('salary_from', params.salary_from);
    if (params.salary_to) queryParams.append('salary_to', params.salary_to);
    if (params.currency) queryParams.append('currency', params.currency);
    if (params.age_from) queryParams.append('age_from', params.age_from);
    if (params.age_to) queryParams.append('age_to', params.age_to);
    if (params.gender) queryParams.append('gender', params.gender);
    if (params.education) queryParams.append('education', params.education);
    if (params.employment) queryParams.append('employment', params.employment);
    if (params.professional_role) {
      if (Array.isArray(params.professional_role)) {
        params.professional_role.forEach(r => queryParams.append('professional_role', r));
      } else {
        queryParams.append('professional_role', params.professional_role);
      }
    }
    if (params.label) {
      if (Array.isArray(params.label)) {
        params.label.forEach(l => queryParams.append('label', l));
      } else {
        queryParams.append('label', params.label);
      }
    }
    if (params.employer_industry) {
      if (Array.isArray(params.employer_industry)) {
        params.employer_industry.forEach(i => queryParams.append('employer_industry', i));
      } else {
        queryParams.append('employer_industry', params.employer_industry);
      }
    }
    if (params.only_with_salary) queryParams.append('only_with_salary', 'true');
    if (params.order_by) queryParams.append('order_by', params.order_by);
    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    
    return this.request(`/resumes?${queryParams.toString()}`);
  }

  async getResume(id) {
    return this.request(`/resumes/${id}`);
  }

  async getVacancy(id) {
    return this.request(`/vacancies/${id}`);
  }

  async getDictionaries() {
    return this.request('/dictionaries');
  }

  async getAreas() {
    return this.request('/areas');
  }

  async getProfessionalRoles() {
    return this.request('/professional_roles');
  }

  async getIndustries() {
    return this.request('/industries');
  }

  async getMe() {
    return this.request('/me');
  }
}

module.exports = new HHApi();