const API_BASE = '';

let currentSearchType = 'vacancies';
let currentPage = 0;
let totalPages = 0;
let currentItems = [];
let isAuthenticated = false;

const dictionaries = {
  schedules: [],
  experiences: [],
  employments: [],
  areas: []
};

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon(true);
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    updateThemeIcon(false);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    updateThemeIcon(true);
  }
}

function updateThemeIcon(isDark) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.textContent = isDark ? '☀️' : '🌙';
  }
}

async function init() {
  initTheme();
  await checkAuthStatus();
  await loadDictionaries();
  setupEventListeners();
  handleUrlParams();
}

async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_BASE}/auth/status`);
    const data = await response.json();
    isAuthenticated = data.authenticated;
    updateAuthUI();
    
    if (isAuthenticated) {
      await loadUserInfo();
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

async function loadUserInfo() {
  try {
    const response = await fetch(`${API_BASE}/api/me`);
    if (response.ok) {
      const user = await response.json();
      const userInfo = document.getElementById('userInfo');
      if (userInfo && user) {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь';
        const type = user.is_employer ? 'Работодатель' : 'Соискатель';
        userInfo.innerHTML = `<span>${name} (${type})</span>`;
      }
    }
  } catch (error) {
    console.error('Load user info error:', error);
  }
}

function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const authRequired = document.getElementById('authRequired');
  const userInfo = document.getElementById('userInfo');
  
  if (isAuthenticated) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (authRequired) authRequired.style.display = 'none';
    if (userInfo) userInfo.style.display = 'block';
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (authRequired) authRequired.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
  }
}

async function loadDictionaries() {
  try {
    const [areasRes, dictsRes] = await Promise.all([
      fetch(`${API_BASE}/api/dictionaries/areas`),
      fetch(`${API_BASE}/api/dictionaries`)
    ]);
    
    if (areasRes.ok) {
      dictionaries.areas = await areasRes.json();
      populateAreasSelect();
    }
    
    if (dictsRes.ok) {
      const dicts = await dictsRes.json();
      dictionaries.schedules = dicts.schedule || [];
      dictionaries.experiences = dicts.experience || [];
      dictionaries.employments = dicts.employment || [];
    }
  } catch (error) {
    console.error('Load dictionaries error:', error);
  }
}

function populateAreasSelect() {
  const select = document.getElementById('area');
  if (!select || !dictionaries.areas) return;
  
  const popularAreas = [
    { id: '1', name: 'Москва' },
    { id: '2', name: 'Санкт-Петербург' },
    { id: '99', name: 'Другие регионы' }
  ];
  
  select.innerHTML = '<option value="">Все регионы</option>';
  
  popularAreas.forEach(area => {
    select.innerHTML += `<option value="${area.id}">${area.name}</option>`;
  });
}

function setupEventListeners() {
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      search();
    });
  }
  
  const filterToggle = document.getElementById('filterToggle');
  const filtersAdvanced = document.getElementById('filtersAdvanced');
  
  if (filterToggle && filtersAdvanced) {
    filterToggle.addEventListener('click', () => {
      filtersAdvanced.classList.toggle('hidden');
      filterToggle.innerHTML = filtersAdvanced.classList.contains('hidden') 
        ? 'Расширенные фильтры ▼' 
        : 'Скрыть фильтры ▲';
    });
  }
  
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToExcel);
  }
}

function setSearchType(type) {
  currentSearchType = type;
  currentPage = 0;
  
  const tabVacancies = document.getElementById('tabVacancies');
  const tabResumes = document.getElementById('tabResumes');
  
  if (tabVacancies && tabResumes) {
    tabVacancies.classList.toggle('active', type === 'vacancies');
    tabResumes.classList.toggle('active', type === 'resumes');
  }
  
  const results = document.getElementById('results');
  if (results) results.innerHTML = '';
  
  const exportSection = document.getElementById('exportSection');
  if (exportSection) {
    exportSection.style.display = type === 'resumes' && isAuthenticated ? 'block' : 'none';
  }
}

function handleResumeTabClick() {
  if (!isAuthenticated) {
    showErrors(['Для поиска резюме необходима авторизация работодателя. Нажмите "Войти через HH.ru"']);
    return;
  }
  setSearchType('resumes');
}

async function search() {
  currentPage = 0;
  await doSearch();
}

async function doSearch() {
  const resultsDiv = document.getElementById('results');
  const errorDiv = document.getElementById('errors');
  const searchBtn = document.getElementById('searchBtn');
  
  if (errorDiv) errorDiv.innerHTML = '';
  if (resultsDiv) resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  if (searchBtn) searchBtn.disabled = true;
  
  const params = getSearchParams();
  
  try {
    const endpoint = currentSearchType === 'vacancies' ? '/api/vacancies' : '/api/resumes';
    const response = await fetch(`${API_BASE}${endpoint}?${params.toString()}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.description || `Ошибка ${response.status}`);
    }
    
    currentItems = data.items || [];
    totalPages = data.pages || 0;
    
    renderResults(data);
    updatePagination(data);
    
  } catch (error) {
    showErrors([error.message]);
    if (resultsDiv) resultsDiv.innerHTML = '';
  } finally {
    if (searchBtn) searchBtn.disabled = false;
  }
}

