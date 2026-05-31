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
        document.getElementById('moviesGrid').innerHTML = '<div class="no-results">❌ Ошибка загрузки данных. Убедитесь, что файл data.json существует.</div>';
    }
}

// ==================== РЕНДЕРИНГ КАРТОЧЕК ====================
function renderCards(seriesArray) {
    const container = document.getElementById('moviesGrid');
    
    if (!seriesArray.length) {
        container.innerHTML = '<div class="no-results">😕 Ничего не найдено. Попробуйте изменить фильтр или поиск.</div>';
        return;
    }
    
    container.innerHTML = '';
    const favorites = currentUser ? (currentUser.favorites || []) : [];
    
    seriesArray.forEach(series => {
        const isFavorite = favorites.includes(series.id);
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="${series.poster}" alt="${series.title}" class="movie-poster" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div class="movie-info">
                <h3 class="movie-title">${escapeHtml(series.title)}</h3>
                <div class="movie-meta">
                    <span>${series.year}</span>
                    <span>${series.genre}</span>
                </div>
                <div class="movie-rating">⭐ ${series.rating}</div>
                <div class="movie-actions">
                    <button class="fav-btn ${isFavorite ? 'active' : ''}" data-id="${series.id}">
                        ${isFavorite ? '❤️' : '♡'}
                    </button>
                    <button class="watch-btn" data-id="${series.id}">Смотреть</button>
                </div>
            </div>
        `;
        
        const favBtn = card.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(series.id);
            renderCards(getFilteredMovies());
        });
        
        const watchBtn = card.querySelector('.watch-btn');
        watchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPlayer(series);
        });
        
        container.appendChild(card);
    });
}

function getFilteredMovies() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const genre = document.getElementById('genreFilter').value;
    const activeNav = document.querySelector('.nav-btn.active')?.dataset.nav || 'home';
    
    let filtered = [...allSeries];
    
    if (searchTerm) {
        filtered = filtered.filter(m => m.title.toLowerCase().includes(searchTerm));
    }
    if (genre !== 'all') {
        filtered = filtered.filter(m => m.genre.toLowerCase().includes(genre.toLowerCase()));
    }
    if (activeNav === 'favorites' && currentUser) {
        filtered = filtered.filter(m => currentUser.favorites?.includes(m.id));
    }
    if (activeNav === 'series') {
        filtered = filtered.filter(m => m.genre.toLowerCase().includes('сериал'));
    }
    if (activeNav === 'movies') {
        filtered = filtered.filter(m => !m.genre.toLowerCase().includes('сериал') && !m.genre.toLowerCase().includes('мультфильм'));
    }
    
    return filtered;
}

function updateUI() {
    renderCards(getFilteredMovies());
}

function setupFiltersAndSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => updateUI());
    }
    
    const genreFilter = document.getElementById('genreFilter');
    if (genreFilter) {
        genreFilter.addEventListener('change', () => updateUI());
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const titles = {
                home: 'Сейчас в прокате',
                movies: 'Фильмы',
                series: 'Сериалы',
                favorites: 'Избранное'
            };
            const sectionTitle = document.getElementById('sectionTitle');
            if (sectionTitle) {
                sectionTitle.textContent = titles[btn.dataset.nav] || 'Сейчас в прокате';
            }
            updateUI();
        });
    });
}

// ==================== ВИДЕОПЛЕЕР (VK VIDEO) ====================
function openPlayer(series) {
    const modal = document.getElementById('playerModal');
    const videoContainer = document.getElementById('videoContainer');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalYearRating = document.getElementById('modalYearRating');
    
    if (!modal || !videoContainer) return;
    
    // Устанавливаем заголовок и описание
    if (modalTitle) modalTitle.textContent = series.title;
    if (modalDescription) modalDescription.textContent = series.description;
    if (modalYearRating) modalYearRating.textContent = `${series.year} | ${series.genre} | ⭐ ${series.rating}`;
    
    // Вставляем видео (из VK)
    if (series.vkVideoCode) {
        videoContainer.innerHTML = series.vkVideoCode;
    } 
    // Если есть YouTube ссылка
    else if (series.videoSrc) {
        videoContainer.innerHTML = `
            <iframe 
                src="${series.videoSrc}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                style="width:100%; height:400px; border-radius:12px;">
            </iframe>
        `;
    } 
    // Если есть YouTube ID
    else if (series.trailerId) {
        videoContainer.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${series.trailerId}?autoplay=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                style="width:100%; height:400px; border-radius:12px;">
            </iframe>
        `;
    } 
    else {
        videoContainer.innerHTML = '<p style="color:red; text-align:center; padding:50px;">❌ Видео недоступно</p>';
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('playerModal');
    const videoContainer = document.getElementById('videoContainer');
    
    if (modal) modal.style.display = 'none';
    if (videoContainer) videoContainer.innerHTML = '';
    document.body.style.overflow = 'auto';
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
        updateUI();
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
    updateUI();
    closeAllModals();
    showToast('Вы вышли из аккаунта', 'info');
}

function toggleFavorite(movieId) {
    if (!currentUser) {
        showToast('Войдите в аккаунт, чтобы добавлять в избранное', 'warning');
        openLoginModal();
        return;
    }
    
    let favorites = currentUser.favorites || [];
    const index = favorites.indexOf(movieId);
    
    if (index === -1) {
        favorites.push(movieId);
        showToast('Добавлено в избранное', 'success');
    } else {
        favorites.splice(index, 1);
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
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) profileBtn.addEventListener('click', openProfileModal);
    } else {
        panel.innerHTML = `
            <button class="auth-btn" id="showLoginBtn">Вход</button>
            <button class="auth-btn" id="showRegisterBtn">Регистрация</button>
        `;
        const loginBtn = document.getElementById('showLoginBtn');
        const registerBtn = document.getElementById('showRegisterBtn');
        if (loginBtn) loginBtn.addEventListener('click', openLoginModal);
        if (registerBtn) registerBtn.addEventListener('click', openRegisterModal);
    }
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.style.display = 'flex';
}

function openProfileModal() {
    if (currentUser) {
        const usernameSpan = document.getElementById('profileUsername');
        const emailSpan = document.getElementById('profileEmail');
        const dateSpan = document.getElementById('profileDate');
        const favoritesSpan = document.getElementById('profileFavoritesCount');
        
        if (usernameSpan) usernameSpan.textContent = currentUser.username;
        if (emailSpan) emailSpan.textContent = currentUser.email;
        if (dateSpan) dateSpan.textContent = new Date(currentUser.registeredAt).toLocaleDateString();
        if (favoritesSpan) favoritesSpan.textContent = (currentUser.favorites || []).length;
        
        const modal = document.getElementById('profileModal');
        if (modal) modal.style.display = 'flex';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    const videoContainer = document.getElementById('videoContainer');
    if (videoContainer) videoContainer.innerHTML = '';
    document.body.style.overflow = 'auto';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#333'};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        z-index: 1100;
        animation: slideIn 0.3s ease;
        font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
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

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeAllModals();
    }
};

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeAllModals();
    }
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        loginUser(email, password);
    });
}

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

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
}

const heroTrailerBtn = document.getElementById('heroTrailerBtn');
if (heroTrailerBtn) {
    heroTrailerBtn.addEventListener('click', () => {
        const duneMovie = allSeries.find(m => m.title.includes('Дюна'));
        if (duneMovie) openPlayer(duneMovie);
    });
}

// ==================== ЗАПУСК ====================
window.addEventListener('load', () => {
    loadData();
});
