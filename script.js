// ==================== ДАННЫЕ ====================
let allSeries = [];
let currentUser = null;

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Ошибка загрузки');
        allSeries = await response.json();
        loadCurrentUser();
        updateUserPanel();
        renderCards(allSeries);
        setupFiltersAndSearch();
        console.log("✅ Загружено", allSeries.length, "карточек");
    } catch (error) {
        document.getElementById('moviesGrid').innerHTML = '<div class="no-results">❌ Ошибка загрузки данных</div>';
    }
}

// ==================== РЕНДЕРИНГ КАРТОЧЕК ====================
function renderCards(seriesArray) {
    const container = document.getElementById('moviesGrid');
    if (!seriesArray.length) {
        container.innerHTML = '<div class="no-results">😕 Ничего не найдено</div>';
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
        
        card.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(series.id);
            renderCards(getFilteredMovies());
        });
        
        card.querySelector('.watch-btn').addEventListener('click', (e) => {
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
        filtered = filtered.filter(m => !m.genre.toLowerCase().includes('сериал'));
    }
    
    return filtered;
}

function updateUI() {
    renderCards(getFilteredMovies());
}

function setupFiltersAndSearch() {
    document.getElementById('searchInput').addEventListener('input', () => updateUI());
    document.getElementById('genreFilter').addEventListener('change', () => updateUI());
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const titles = { home: 'Сейчас в прокате', movies: 'Фильмы', series: 'Сериалы', favorites: 'Избранное' };
            document.getElementById('sectionTitle').textContent = titles[btn.dataset.nav] || 'Сейчас в прокате';
            updateUI();
        });
    });
}

// ==================== ВИДЕОПЛЕЕР ====================
function openPlayer(series) {
    const modal = document.getElementById('playerModal');
    const videoContainer = document.getElementById('videoContainer');
    const trailerId = series.trailerId || '8Qn_spdM5Zg';
    
    videoContainer.innerHTML = `
        <iframe 
            src="https://www.youtube.com/embed/${trailerId}?autoplay=1" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
    
    document.getElementById('modalTitle').textContent = series.title;
    document.getElementById('modalDescription').textContent = series.description;
    document.getElementById('modalYearRating').textContent = `${series.year} | ${series.genre} | ⭐ ${series.rating}`;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// ==================== АВТОРИЗАЦИЯ ====================
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function loadCurrentUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) currentUser = JSON.parse(saved);
}

function registerUser(username, email, password) {
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        showToast('Email уже существует', 'error');
        return false;
    }
    if (users.find(u => u.username === username)) {
        showToast('Имя пользователя уже существует', 'error');
        return false;
    }
    
    const newUser = {
        id: Date.now(),
        username,
        email,
        password,
        favorites: [],
        registeredAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    showToast('Регистрация успешна!', 'success');
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
        showToast('Войдите в аккаунт', 'warning');
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
    document.getElementById('loginModal').style.display = 'flex';
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'flex';
}

function openProfileModal() {
    if (currentUser) {
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileDate').textContent = new Date(currentUser.registeredAt).toLocaleDateString();
        document.getElementById('profileFavoritesCount').textContent = (currentUser.favorites || []).length;
        document.getElementById('profileModal').style.display = 'flex';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById('videoContainer').innerHTML = '';
    document.body.style.overflow = 'auto';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== ОБРАБОТЧИКИ ====================
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) closeAllModals();
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
});

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    loginUser(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
});

document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    if (registerUser(username, email, password)) {
        closeAllModals();
        openLoginModal();
    }
});

document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllModals();
    openRegisterModal();
});

document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllModals();
    openLoginModal();
});

document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);

document.getElementById('heroTrailerBtn')?.addEventListener('click', () => {
    const duneMovie = allSeries.find(m => m.title.includes('Дюна'));
    if (duneMovie) openPlayer(duneMovie);
});

// ==================== ЗАПУСК ====================
loadData();