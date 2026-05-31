// script.js - загрузка данных из JSON и работа с локальным видео
let allSeries = [];
let currentUser = null;

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        allSeries = await response.json();
        
        // Загружаем текущего пользователя
        loadCurrentUserFromStorage();
        updateUserPanel();
        
        renderCards(allSeries);
        setupFiltersAndSearch();
        console.log("✅ Загружено", allSeries.length, "карточек");
    } catch (error) {
        console.error("❌ Ошибка загрузки данных:", error);
        const container = document.getElementById('catalogContainer');
        container.innerHTML = '<div class="no-results">❌ Ошибка загрузки данных. Убедитесь, что файл data.json существует.</div>';
    }
}

// ========== РЕНДЕРИНГ КАРТОЧЕК ==========
function renderCards(seriesArray) {
    const container = document.getElementById('catalogContainer');
    
    if(seriesArray.length === 0) {
        container.innerHTML = '<div class="no-results">😕 Ничего не найдено. Попробуйте изменить фильтр или поиск.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    // Получаем избранное текущего пользователя
    const favorites = currentUser ? (currentUser.favorites || []) : [];
    
    seriesArray.forEach(series => {
        const card = document.createElement('div');
        card.classList.add('card');
        const isFavorite = favorites.includes(series.id);
        
        card.innerHTML = `
            <img src="${series.poster}" alt="${series.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div class="card-content">
                <h3>${escapeHtml(series.title)}</h3>
                <p>${series.year} | ${series.genre}</p>
                <span class="rating">⭐ ${series.rating}</span>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${series.id}">
                    ${isFavorite ? '❤️ В избранном' : '♡ В избранное'}
                </button>
            </div>
        `;
        
        // Открытие плеера при клике на карточку (не на кнопку)
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('favorite-btn')) {
                openPlayer(series);
            }
        });
        
        // Обработчик кнопки избранного
        const favBtn = card.querySelector('.favorite-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(series.id, favBtn);
        });
        
        container.appendChild(card);
    });
}

// ========== ФИЛЬТРАЦИЯ И ПОИСК ==========
function filterAndSearch() {
    const activeGenreBtn = document.querySelector('.filter-btn.active');
    let genre = activeGenreBtn ? activeGenreBtn.dataset.genre : 'all';
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    let filtered = allSeries.filter(series => {
        let matchGenre = (genre === 'all') || series.genre.toLowerCase().includes(genre.toLowerCase());
        let matchSearch = series.title.toLowerCase().includes(searchTerm);
        return matchGenre && matchSearch;
    });
    
    renderCards(filtered);
}

function setupFiltersAndSearch() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterAndSearch();
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', filterAndSearch);
    }
}

// ========== ВИДЕОПЛЕЕР ==========
function openPlayer(series) {
    const modal = document.getElementById('playerModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalYearRating = document.getElementById('modalYearRating');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
    
    // Останавливаем предыдущее видео, если оно было
    if (videoPlayer) {
        videoPlayer.pause();
    }
    
    // Устанавливаем новый источник видео
    videoSource.src = series.videoSrc;
    videoPlayer.load();
    
    // Запускаем видео с небольшой задержкой
    setTimeout(() => {
        videoPlayer.play().catch(e => console.log("Автовоспроизведение заблокировано:", e));
    }, 100);
    
    // Обновляем информацию
    modalTitle.textContent = series.title;
    modalDescription.textContent = series.description;
    modalYearRating.textContent = `${series.year} | ${series.genre} | ⭐ ${series.rating}`;
    
    // Показываем модальное окно
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('playerModal');
    const videoPlayer = document.getElementById('videoPlayer');
    
    modal.style.display = 'none';
    
    // Останавливаем видео при закрытии
    if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
    }
}

// ========== СИСТЕМА ПОЛЬЗОВАТЕЛЕЙ (AUTH) ==========

// Загрузка пользователей из localStorage
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

// Сохранение пользователей в localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Загрузка текущего пользователя
function loadCurrentUserFromStorage() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    return currentUser;
}

// Регистрация нового пользователя
function registerUser(username, email, password) {
    const users = getUsers();
    
    // Проверка на существующего пользователя
    if (users.find(u => u.email === email)) {
        showToast('Пользователь с таким email уже существует', 'error');
        return false;
    }
    
    if (users.find(u => u.username === username)) {
        showToast('Пользователь с таким именем уже существует', 'error');
        return false;
    }
    
    // Создание нового пользователя
    const newUser = {
        id: Date.now(),
        username: username,
        email: email,
        password: password,
        favorites: [],
        registeredAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    showToast('Регистрация успешна! Теперь войдите в аккаунт', 'success');
    return true;
}

// Вход пользователя
function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = { ...user };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserPanel();
        renderCards(filterAndSearchGetCurrentList());
        showToast(`Добро пожаловать, ${user.username}!`, 'success');
        closeAllModals();
        return true;
    }
    
    showToast('Неверный email или пароль', 'error');
    return false;
}

