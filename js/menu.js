// ==========================================
// MENU SYSTEM - Alien Sammler
// ==========================================

// Spieler-Daten (werden im localStorage gespeichert)
let playerData = {
    name: 'Spieler',
    level: 1,
    xp: 0,
    xpToNext: 100,
    coins: 500, // Startmünzen
    highscore: 0,
    totalAliens: 0,
    gamesPlayed: 0,
    
    // Upgrades
    upgrades: {
        bagSize: 1,      // Level 1-5: +2 pro Level
        prisonSlots: 1,  // Level 1-3: +2 pro Level
        speedBoost: 1,   // Level 1-5: +10% pro Level
        staminaBoost: 1, // Level 1-5: +20% pro Level
        boatSpeed: 1,    // Level 1-3: +25% pro Level
        alienRadar: 0    // Level 0-1: An/Aus
    },
    
    // Gekaufte Skins
    ownedSkins: ['skin-default'],
    activeSkin: 'skin-default',
    
    // Einstellungen
    settings: {
        quality: 'medium',
        viewDistance: 500,
        shadows: true,
        masterVolume: 80,
        musicVolume: 50,
        sfxVolume: 70,
        sensitivity: 5,
        invertY: false
    }
};

// Upgrade-Preise
const upgradePrices = {
    'bag-size': [200, 400, 600, 800, 1000],
    'prison-slots': [500, 1000, 2000],
    'speed-boost': [300, 500, 700, 900, 1200],
    'stamina-boost': [250, 400, 600, 800, 1000],
    'boat-speed': [400, 800, 1500],
    'alien-radar': [1000]
};

// ==========================================
// INITIALISIERUNG
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadPlayerData();
    window.currentSettings = playerData.settings;
    updateMenuUI();
    setupSettingsListeners();
});

// ==========================================
// DATEN LADEN/SPEICHERN
// ==========================================
function loadPlayerData() {
    const saved = localStorage.getItem('alienCollectorData');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            playerData = { ...playerData, ...parsed };
        } catch (e) {
            console.log('Fehler beim Laden der Spielerdaten');
        }
    }
}

function savePlayerData() {
    localStorage.setItem('alienCollectorData', JSON.stringify(playerData));
}

// ==========================================
// UI AKTUALISIEREN
// ==========================================
function updateMenuUI() {
    // Profil
    document.getElementById('profile-name').textContent = playerData.name;
    document.getElementById('level-number').textContent = playerData.level;
    document.getElementById('profile-xp-text').textContent = `${playerData.xp} / ${playerData.xpToNext} XP`;
    document.getElementById('profile-xp-fill').style.width = `${(playerData.xp / playerData.xpToNext) * 100}%`;
    
    // Stats
    document.getElementById('stat-highscore').textContent = playerData.highscore;
    document.getElementById('stat-total-aliens').textContent = playerData.totalAliens;
    document.getElementById('stat-games-played').textContent = playerData.gamesPlayed;
    
    // Münzen im HUD
    const coinsCount = document.getElementById('coins-count');
    if (coinsCount) coinsCount.textContent = playerData.coins;
    
    // Shop-Münzen
    const shopCoins = document.getElementById('shop-coins-amount');
    if (shopCoins) shopCoins.textContent = playerData.coins;
    
    // Upgrade-Levels und Preise
    updateUpgradeUI();
}

function updateUpgradeUI() {
    const upgradeMap = {
        'bag': 'bagSize',
        'prison': 'prisonSlots',
        'speed': 'speedBoost',
        'stamina': 'staminaBoost',
        'boat': 'boatSpeed',
        'radar': 'alienRadar'
    };
    
    for (const [key, dataKey] of Object.entries(upgradeMap)) {
        const levelEl = document.getElementById(`${key}-level`);
        const priceEl = document.getElementById(`${key}-price`);
        
        if (levelEl) {
            levelEl.textContent = playerData.upgrades[dataKey];
        }
        
        if (priceEl) {
            const prices = upgradePrices[`${key === 'prison' ? 'prison-slots' : key === 'radar' ? 'alien-radar' : key + '-' + (key === 'bag' ? 'size' : 'boost')}`] || upgradePrices[`${key}-speed`];
            const currentLevel = playerData.upgrades[dataKey];
            
            if (prices && currentLevel < prices.length) {
                priceEl.textContent = prices[currentLevel];
            } else {
                priceEl.parentElement.innerHTML = '<div class="item-status">MAX</div>';
            }
        }
    }
    
    // Gekaufte Skins markieren
    playerData.ownedSkins.forEach(skinId => {
        const skinEl = document.querySelector(`[data-id="${skinId}"]`);
        if (skinEl && !skinEl.classList.contains('owned')) {
            skinEl.classList.add('owned');
            const priceEl = skinEl.querySelector('.item-price');
            if (priceEl) {
                priceEl.outerHTML = '<div class="item-status">✓ Im Besitz</div>';
            }
        }
    });
}

