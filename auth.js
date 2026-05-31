// auth.js - система регистрации, входа и профиля

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
let currentUser = null;

// Загрузка пользователей из localStorage
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

// Сохранение пользователей в localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Регистрация нового пользователя
function registerUser(email, password, username) {
    const users = getUsers();
    
    // Проверка на существующего пользователя
    if (users.find(u => u.email === email)) {
        return { success: false, message: 'Пользователь с таким email уже существует' };
    }
    
    // Создание нового пользователя
    const newUser = {
        id: Date.now(),
        email: email,
        username: username,
        password: password, // В реальном проекте пароль нужно хешировать!
        favorites: [],
        registeredAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return { success: true, message: 'Регистрация успешна!' };
}

// Вход пользователя
function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { success: true, message: 'Вход выполнен!' };
    }
    
    return { success: false, message: 'Неверный email или пароль' };
}

// Выход из аккаунта
function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    return { success: true, message: 'Выход выполнен' };
}

// Загрузка текущего пользователя при старте
function loadCurrentUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    return currentUser;
}

// Обновление избранного пользователя
function updateUserFavorites(favorites) {
    if (!currentUser) return;
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        users[userIndex].favorites = favorites;
        saveUsers(users);
        currentUser.favorites = favorites;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}