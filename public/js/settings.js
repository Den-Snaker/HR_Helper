const API_BASE = '';

let currentMode = 'limit';
let currentLimit = 10;
let selectedLimitOption = 10;

async function init() {
    initTheme();
    await loadSettings();
    setupEventListeners();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const warningBox = document.getElementById('warningBox');
        if (warningBox) warningBox.classList.add('dark');
    }
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/api/settings`);
        if (response.ok) {
            const data = await response.json();
            currentMode = data.settings.accessMode;
            currentLimit = data.settings.dailyContactLimit;
            
            selectMode(currentMode);
            setLimit(currentLimit);
            
            document.getElementById('viewsToday').textContent = data.usage.viewsToday || 0;
            document.getElementById('contactsOpened').textContent = data.usage.contactsOpenedToday || 0;
            document.getElementById('remainingContacts').textContent = data.usage.remainingContacts || 0;
        }
    } catch (error) {
        console.error('Load settings error:', error);
        showError('Ошибка загрузки настроек');
    }
}

function setupEventListeners() {
    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });
    
    document.getElementById('customLimit').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value >= 1 && value <= 100) {
            selectedLimitOption = value;
            updateLimitButtons();
        }
    });
}

function selectMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.mode-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    const selectedEl = document.querySelector(`[data-mode="${mode}"]`);
    if (selectedEl) {
        selectedEl.classList.add('selected');
    }
    
    const radio = document.getElementById(`mode-${mode}`);
    if (radio) {
        radio.checked = true;
    }
    
    const limitGroup = document.getElementById('limitInputGroup');
    if (limitGroup) {
        limitGroup.classList.toggle('hidden', mode !== 'limit');
    }
}

function setLimit(limit) {
    currentLimit = limit;
    selectedLimitOption = limit;
    updateLimitButtons();
    
    const customInput = document.getElementById('customLimit');
    if (customInput && ![5, 10, 20].includes(limit)) {
        customInput.value = limit;
    }
}

function updateLimitButtons() {
    document.querySelectorAll('.limit-option').forEach(btn => {
        const btnLimit = parseInt(btn.textContent);
        if (btnLimit === selectedLimitOption) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

async function saveSettings() {
    const limitInput = document.getElementById('customLimit');
    let limit = currentLimit;
    
    if (currentMode === 'limit') {
        if (limitInput && limitInput.value) {
            limit = parseInt(limitInput.value) || selectedLimitOption;
        } else {
            limit = selectedLimitOption;
        }
        
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessMode: currentMode,
                dailyContactLimit: currentMode === 'limit' ? limit : null
            })
        });
        
        if (response.ok) {
            showSuccess('Настройки сохранены');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            const error = await response.json();
            showError(error.error || 'Ошибка сохранения');
        }
    } catch (error) {
        console.error('Save settings error:', error);
        showError('Ошибка сохранения настроек');
    }
}

async function clearCache() {
    if (!confirm('Очистить кэш просмотренных резюме? Счётчики будут сброшены.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/cache/clear`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccess(`Кэш очищен. Удалено ${data.cleared} записей`);
            
            document.getElementById('viewsToday').textContent = '0';
            document.getElementById('contactsOpened').textContent = '0';
            document.getElementById('cachedResumes').textContent = '0';
        }
    } catch (error) {
        console.error('Clear cache error:', error);
        showError('Ошибка очистки кэша');
    }
}

function showError(message) {
    const msgDiv = document.getElementById('messages');
    msgDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

function showSuccess(message) {
    const msgDiv = document.getElementById('messages');
    msgDiv.innerHTML = `<div class="success-message">${message}</div>`;
}

document.addEventListener('DOMContentLoaded', init);