// ==========================================
// MENÜ AKTIONEN
// ==========================================
function playUiSound(name) {
    if (typeof window.ensureAudioReady === 'function') {
        window.ensureAudioReady();
    }
    if (window.audioManager) {
        window.audioManager.playSfx(name || 'click');
    }
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    playUiSound('click');
    
    playerData.gamesPlayed++;
    savePlayerData();
    
    // Game starten (wird in game.js definiert)
    if (typeof initGame === 'function') {
        initGame();
    }
}

function backToMenu() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    
    updateMenuUI();
}

// ==========================================
// EINSTELLUNGEN
// ==========================================
function openSettings() {
    document.getElementById('settings-popup').classList.remove('hidden');
    loadSettingsUI();

    playUiSound('click');
}

function closeSettings() {
    document.getElementById('settings-popup').classList.add('hidden');
    savePlayerData();
    applySettings();

    playUiSound('click');
}

function loadSettingsUI() {
    const s = playerData.settings;
    document.getElementById('setting-quality').value = s.quality;
    document.getElementById('setting-viewdistance').value = s.viewDistance;
    document.getElementById('viewdistance-value').textContent = s.viewDistance;
    document.getElementById('setting-shadows').checked = s.shadows;
    document.getElementById('setting-master').value = s.masterVolume;
    document.getElementById('master-value').textContent = s.masterVolume + '%';
    document.getElementById('setting-music').value = s.musicVolume;
    document.getElementById('music-value').textContent = s.musicVolume + '%';
    document.getElementById('setting-sfx').value = s.sfxVolume;
    document.getElementById('sfx-value').textContent = s.sfxVolume + '%';
    document.getElementById('setting-sensitivity').value = s.sensitivity;
    document.getElementById('sensitivity-value').textContent = s.sensitivity;
    document.getElementById('setting-invert-y').checked = s.invertY;
}

function updateSettings() {
    playerData.settings = {
        quality: document.getElementById('setting-quality').value,
        viewDistance: parseInt(document.getElementById('setting-viewdistance').value),
        shadows: document.getElementById('setting-shadows').checked,
        masterVolume: parseInt(document.getElementById('setting-master').value),
        musicVolume: parseInt(document.getElementById('setting-music').value),
        sfxVolume: parseInt(document.getElementById('setting-sfx').value),
        sensitivity: parseInt(document.getElementById('setting-sensitivity').value),
        invertY: document.getElementById('setting-invert-y').checked
    };
    
    // UI aktualisieren
    document.getElementById('viewdistance-value').textContent = playerData.settings.viewDistance;
    document.getElementById('master-value').textContent = playerData.settings.masterVolume + '%';
    document.getElementById('music-value').textContent = playerData.settings.musicVolume + '%';
    document.getElementById('sfx-value').textContent = playerData.settings.sfxVolume + '%';
    document.getElementById('sensitivity-value').textContent = playerData.settings.sensitivity;

    window.currentSettings = playerData.settings;
}

function resetSettings() {
    playerData.settings = {
        quality: 'medium',
        viewDistance: 500,
        shadows: true,
        masterVolume: 80,
        musicVolume: 50,
        sfxVolume: 70,
        sensitivity: 5,
        invertY: false
    };
    loadSettingsUI();
    window.currentSettings = playerData.settings;
}

function applySettings() {
    // Einstellungen an Game.js übergeben
    if (typeof applyGameSettings === 'function') {
        applyGameSettings(playerData.settings);
    }
    window.currentSettings = playerData.settings;
}

function setupSettingsListeners() {
    // Range-Slider Events für Live-Updates
    const rangeInputs = document.querySelectorAll('.setting-item input[type="range"]');
    rangeInputs.forEach(input => {
        input.addEventListener('input', updateSettings);
    });
}

// ==========================================
// SHOP
// ==========================================
function openShop() {
    document.getElementById('shop-popup').classList.remove('hidden');
    document.getElementById('shop-coins-amount').textContent = playerData.coins;
    updateUpgradeUI();

    playUiSound('click');
}

function closeShop() {
    document.getElementById('shop-popup').classList.add('hidden');

    playUiSound('click');
}

