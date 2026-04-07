const API_BASE = '';

let currentSearchType = 'vacancies';
let currentPage = 0;
let totalPages = 0;
let currentItems = [];
let isAuthenticated = false;
let selectedAreas = [];
let selectedRoles = [];
let selectedSchedules = [];
let selectedIndustries = [];
let selectedExperiences = [];
let areasDropdownOpen = false;
let rolesDropdownOpen = false;
let schedulesDropdownOpen = false;
let industriesDropdownOpen = false;
let experiencesDropdownOpen = false;

const dictionaries = {
  schedules: [],
  experiences: [],
  employments: [],
  areas: [],
  professional_roles: [],
  industries: []
};

const popularAreas = [
  { id: '1', name: 'Москва' },
  { id: '2019', name: 'Московская область' },
  { id: '2', name: 'Санкт-Петербург' },
  { id: '2014', name: 'Ленинградская область' },
  { id: '4', name: 'Новосибирск' },
  { id: '40', name: 'Екатеринбург' },
  { id: '25', name: 'Казань' },
  { id: '54', name: 'Нижний Новгород' },
  { id: '3', name: 'Краснодар' },
  { id: '57', name: 'Самара' },
  { id: '61', name: 'Ростов-на-Дону' },
  { id: '59', name: 'Челябинск' },
  { id: '64', name: 'Уфа' },
  { id: '8', name: 'Владивосток' },
  { id: '28', name: 'Ижевск' },
  { id: '65', name: 'Волгоград' },
  { id: '71', name: 'Красноярск' },
  { id: '68', name: 'Воронеж' },
  { id: '104', name: 'Пермь' },
  { id: '73', name: 'Омск' },
  { id: '43', name: 'Тюмень' },
  { id: '1601', name: 'Тверь' },
  { id: '1662', name: 'Тверская область' },
  { id: '1673', name: 'Ярославль' },
  { id: '1672', name: 'Ярославская область' },
  { id: '1677', name: 'Владимир' },
  { id: '1679', name: 'Владимирская область' },
  { id: '1689', name: 'Рязань' },
  { id: '1691', name: 'Рязанская область' },
  { id: '1696', name: 'Тула' },
  { id: '1698', name: 'Тульская область' },
  { id: '1684', name: 'Калуга' },
  { id: '1686', name: 'Калужская область' },
  { id: '1652', name: 'Смоленск' },
  { id: '1654', name: 'Смоленская область' },
  { id: '99', name: 'Другие регионы' }
];

const areaPresets = {
  moscowRegion: {
    name: 'Москва и Московская область',
    areas: ['1', '2019']
  },
  moscowArea: {
    name: 'Москва, область и соседние регионы',
    areas: ['1', '2019', '1601', '1662', '1673', '1672', '1677', '1679', '1689', '1691', '1696', '1698', '1684', '1686', '1652', '1654']
  }
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
  const settingsBtn = document.getElementById('settingsBtn');
  const usageIndicator = document.getElementById('usageIndicator');
  
  if (isAuthenticated) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (authRequired) authRequired.style.display = 'none';
    if (userInfo) userInfo.style.display = 'block';
    if (settingsBtn) settingsBtn.style.display = 'inline-flex';
    if (usageIndicator) usageIndicator.style.display = 'flex';
    loadUsageStats();
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (authRequired) authRequired.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (settingsBtn) settingsBtn.style.display = 'none';
    if (usageIndicator) usageIndicator.style.display = 'none';
  }
}

async function loadUsageStats() {
  try {
    const response = await fetch(`${API_BASE}/api/usage`);
    if (response.ok) {
      const stats = await response.json();
      updateUsageIndicator(stats);
      window.userUsageStats = stats;
    }
  } catch (error) {
    console.error('Load usage stats error:', error);
  }
}

function updateUsageIndicator(stats) {
  const countEl = document.getElementById('usageCount');
  const limitEl = document.getElementById('usageLimit');
  const indicator = document.getElementById('usageIndicator');
  
  if (!countEl || !limitEl || !indicator) return;
  
  countEl.textContent = stats.contactsOpenedToday || 0;
  limitEl.textContent = stats.contactLimit || 10;
  
  const remaining = stats.remainingContacts || 0;
  indicator.classList.remove('warning', 'danger');
  
  if (remaining <= 2 && remaining > 0) {
    indicator.classList.add('warning');
  } else if (remaining <= 0) {
    indicator.classList.add('danger');
  }
}