function getSearchParams() {
  const params = new URLSearchParams();
  
  const keywords = document.getElementById('keywords')?.value?.trim();
  const area = document.getElementById('area')?.value;
  const schedule = document.getElementById('schedule')?.value;
  const experience = document.getElementById('experience')?.value;
  const salary = document.getElementById('salary')?.value;
  const perPage = document.getElementById('perPage')?.value || '20';
  
  if (keywords) params.append('text', keywords);
  if (area) params.append('area', area);
  if (schedule) params.append('schedule', schedule);
  if (experience) params.append('experience', experience);
  if (salary) params.append('salary_from', salary);
  params.append('page', currentPage);
  params.append('per_page', perPage);
  
  if (currentSearchType === 'resumes') {
    const ageFrom = document.getElementById('ageFrom')?.value;
    const ageTo = document.getElementById('ageTo')?.value;
    const gender = document.getElementById('gender')?.value;
    const education = document.getElementById('education')?.value;
    
    if (ageFrom) params.append('age_from', ageFrom);
    if (ageTo) params.append('age_to', ageTo);
    if (gender) params.append('gender', gender);
    if (education) params.append('education', education);
  }
  
  return params;
}

function renderResults(data) {
  const resultsDiv = document.getElementById('results');
  if (!resultsDiv) return;
  
  if (!data.items || data.items.length === 0) {
    resultsDiv.innerHTML = '<div class="form-card"><p>Ничего не найдено. Попробуйте изменить параметры поиска.</p></div>';
    return;
  }
  
  let html = `<div class="form-card results-header">
    <span class="results-count">Найдено: <strong>${data.found?.toLocaleString?.() || data.items.length}</strong> ${currentSearchType === 'vacancies' ? 'вакансий' : 'резюме'}</span>
  </div>`;
  
  if (currentSearchType === 'vacancies') {
    data.items.forEach(item => {
      html += renderVacancyCard(item);
    });
  } else {
    data.items.forEach(item => {
      html += renderResumeCard(item);
    });
  }
  
  resultsDiv.innerHTML = html;
}

