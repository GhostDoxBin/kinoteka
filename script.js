// ==================== ДАННЫЕ ====================
let allSeries = [];
let currentUser = null;

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Ошибка загрузки data.json');
        allSeries = await response.json();
        loadCurrentUser();
        updateUserPanel();
        renderCards(allSeries);
        setupFiltersAndSearch();
        console.log("✅ Загружено", allSeries.length, "карточек");
    } catch (error) {
        console.error(error);
        document.getElementById('catalogContainer').innerHTML = '<div class="no-results">❌ Ошибка загрузки данных. Убедитесь, что файл data.json существует.</div>';
    }
}

// ==================== РЕНДЕРИНГ КАРТОЧЕК ====================
function renderCards(seriesArray) {
    const container = document.getElementById('catalogContainer');
    if (!seriesArray.length) {
        container.innerHTML = '<div class="no-results">😕 Ничего не найдено. Попробуйте изменить фильтр или поиск.</div>';
        return;
    }
    
    container.innerHTML = '';
    const favorites = currentUser ? (currentUser.favorites || []) : [];
    
    seriesArray.forEach(series => {
        const isFavorite = favorites.includes(series.id);
        const card = document.createElement('div');
        card.className = 'card';
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
        
        const favBtn = card.querySelector('.favorite-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(series.id, favBtn);
        });
        
        card.addEventListener('click', () => openPlayer(series));
        container.appendChild(card);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== ФИЛЬТРАЦИЯ И ПОИСК ====================
function filterAndSearch() {
    const activeGenre = document.querySelector('.filter-btn.active')?.dataset.genre || 'all';
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    const filtered = allSeries.filter(series => {
        const matchGenre = activeGenre === 'all' || series.genre.toLowerCase().includes(activeGenre.toLowerCase());
        const matchSearch = series.title.toLowerCase().includes(searchTerm);
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
    if (searchInput) {
        searchInput.addEventListener('input', filterAndSearch);
    }
}

// ==================== ВИДЕОПЛЕЕР ====================
function openPlayer(series) {
    const modal = document.getElementById('playerModal');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
    
    if (videoPlayer) {
        videoPlayer.pause();
    }
    
    videoSource.src = series.videoSrc;
    videoPlayer.load();
    
    setTimeout(() => {
        videoPlayer.play().catch(e => console.log("Автовоспроизведение заблокировано:", e));
    }, 100);
    
    document.getElementById('modalTitle').textContent = series.title;
    document.getElementById('modalDescription').textContent = series.description;
    document.getElementById('modalYearRating').textContent = `${series.year} | ${series.genre} | ⭐ ${series.rating}`;
    
    modal.style.display = 'block';
}

// ==================== АВТОРИЗАЦИЯ ====================
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function loadCurrentUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
    }
}

function registerUser(username, email, password) {
    const users = getUsers();
    
    if (users.find(u => u.email === email)) {
        showToast('Пользователь с таким email уже существует', 'error');
        return false;
    }
    
    if (users.find(u => u.username === username)) {
        showToast('Пользователь с таким именем уже существует', 'error');
        return false;
    }
    
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

function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = { ...user };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserPanel();
        filterAndSearch();
        closeAllModals();
        showToast(`Добро пожаловать, ${user.username}!`, 'success');
        return true;
    }
    
    showToast('Неверный email или пароль', 'error');
    return false;
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserPanel();
    filterAndSearch();
    closeAllModals();
    showToast('Вы вышли из аккаунта', 'info');
}

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
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].favorites = favorites;
        saveUsers(users);
    }
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// ==================== UI ФУНКЦИИ ====================
function updateUserPanel() {
    const panel = document.getElementById('userPanel');
    if (!panel) return;
    
    if (currentUser) {
        panel.innerHTML = `
            <div class="user-info">
                <span class="user-name">👤 ${escapeHtml(currentUser.username)}</span>
                <button class="profile-btn" id="profileBtn">Профиль</button>
            </div>
        `;
        document.getElementById('profileBtn')?.addEventListener('click', openProfileModal);
    } else {
        panel.innerHTML = `
            <button class="auth-btn" id="showLoginBtn">Вход</button>
            <button class="auth-btn" id="showRegisterBtn">Регистрация</button>
        `;
        document.getElementById('showLoginBtn')?.addEventListener('click', openLoginModal);
        document.getElementById('showRegisterBtn')?.addEventListener('click', openRegisterModal);
    }
}

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
        document.getElementById('profileFavoritesCount').textContent = (currentUser.favorites || []).length;
        document.getElementById('profileModal').style.display = 'block';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
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

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
// Закрытие модальных окон через крестик
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

// Закрытие по клику вне окна
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeAllModals();
    }
}

// Закрытие по Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeAllModals();
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
            closeAllModals();
            openLoginModal();
        }
    });
}

// Переключение между формами
const switchToRegister = document.getElementById('switchToRegister');
if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        openRegisterModal();
    });
}

const switchToLogin = document.getElementById('switchToLogin');
if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        openLoginModal();
    });
}

// Кнопка выхода
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
}

// ==================== ЗАПУСК ====================
window.addEventListener('load', () => {
    loadData();
});