async function loadDictionaries() {
  try {
    const [areasRes, dictsRes, rolesRes, industriesRes] = await Promise.all([
      fetch(`${API_BASE}/api/dictionaries/areas`),
      fetch(`${API_BASE}/api/dictionaries`),
      fetch(`${API_BASE}/api/dictionaries/professional_roles`),
      fetch(`${API_BASE}/api/dictionaries/industries`)
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
    
    if (rolesRes.ok) {
      const rolesData = await rolesRes.json();
      console.log('Professional roles data:', rolesData);
      dictionaries.professional_roles = rolesData;
      populateProfessionalRoles();
    } else {
      console.error('Failed to load professional roles:', rolesRes.status, rolesRes.statusText);
    }
    
    if (industriesRes.ok) {
      const industriesData = await industriesRes.json();
      console.log('Industries data:', industriesData);
      dictionaries.industries = industriesData;
      populateIndustries();
    } else {
      console.error('Failed to load industries:', industriesRes.status, industriesRes.statusText);
    }
  } catch (error) {
    console.error('Load dictionaries error:', error);
  }
}

function populateProfessionalRoles() {
  const roleList = document.getElementById('roleList');
  if (!roleList) {
    console.error('roleList element not found');
    return;
  }
  
  if (!dictionaries.professional_roles) {
    console.error('professional_roles not loaded');
    return;
  }
  
  console.log('Populating roles, data:', dictionaries.professional_roles);
  
  roleList.innerHTML = '';
  
  let allRoles = [];
  
  // API возвращает { categories: [...] }
  const data = dictionaries.professional_roles;
  const categories = data.categories || data;
  
  if (Array.isArray(categories)) {
    categories.forEach(category => {
      const roles = category.roles || category.industry_roles || [];
      const categoryName = category.name || category.industry_name || '';
      
      if (roles.length > 0) {
        roles.forEach(role => {
          allRoles.push({
            id: role.id,
            name: role.name,
            category: categoryName
          });
        });
      } else if (category.id && category.name) {
        allRoles.push({
          id: category.id,
          name: category.name,
          category: ''
        });
      }
    });
  }
  
  console.log('Total roles extracted:', allRoles.length);
  
  if (allRoles.length === 0) {
    roleList.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">Нет данных о профессиях</div>';
    return;
  }
  
  // Сортировка по имени категории, затем по имени роли
  allRoles.sort((a, b) => {
    if (a.category !== b.category) {
      return (a.category || '').localeCompare(b.category || '');
    }
    return a.name.localeCompare(b.name);
  });
  
  // Создаём элементы
  allRoles.forEach(role => {
    const div = document.createElement('div');
    div.className = 'role-item';
    div.dataset.id = role.id;
    div.dataset.name = role.name.toLowerCase();
    div.dataset.category = role.category.toLowerCase();
    div.innerHTML = `
      <input type="checkbox" id="role_${role.id}" value="${role.id}" onchange="updateSelectedRoles()">
      <label for="role_${role.id}">${role.name}</label>
      ${role.category ? `<small style="color: var(--text-secondary); margin-left: 4px;">${role.category}</small>` : ''}
    `;
    roleList.appendChild(div);
  });
  
  updateRolesHeaderText();
}

function populateIndustries() {
  const industryList = document.getElementById('industryList');
  if (!industryList) {
    console.error('industryList element not found');
    return;
  }
  
  if (!dictionaries.industries) {
    console.error('industries not loaded');
    return;
  }
  
  console.log('Populating industries, data:', dictionaries.industries);
  
  industryList.innerHTML = '';
  
  let allIndustries = [];
  
  // API возвращает массив отраслей с возможными вложенными индустриями
  const industries = dictionaries.industries;
  
  if (Array.isArray(industries)) {
    industries.forEach(industry => {
      // Основная отрасль
      allIndustries.push({
        id: industry.id,
        name: industry.name
      });
      
      // Вложенные подотрасли
      if (industry.industries && Array.isArray(industry.industries)) {
        industry.industries.forEach(sub => {
          allIndustries.push({
            id: sub.id,
            name: sub.name,
            parent: industry.name
          });
        });
      }
    });
  }
  
  console.log('Total industries extracted:', allIndustries.length);
  
  if (allIndustries.length === 0) {
    industryList.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">Нет данных об отраслях</div>';
    return;
  }
  
  // Сортировка по имени
  allIndustries.sort((a, b) => a.name.localeCompare(b.name));
  
  allIndustries.forEach(industry => {
    const div = document.createElement('div');
    div.className = 'industry-item';
    div.dataset.id = industry.id;
    div.dataset.name = industry.name.toLowerCase();
    div.innerHTML = `
      <input type="checkbox" id="industry_${industry.id}" value="${industry.id}" onchange="updateSelectedIndustries()">
      <label for="industry_${industry.id}">${industry.name}</label>
    `;
    industryList.appendChild(div);
  });
  
  updateIndustriesHeaderText();
}

function toggleIndustriesDropdown() {
  const dropdown = document.getElementById('industryDropdown');
  const header = document.getElementById('industrySelectHeader');
  
  if (!dropdown || !header) return;
  
  industriesDropdownOpen = !industriesDropdownOpen;
  
  if (industriesDropdownOpen) {
    dropdown.classList.add('open');
    header.classList.add('active');
  } else {
    dropdown.classList.remove('open');
    header.classList.remove('active');
  }
}

function filterIndustries() {
  const searchInput = document.getElementById('industrySearch');
  if (!searchInput) return;
  
  const query = searchInput.value.toLowerCase().trim();
  const items = document.querySelectorAll('.industry-item');
  
  items.forEach(item => {
    const name = item.dataset.name || '';
    if (query === '' || name.includes(query)) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

function selectAllIndustries() {
  const checkboxes = document.querySelectorAll('.industry-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateSelectedIndustries();
}

function clearAllIndustries() {
  const checkboxes = document.querySelectorAll('.industry-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSelectedIndustries();
}

function updateSelectedIndustries() {
  const checkboxes = document.querySelectorAll('.industry-item input[type="checkbox"]:checked');
  selectedIndustries = Array.from(checkboxes).map(cb => ({
    id: cb.value,
    name: cb.parentElement.querySelector('label').textContent
  }));
  
  updateIndustriesHeaderText();
}

function updateIndustriesHeaderText() {
  const textEl = document.getElementById('industrySelectText');
  const countEl = document.getElementById('selectedIndustriesCount');
  
  if (!textEl) return;
  
  if (selectedIndustries.length === 0) {
    textEl.textContent = 'Любая отрасль';
    if (countEl) countEl.textContent = '';
  } else if (selectedIndustries.length === 1) {
    textEl.textContent = selectedIndustries[0].name;
    if (countEl) countEl.textContent = '';
  } else {
    textEl.textContent = 'Выбрано отраслей: ' + selectedIndustries.length;
    if (countEl) countEl.textContent = selectedIndustries.length;
  }
}

function toggleExperienceDropdown() {
  const dropdown = document.getElementById('experienceDropdown');
  const header = document.getElementById('experienceSelectHeader');
  
  if (!dropdown || !header) return;
  
  experiencesDropdownOpen = !experiencesDropdownOpen;
  
  if (experiencesDropdownOpen) {
    dropdown.classList.add('open');
    header.classList.add('active');
  } else {
    dropdown.classList.remove('open');
    header.classList.remove('active');
  }
}

function selectAllExperiences() {
  const checkboxes = document.querySelectorAll('.experience-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateSelectedExperiences();
}

function clearAllExperiences() {
  const checkboxes = document.querySelectorAll('.experience-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSelectedExperiences();
}

function updateSelectedExperiences() {
  const checkboxes = document.querySelectorAll('.experience-item input[type="checkbox"]:checked');
  const expNames = {
    'noExperience': 'Нет опыта',
    'between1And3': 'От 1 до 3 лет',
    'between3And6': 'От 3 до 6 лет',
    'moreThan6': 'Более 6 лет'
  };
  
  selectedExperiences = Array.from(checkboxes).map(cb => ({
    id: cb.value,
    name: expNames[cb.value] || cb.value
  }));
  
  updateExperiencesHeaderText();
}

function updateExperiencesHeaderText() {
  const textEl = document.getElementById('experienceSelectText');
  const countEl = document.getElementById('selectedExperiencesCount');
  
  if (!textEl) return;
  
  if (selectedExperiences.length === 0) {
    textEl.textContent = 'Любой';
    if (countEl) countEl.textContent = '';
  } else if (selectedExperiences.length === 1) {
    textEl.textContent = selectedExperiences[0].name;
    if (countEl) countEl.textContent = '';
  } else {
    textEl.textContent = 'Выбрано: ' + selectedExperiences.length;
    if (countEl) countEl.textContent = selectedExperiences.length;
  }
}

function toggleRolesDropdown() {
  const dropdown = document.getElementById('roleDropdown');
  const header = document.getElementById('roleSelectHeader');
  
  if (!dropdown || !header) return;
  
  rolesDropdownOpen = !rolesDropdownOpen;
  
  if (rolesDropdownOpen) {
    dropdown.classList.add('open');
    header.classList.add('active');
  } else {
    dropdown.classList.remove('open');
    header.classList.remove('active');
  }
}

function filterRoles() {
  const searchInput = document.getElementById('roleSearch');
  if (!searchInput) return;
  
  const query = searchInput.value.toLowerCase().trim();
  const items = document.querySelectorAll('.role-item');
  
  items.forEach(item => {
    const name = item.dataset.name || '';
    const category = item.dataset.category || '';
    if (query === '' || name.includes(query) || category.includes(query)) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

function selectAllRoles() {
  const checkboxes = document.querySelectorAll('.role-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateSelectedRoles();
}

function clearAllRoles() {
  const checkboxes = document.querySelectorAll('.role-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSelectedRoles();
}

function updateSelectedRoles() {
  const checkboxes = document.querySelectorAll('.role-item input[type="checkbox"]:checked');
  selectedRoles = Array.from(checkboxes).map(cb => ({
    id: cb.value,
    name: cb.parentElement.querySelector('label').textContent
  }));
  
  sortRolesBySelected();
  updateRolesHeaderText();
}

function sortRolesBySelected() {
  const roleList = document.getElementById('roleList');
  if (!roleList) return;
  
  const items = Array.from(roleList.querySelectorAll('.role-item'));
  const selectedIds = selectedRoles.map(r => r.id);
  
  items.sort((a, b) => {
    const aSelected = selectedIds.includes(a.dataset.id);
    const bSelected = selectedIds.includes(b.dataset.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });
  
  items.forEach(item => roleList.appendChild(item));
}

function updateRolesHeaderText() {
  const textEl = document.getElementById('roleSelectText');
  const countEl = document.getElementById('selectedRolesCount');
  
  if (!textEl) return;
  
  if (selectedRoles.length === 0) {
    textEl.textContent = 'Все профессии';
    if (countEl) countEl.textContent = '';
  } else if (selectedRoles.length === 1) {
    textEl.textContent = selectedRoles[0].name;
    if (countEl) countEl.textContent = '';
  } else {
    textEl.textContent = 'Выбрано профессий: ' + selectedRoles.length;
    if (countEl) countEl.textContent = selectedRoles.length;
  }
}

function toggleScheduleDropdown() {
  const dropdown = document.getElementById('scheduleDropdown');
  const header = document.getElementById('scheduleSelectHeader');
  
  if (!dropdown || !header) return;
  
  schedulesDropdownOpen = !schedulesDropdownOpen;
  
  if (schedulesDropdownOpen) {
    dropdown.classList.add('open');
    header.classList.add('active');
  } else {
    dropdown.classList.remove('open');
    header.classList.remove('active');
  }
}

function selectAllSchedules() {
  const checkboxes = document.querySelectorAll('.schedule-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateSelectedSchedules();
}

function clearAllSchedules() {
  const checkboxes = document.querySelectorAll('.schedule-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSelectedSchedules();
}

function updateSelectedSchedules() {
  const checkboxes = document.querySelectorAll('.schedule-item input[type="checkbox"]:checked');
  const scheduleNames = {
    'remote': 'Удаленная работа',
    'fullDay': 'Полный день',
    'shift': 'Сменный график',
    'flexible': 'Гибкий график'
  };
  
  selectedSchedules = Array.from(checkboxes).map(cb => ({
    id: cb.value,
    name: scheduleNames[cb.value] || cb.value
  }));
  
  updateSchedulesHeaderText();
}

function updateSchedulesHeaderText() {
  const textEl = document.getElementById('scheduleSelectText');
  const countEl = document.getElementById('selectedSchedulesCount');
  
  if (!textEl) return;
  
  if (selectedSchedules.length === 0) {
    textEl.textContent = 'Любой';
    if (countEl) countEl.textContent = '';
  } else if (selectedSchedules.length === 1) {
    textEl.textContent = selectedSchedules[0].name;
    if (countEl) countEl.textContent = '';
  } else {
    textEl.textContent = 'Выбрано: ' + selectedSchedules.length;
    if (countEl) countEl.textContent = selectedSchedules.length;
  }
}

function populateAreasSelect() {
  populateAreasDropdown();
}

function populateAreasDropdown() {
  const areaList = document.getElementById('areaList');
  if (!areaList) return;
  
  areaList.innerHTML = '';
  popularAreas.forEach(area => {
    const div = document.createElement('div');
    div.className = 'area-item';
    div.dataset.id = area.id;
    div.dataset.name = area.name.toLowerCase();
    div.innerHTML = `
      <input type="checkbox" id="area_${area.id}" value="${area.id}" onchange="updateSelectedAreas()">
      <label for="area_${area.id}">${area.name}</label>
    `;
    areaList.appendChild(div);
  });
  
  sortAreasBySelected();
  updateAreasHeaderText();
}

function sortAreasBySelected() {
  const areaList = document.getElementById('areaList');
  if (!areaList) return;
  
  const items = Array.from(areaList.querySelectorAll('.area-item'));
  const selectedIds = selectedAreas.map(a => a.id);
  
  items.sort((a, b) => {
    const aSelected = selectedIds.includes(a.dataset.id);
    const bSelected = selectedIds.includes(b.dataset.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });
  
  items.forEach(item => areaList.appendChild(item));
}

function applyAreaPreset(presetKey) {
  const preset = areaPresets[presetKey];
  if (!preset) return;
  
  // Clear all first
  clearAllAreas();
  
  // Select preset areas
  preset.areas.forEach(areaId => {
    const checkbox = document.getElementById(`area_${areaId}`);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
  
  updateSelectedAreas();
}

function toggleAreaDropdown() {
  const dropdown = document.getElementById('areaDropdown');
  const header = document.getElementById('areaSelectHeader');
  
  if (!dropdown || !header) return;
  
  areasDropdownOpen = !areasDropdownOpen;
  
  if (areasDropdownOpen) {
    dropdown.classList.add('open');
    header.classList.add('active');
  } else {
    dropdown.classList.remove('open');
    header.classList.remove('active');
  }
}

function filterAreas() {
  const searchInput = document.getElementById('areaSearch');
  if (!searchInput) return;
  
  const query = searchInput.value.toLowerCase().trim();
  const items = document.querySelectorAll('.area-item');
  
  items.forEach(item => {
    const name = item.dataset.name || '';
    if (query === '' || name.includes(query)) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

function selectAllAreas() {
  const checkboxes = document.querySelectorAll('.area-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateSelectedAreas();
}

function clearAllAreas() {
  const checkboxes = document.querySelectorAll('.area-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSelectedAreas();
}

function updateSelectedAreas() {
  const checkboxes = document.querySelectorAll('.area-item input[type="checkbox"]:checked');
  selectedAreas = Array.from(checkboxes).map(cb => ({
    id: cb.value,
    name: cb.parentElement.querySelector('label').textContent
  }));
  
  sortAreasBySelected();
  updateAreasHeaderText();
}

function updateAreasHeaderText() {
  const textEl = document.getElementById('areaSelectText');
  const countEl = document.getElementById('selectedAreasCount');
  
  if (!textEl) return;
  
  if (selectedAreas.length === 0) {
    textEl.textContent = 'Все регионы';
    if (countEl) countEl.textContent = '';
  } else if (selectedAreas.length === 1) {
    textEl.textContent = selectedAreas[0].name;
    if (countEl) countEl.textContent = '';
  } else {
    textEl.textContent = 'Выбрано регионов: ' + selectedAreas.length;
    if (countEl) countEl.textContent = selectedAreas.length;
  }
}

document.addEventListener('click', function(e) {
  const areaContainer = document.querySelector('.area-select-container');
  const roleContainer = document.querySelector('.role-select-container');
  const scheduleContainer = document.querySelector('.schedule-select-container');
  const industryContainer = document.querySelector('.industry-select-container');
  const experienceContainer = document.querySelector('.experience-select-container');
  
  if (areaContainer && !areaContainer.contains(e.target) && areasDropdownOpen) {
    toggleAreaDropdown();
  }
  if (roleContainer && !roleContainer.contains(e.target) && rolesDropdownOpen) {
    toggleRolesDropdown();
  }
  if (scheduleContainer && !scheduleContainer.contains(e.target) && schedulesDropdownOpen) {
    toggleScheduleDropdown();
  }
  if (industryContainer && !industryContainer.contains(e.target) && industriesDropdownOpen) {
    toggleIndustriesDropdown();
  }
  if (experienceContainer && !experienceContainer.contains(e.target) && experiencesDropdownOpen) {
    toggleExperienceDropdown();
  }
});

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
  
  // Показываем/скрываем фильтры только для резюме
  const resumeOnlyFilters = document.getElementById('resumeOnlyFilters');
  const resumeOnlyCheckboxes = document.getElementById('resumeOnlyCheckboxes');
  const resumeOnlyIndustry = document.getElementById('resumeOnlyIndustry');
  
  if (resumeOnlyFilters) {
    resumeOnlyFilters.style.display = type === 'resumes' ? 'grid' : 'none';
  }
  if (resumeOnlyCheckboxes) {
    resumeOnlyCheckboxes.style.display = type === 'resumes' ? 'grid' : 'none';
  }
  if (resumeOnlyIndustry) {
    resumeOnlyIndustry.style.display = type === 'resumes' ? 'grid' : 'none';
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
  
  // Debug: show what's being searched
  console.log('Search params:', params.toString());
  console.log('Selected areas:', selectedAreas.map(a => `${a.id} (${a.name})`));
  
  // Show selected areas to user
  if (selectedAreas.length > 0) {
    console.log('Filtering by areas:', selectedAreas.map(a => a.name).join(', '));
  } else {
    console.log('No area filter - searching ALL regions');
  }
  
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
  const salaryFrom = document.getElementById('salaryFrom')?.value;
  const salaryTo = document.getElementById('salaryTo')?.value;
  const currency = document.getElementById('currency')?.value || 'RUR';
  const perPage = document.getElementById('perPage')?.value || '20';
  
  // Combine main keywords with required keywords for resumes
  let searchText = keywords || '';
  if (currentSearchType === 'resumes') {
    const requiredKeywords = document.getElementById('requiredKeywords')?.value?.trim();
    if (requiredKeywords) {
      searchText = searchText ? `${searchText} ${requiredKeywords}` : requiredKeywords;
    }
  }
  
  if (searchText) params.append('text', searchText);
  
  // Multiple areas support
  if (selectedAreas.length > 0) {
    selectedAreas.forEach(area => {
      params.append('area', area.id);
    });
  }
  
  // Multiple schedules support
  if (selectedSchedules.length > 0) {
    selectedSchedules.forEach(schedule => {
      params.append('schedule', schedule.id);
    });
  }
  
  // Multiple experiences support
  if (selectedExperiences.length > 0) {
    selectedExperiences.forEach(exp => {
      params.append('experience', exp.id);
    });
  }
  
  if (salaryFrom) params.append('salary_from', salaryFrom);
  if (salaryTo) params.append('salary_to', salaryTo);
  if (currency) params.append('currency', currency);
  params.append('page', currentPage);
  params.append('per_page', perPage);
  
  if (currentSearchType === 'resumes') {
    const ageFrom = document.getElementById('ageFrom')?.value;
    const ageTo = document.getElementById('ageTo')?.value;
    const gender = document.getElementById('gender')?.value;
    const education = document.getElementById('education')?.value;
    const orderBy = document.getElementById('orderBy')?.value;
    const notFromAgency = document.getElementById('notFromAgency')?.checked;
    
    if (ageFrom) params.append('age_from', ageFrom);
    if (ageTo) params.append('age_to', ageTo);
    if (gender) params.append('gender', gender);
    if (education) params.append('education', education);
    if (selectedRoles.length > 0) {
      selectedRoles.forEach(role => {
        params.append('professional_role', role.id);
      });
    }
    if (selectedIndustries.length > 0) {
      selectedIndustries.forEach(industry => {
        params.append('employer_industry', industry.id);
      });
    }
    if (orderBy) params.append('order_by', orderBy);
    if (notFromAgency) params.append('label', 'not_from_agency');
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
  
  // Build filter info
  let filterInfo = '';
  if (selectedAreas.length > 0) {
    filterInfo += `<span class="filter-tag">Регионы: ${selectedAreas.map(a => a.name).join(', ')}</span>`;
  }
  if (selectedSchedules.length > 0) {
    filterInfo += `<span class="filter-tag">График: ${selectedSchedules.map(s => s.name).join(', ')}</span>`;
  }
  if (selectedIndustries.length > 0) {
    filterInfo += `<span class="filter-tag">Отрасль: ${selectedIndustries.map(i => i.name).join(', ')}</span>`;
  }
  
  let html = `<div class="form-card results-header">
    <span class="results-count">Найдено: <strong>${data.found?.toLocaleString?.() || data.items.length}</strong> ${currentSearchType === 'vacancies' ? 'вакансий' : 'резюме'}</span>
    ${filterInfo ? `<div class="active-filters">${filterInfo}</div>` : ''}
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
        <a href="${resume.alternate_url}" target="_blank" rel="noopener" onclick="event.preventDefault(); openResume('${resume.id}', '${resume.alternate_url}')">${resume.title || 'Без должности'}</a>
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

let currentResumeId = null;
let currentResumeUrl = null;

async function openResume(resumeId, resumeUrl) {
  currentResumeId = resumeId;
  currentResumeUrl = resumeUrl;
  
  try {
    const response = await fetch(`${API_BASE}/api/resumes/${resumeId}`);
    const data = await response.json();
    
    if (!response.ok) {
      if (data.reason === 'limit-exceeded') {
        showLimitExceededModal(data);
      } else if (data.reason === 'search-only') {
        window.open(resumeUrl || `https://hh.ru/resume/${resumeId}`, '_blank');
      } else {
        showErrors([data.message || data.error || 'Ошибка открытия резюме']);
      }
      return;
    }
    
    if (data._cached) {
      console.log('Resume loaded from cache');
    }
    
    if (data._limitWarning !== null && data._limitWarning <= 3) {
      showLimitWarning(data._limitWarning);
    }
    
    if (data._usage) {
      updateUsageIndicator(data._usage);
    }
    
    showResumeModal(data);
    
  } catch (error) {
    console.error('Open resume error:', error);
    showErrors(['Ошибка при открытии резюме']);
  }
}

function showResumeModal(resume) {
  const modal = createModal('resumeModal');
  
  const salary = resume.salary 
    ? `${resume.salary.from || ''}${resume.salary.to ? '-' + resume.salary.to : ''} ${resume.salary.currency || 'RUB'}`.trim()
    : 'Не указана';
  
  const age = resume.age ? `${resume.age} лет` : '';
  const name = `${resume.first_name || ''} ${resume.last_name || ''}`.trim() || 'Без имени';
  const totalExperience = resume.total_experience?.months ? `${Math.floor(resume.total_experience.months / 12)} г. ${resume.total_experience.months % 12} мес.` : 'Нет опыта';
  
  let contactsHtml = '';
  if (resume.phone || resume.email) {
    contactsHtml = `
      <div style="margin-top: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
        <strong>Контакты:</strong><br>
        ${resume.phone ? `📞 ${resume.phone[0]?.formatted || resume.phone[0]?.value || '—'}<br>` : ''}
        ${resume.email ? `✉️ ${resume.email}` : ''}
        ${resume._cached ? '<br><small style="color: var(--text-secondary)">✓ Из кэша (бесплатно)</small>' : ''}
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">
        ${resume._cached ? '💾 ' : ''}${resume.title || 'Резюме'}
      </div>
      <div class="modal-text">
        <div><strong>${name}</strong> ${age ? `• ${age}` : ''}</div>
        <div style="margin-top: 8px;">
          ${resume.area?.name || 'Регион не указан'} • Опыт: ${totalExperience}
        </div>
        <div style="margin-top: 8px;">
          <span class="tag tag-salary">${salary}</span>
        </div>
        ${resume.schedule ? `<div style="margin-top: 8px;"><span class="tag">${resume.schedule.name}</span></div>` : ''}
        ${contactsHtml}
        ${resume._limitWarning !== null && resume._limitWarning <= 3 ? `<div style="margin-top: 8px; color: #e65100;">⚠️ Осталось открытий: ${resume._limitWarning}</div>` : ''}
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Закрыть</button>
        <a href="${resume.alternate_url}" target="_blank" class="modal-btn modal-btn-confirm" style="text-decoration: none;">Открыть на HH.ru</a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
}

function showLimitExceededModal(data) {
  const modal = createModal('limitModal');
  
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">⚠️ Лимит исчерпан</div>
      <div class="modal-text">
        <p>Вы использовали ${data.used} из ${data.limit} открытий контактов за сегодня.</p>
        <p>Лимит сбросится в 00:00 по московскому времени.</p>
        <p style="margin-top: 16px;">
          Вы можете:
          <ul>
            <li>Перейти в <a href="/settings.html">настройки</a> и изменить лимит</li>
            <li>Открыть резюме на HH.ru (контакты не будут доступны)</li>
            <li>Дождаться сброса лимита завтра</li>
          </ul>
        </p>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Отмена</button>
        <a href="/settings.html" class="modal-btn modal-btn-confirm" style="text-decoration: none;">Настройки</a>
        <button class="modal-btn modal-btn-danger" onclick="openOnHh()">Открыть на HH.ru</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
}

function showLimitWarning(remaining) {
  const msgDiv = document.getElementById('messages');
  if (msgDiv) {
    msgDiv.innerHTML = `<div class="warning-box" id="limitWarning">⚠️ Осталось ${remaining} открытий контактов. <a href="/settings.html">Изменить лимит</a></div>`;
    setTimeout(() => {
      const warning = document.getElementById('limitWarning');
      if (warning) warning.remove();
    }, 5000);
  }
}

function showConfirmationModal(callback) {
  const modal = createModal('confirmModal');
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const warningClass = isDark ? 'modal-warning dark' : 'modal-warning';
  
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">⚠️ Подтверждение</div>
      <div class="modal-text">
        <div class="${warningClass}">
          Открытие контактов резюме может быть платным в зависимости от вашего тарифа на HH.ru.
        </div>
        <p>Продолжить и открыть контакты?</p>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Отмена</button>
        <button class="modal-btn modal-btn-confirm" onclick="confirmOpenResume()">Открыть контакты</button>
      </div>
    </div>
  `;
  
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">⚠️ Подтверждение</div>
      <div class="modal-text">
        <div class="${warningClass}">
          Открытие контактов резюме может быть платным в зависимости от вашего тарифа на HH.ru.
        </div>
        <p>Продолжить и открыть контакты?</p>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Отмена</button>
        <button class="modal-btn modal-btn-confirm" onclick="confirmOpenResume()">Открыть контакты</button>
      </div>
    </div>
  `;
  
  window.confirmCallback = callback;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
}

function confirmOpenResume() {
  closeModal();
  if (window.confirmCallback) {
    window.confirmCallback();
    window.confirmCallback = null;
  }
}

function openOnHh() {
  if (currentResumeUrl) {
    window.open(currentResumeUrl, '_blank');
  }
  closeModal();
}

function createModal(id) {
  const existingModal = document.getElementById(id);
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = id;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  
  return modal;
}

function closeModal() {
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  });
}

document.addEventListener('DOMContentLoaded', init);