function renderVacancyCard(vacancy) {
  const salary = vacancy.salary 
    ? `${vacancy.salary.from ? vacancy.salary.from + ' ' : ''}${vacancy.salary.to ? '-' + vacancy.salary.to : ''} ${vacancy.salary.currency || 'RUB'}`.trim()
    : 'Зарплата не указана';
  
  const tags = [];
  if (vacancy.schedule) tags.push(vacancy.schedule.name);
  if (vacancy.employment) tags.push(vacancy.employment.name);
  if (vacancy.experience && vacancy.experience.name !== 'Не имеет значения') tags.push(vacancy.experience.name);
  
  return `
    <div class="item-card">
      <div class="item-title">
        <a href="${vacancy.alternate_url}" target="_blank" rel="noopener">${vacancy.name}</a>
      </div>
      <div class="item-meta">
        ${vacancy.employer?.name || ''} ${vacancy.area ? '• ' + vacancy.area.name : ''}
      </div>
      <div class="item-meta" style="margin-top: 8px;">
        <span class="tag tag-salary">${salary}</span>
      </div>
      ${tags.length ? `<div class="item-tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>
  `;
}

function renderResumeCard(resume) {
  const salary = resume.salary 
    ? `${resume.salary.from || ''}${resume.salary.to ? '-' + resume.salary.to : ''} ${resume.salary.currency || 'RUB'}`.trim()
    : 'Зарплата не указана';
  
  const age = resume.age ? `${resume.age} лет` : '';
  const name = `${resume.first_name || ''} ${resume.last_name || ''}`.trim() || 'Без имени';
  
  const tags = [];
  if (resume.schedule) tags.push(resume.schedule.name);
  if (resume.total_experience?.months) tags.push(`Опыт: ${resume.total_experience.months} мес.`);
  if (resume.education?.level?.name) tags.push(resume.education.level.name);
  
  return `
    <div class="item-card">
      <div class="item-title">
        <a href="${resume.alternate_url}" target="_blank" rel="noopener">${resume.title || 'Без должности'}</a>
      </div>
      <div class="item-meta">
        ${name} ${age ? '• ' + age : ''} ${resume.area ? '• ' + resume.area.name : ''}
      </div>
      <div class="item-meta" style="margin-top: 8px;">
        <span class="tag tag-salary">${salary}</span>
      </div>
      ${tags.length ? `<div class="item-tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>
  `;
}

function updatePagination(data) {
  const paginationDiv = document.getElementById('pagination');
  if (!paginationDiv) return;
  
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  
  if (prevBtn) prevBtn.disabled = currentPage <= 0;
  if (nextBtn) nextBtn.disabled = currentPage >= (data.pages || 0) - 1;
  if (pageInfo) {
    pageInfo.textContent = `Страница ${(currentPage + 1)} из ${data.pages || 1}`;
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    doSearch();
  }
}

function nextPage() {
  if (currentPage < totalPages - 1) {
    currentPage++;
    doSearch();
  }
}

async function exportToExcel() {
  if (!currentItems || currentItems.length === 0) {
    showErrors(['Нет данных для экспорта. Сначала выполните поиск.']);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: currentItems,
        type: currentSearchType
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка экспорта');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSearchType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
  } catch (error) {
    showErrors([error.message]);
  }
}

function showErrors(errors) {
  const errorDiv = document.getElementById('errors');
  if (!errorDiv) return;
  
  errorDiv.innerHTML = errors.map(e => `<div class="error-message">${e}</div>`).join('');
}

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('auth') === 'success') {
    showSuccess('Авторизация прошла успешно!');
    setTimeout(checkAuthStatus, 500);
  }
  
  if (params.get('error')) {
    showErrors([decodeURIComponent(params.get('error'))]);
  }
  
  if (params.get('logout') === 'success') {
    showSuccess('Вы вышли из системы');
  }
  
  window.history.replaceState({}, document.title, window.location.pathname);
}

function showSuccess(message) {
  const msgDiv = document.getElementById('messages') || document.createElement('div');
  msgDiv.id = 'messages';
  msgDiv.innerHTML = `<div class="success-message">${message}</div>`;
  
  if (!document.getElementById('messages')) {
    document.querySelector('.container')?.prepend(msgDiv);
  }
  
  setTimeout(() => msgDiv.remove(), 5000);
}

function login() {
  window.location.href = `${API_BASE}/auth/login`;
}

function logout() {
  window.location.href = `${API_BASE}/auth/logout`;
}

document.addEventListener('DOMContentLoaded', init);