// Выход из аккаунта
function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserPanel();
    renderCards(filterAndSearchGetCurrentList());
    showToast('Вы вышли из аккаунта', 'info');
    closeAllModals();
}

// Обновление избранного пользователя
function updateUserFavorites(favorites) {
    if (!currentUser) return;
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        users[userIndex].favorites = favorites;
        saveUsers(users);
        currentUser.favorites = [...favorites];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

// Переключение избранного
function toggleFavorite(movieId, btnElement) {
    if (!currentUser) {
        showToast('Войдите в аккаунт, чтобы добавлять в избранное', 'warning');
        openLoginModal();
        return;
    }
    
    let favorites = currentUser.favorites || [];
    const index = favorites.indexOf(movieId);
    
    if (index === -1) {
        favorites.push(movieId);
        btnElement.innerHTML = '❤️ В избранном';
        btnElement.classList.add('active');
        showToast('Добавлено в избранное', 'success');
    } else {
        favorites.splice(index, 1);
        btnElement.innerHTML = '♡ В избранное';
        btnElement.classList.remove('active');
        showToast('Удалено из избранного', 'info');
    }
    
    currentUser.favorites = favorites;
    updateUserFavorites(favorites);
}

// Получение отфильтрованного списка (для обновления)
function filterAndSearchGetCurrentList() {
    const activeGenreBtn = document.querySelector('.filter-btn.active');
    let genre = activeGenreBtn ? activeGenreBtn.dataset.genre : 'all';
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    return allSeries.filter(series => {
        let matchGenre = (genre === 'all') || series.genre.toLowerCase().includes(genre.toLowerCase());
        let matchSearch = series.title.toLowerCase().includes(searchTerm);
        return matchGenre && matchSearch;
    });
}

// ========== UI ОБНОВЛЕНИЯ ==========
function updateUserPanel() {
    const panel = document.getElementById('userPanel');
    if (!panel) return;
    
    if (currentUser) {
        panel.innerHTML = `
            <div class="user-info">
                <span class="user-name">👤 ${escapeHtml(currentUser.username)}</span>
                <button id="profileBtn" class="profile-btn">Профиль</button>
            </div>
        `;
        document.getElementById('profileBtn')?.addEventListener('click', openProfileModal);
    } else {
        panel.innerHTML = `
            <button id="loginBtn" class="auth-btn">Вход</button>
            <button id="registerBtn" class="auth-btn">Регистрация</button>
        `;
        document.getElementById('loginBtn')?.addEventListener('click', openLoginModal);
        document.getElementById('registerBtn')?.addEventListener('click', openRegisterModal);
    }
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function openProfileModal() {
    if (currentUser) {
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileDate').textContent = new Date(currentUser.registeredAt).toLocaleDateString();
        const favoritesCount = (currentUser.favorites || []).length;
        document.getElementById('profileFavoritesCount').textContent = favoritesCount;
        document.getElementById('profileModal').style.display = 'block';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// ========== TOAST УВЕДОМЛЕНИЯ ==========
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#333'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1001;
        animation: fadeInOut 2s ease;
        font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

// Закрытие модального окна плеера
const closeBtn = document.querySelector('#playerModal .close');
if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
}

// Закрытие модальных окон авторизации
document.querySelectorAll('.auth-close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

// Закрытие по клику вне окна
window.onclick = function(event) {
    const modals = ['playerModal', 'loginModal', 'registerModal', 'profileModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
            if (modalId === 'playerModal') {
                const videoPlayer = document.getElementById('videoPlayer');
                if (videoPlayer) {
                    videoPlayer.pause();
                    videoPlayer.currentTime = 0;
                }
            }
        }
    });
}

// Закрытие по Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeAllModals();
        const modal = document.getElementById('playerModal');
        if (modal.style.display === 'block') {
            closeModal();
        }
    }
});

// Форма входа
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        loginUser(email, password);
    });
}

// Форма регистрации
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        if (registerUser(username, email, password)) {
            document.getElementById('registerModal').style.display = 'none';
            openLoginModal();
        }
    });
}

// Кнопка выхода
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        logoutUser();
        closeAllModals();
    });
}

// Переключение между формами
const showRegister = document.getElementById('showRegister');
if (showRegister) {
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        openRegisterModal();
    });
}

const showLogin = document.getElementById('showLogin');
if (showLogin) {
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        openLoginModal();
    });
}

// Запуск при загрузке страницы
window.addEventListener('load', () => {
    loadData();
});