function switchShopTab(tabName) {
    // Alle Tabs deaktivieren
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.shop-content').forEach(c => c.classList.remove('active'));
    
    // Gewählten Tab aktivieren
    document.querySelector(`[onclick="switchShopTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`shop-${tabName}`).classList.add('active');

    playUiSound('click');
}

function buyItem(itemId, price) {
    if (playerData.ownedSkins.includes(itemId)) {
        showNotification('Du besitzt dieses Item bereits!', 'info');
        playUiSound('error');
        return;
    }
    
    if (playerData.coins < price) {
        showNotification('Nicht genug Münzen!', 'error');
        playUiSound('error');
        return;
    }
    
    playerData.coins -= price;
    playerData.ownedSkins.push(itemId);
    savePlayerData();
    updateMenuUI();
    updateUpgradeUI();
    
    showNotification('Skin gekauft! 🎉', 'success');
    playUiSound('deliver');
}

function buyUpgrade(upgradeId) {
    const upgradeMap = {
        'bag-size': { key: 'bagSize', max: 5 },
        'prison-slots': { key: 'prisonSlots', max: 3 },
        'speed-boost': { key: 'speedBoost', max: 5 },
        'stamina-boost': { key: 'staminaBoost', max: 5 },
        'boat-speed': { key: 'boatSpeed', max: 3 },
        'alien-radar': { key: 'alienRadar', max: 1 }
    };
    
    const upgrade = upgradeMap[upgradeId];
    if (!upgrade) return;
    
    const currentLevel = playerData.upgrades[upgrade.key];
    
    if (currentLevel >= upgrade.max) {
        showNotification('Maximales Level erreicht!', 'info');
        playUiSound('error');
        return;
    }
    
    const prices = upgradePrices[upgradeId];
    const price = prices[currentLevel];
    
    if (playerData.coins < price) {
        showNotification('Nicht genug Münzen!', 'error');
        playUiSound('error');
        return;
    }
    
    playerData.coins -= price;
    playerData.upgrades[upgrade.key]++;
    savePlayerData();
    updateMenuUI();
    
    showNotification('Upgrade gekauft! ⬆️', 'success');
    playUiSound('deliver');
}

function buyCoins(amount, price) {
    // Simulation - In einer echten App würde hier ein Zahlungsprozess starten
    showNotification(`${amount} Münzen würden ${price}€ kosten (Demo)`, 'info');

    playUiSound('click');
    
    // Demo: Gratis Münzen geben
    playerData.coins += amount;
    savePlayerData();
    updateMenuUI();
}

// ==========================================
// TUTORIAL
// ==========================================
function openTutorial() {
    document.getElementById('tutorial-popup').classList.remove('hidden');

    playUiSound('click');
}

function closeTutorial() {
    document.getElementById('tutorial-popup').classList.add('hidden');

    playUiSound('click');
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function showNotification(message, type = 'info') {
    // Einfache Notification über das Status-Message Element
    const msgEl = document.getElementById('status-message');
    if (msgEl) {
        msgEl.textContent = message;
        msgEl.classList.add('visible');
        
        if (type === 'error') {
            msgEl.style.background = 'rgba(244, 67, 54, 0.9)';
            msgEl.style.color = 'white';
        } else if (type === 'success') {
            msgEl.style.background = 'rgba(76, 175, 80, 0.9)';
            msgEl.style.color = 'white';
        } else {
            msgEl.style.background = 'rgba(255, 193, 7, 0.9)';
            msgEl.style.color = 'black';
        }
        
        setTimeout(() => {
            msgEl.classList.remove('visible');
        }, 2000);
    }
}

// ==========================================
// SPIELENDE FUNKTIONEN
// ==========================================
function onGameOver(aliensCollected) {
    const coinsEarned = aliensCollected * 5;
    playerData.coins += coinsEarned;
    playerData.totalAliens += aliensCollected;
    
    document.getElementById('result-aliens').textContent = aliensCollected;
    document.getElementById('result-coins').textContent = '+' + coinsEarned;
    
    savePlayerData();
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function onGameWin(aliensDelivered) {
    const coinsEarned = aliensDelivered * 10 + 50; // Bonus für Sieg
    const xpEarned = aliensDelivered * 5 + 25;
    
    playerData.coins += coinsEarned;
    playerData.totalAliens += aliensDelivered;
    playerData.xp += xpEarned;
    
    // Level-Up Check
    while (playerData.xp >= playerData.xpToNext) {
        playerData.xp -= playerData.xpToNext;
        playerData.level++;
        playerData.xpToNext = Math.floor(playerData.xpToNext * 1.5);
    }
    
    // Highscore
    if (aliensDelivered > playerData.highscore) {
        playerData.highscore = aliensDelivered;
    }
    
    document.getElementById('win-aliens').textContent = aliensDelivered;
    document.getElementById('win-coins').textContent = '+' + coinsEarned;
    document.getElementById('win-xp').textContent = '+' + xpEarned;
    
    savePlayerData();
    document.getElementById('win-screen').classList.remove('hidden');
}

// ==========================================
// GETTER FÜR GAME.JS
// ==========================================
function getPlayerUpgrades() {
    return playerData.upgrades;
}

function getPlayerSettings() {
    return playerData.settings;
}

function getPlayerCoins() {
    return playerData.coins;
}

function addPlayerCoins(amount) {
    playerData.coins += amount;
    savePlayerData();
    updateMenuUI();
}
