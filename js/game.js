/**
 * Catch the Kids - 3D Spiel
 * Version 4.0 - Lebendige Stadt mit NPCs und Tieren
 */

// ==========================================
// GLOBALE VARIABLEN
// ==========================================
let scene, camera, renderer;
let player, playerVelocity;
let mainland, island, water;
let boat, boatDock, islandDock;
let house;
let aliens = [];
let police = [];
let buildings = [];
let streetLights = [];
let vehicles = [];
let npcs = [];      // Zivilisten
let animals = [];   // Tiere (Hunde, Katzen, Vögel)
let seaCreatures = []; // Fische, Haie
let seaBoats = [];   // Andere Boote
let skyDome = null;
let skyEnvMap = null;
let waterNoiseMap = null;
let skyCanvas = null;
let skyCtx = null;
let skyTexture = null;
let lastEnvUpdate = -999;
let lastSkyHeight = 0;
let sunLight = null;
let fillLight = null;
let hemiLight = null;
let ambientLight = null;
let windowGlowMaterials = [];
let interiorLights = [];
let collectedAliens = 0;
let deliveredAliens = 0;
const TOTAL_ALIENS = 8;

// Welt-Dimensionen und Insel-Positionen
const WORLD_SIZE = 1200;
const WORLD_HALF = WORLD_SIZE / 2;
const MAINLAND_BOUND = WORLD_HALF - 40;

const ISLAND_CENTER_X = WORLD_HALF + 260;
const ISLAND_CENTER_Z = 0;
const ISLAND_RADIUS = 85;
const ISLAND_THRESHOLD_X = WORLD_HALF + 40;

const MAINLAND_DOCK_X = WORLD_HALF - 80;
const ISLAND_DOCK_X = ISLAND_CENTER_X - 90;
const BOAT_MAINLAND_X = MAINLAND_DOCK_X + 5;
const BOAT_ISLAND_X = ISLAND_DOCK_X + 5;
const BOAT_SWITCH_X = (BOAT_MAINLAND_X + BOAT_ISLAND_X) / 2;

const CITY_ROADS = [-100, 0, 100];
const ROAD_LIMIT = 200;
const ROAD_LANES = [-3, 3];
const CITY_BOUND = 180;

const RIVER_WIDTH = 18;
const RIVER_DEPTH = 6;
const RIVER_WATER_LEVEL = -0.6;
const LAKE_RADIUS = 34;
const LAKE_DEPTH = 5;
const LAKE_WATER_LEVEL = -0.5;
const LAKE_CENTER = { x: 360, z: 260 };

let riverCurve = null;
let riverSamples = [];

// Audio
let audioManager = null;

function createAudioManager() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const masterGain = ctx.createGain();
    const musicGain = ctx.createGain();
    const sfxGain = ctx.createGain();

    masterGain.gain.value = 0.8;
    musicGain.gain.value = 0.5;
    sfxGain.gain.value = 0.7;

    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    let musicTimer = null;
    let musicStep = 0;
    const musicPattern = [261.63, 293.66, 329.63, 392.0, 329.63, 293.66];

    function playTone(options) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        const duration = options.duration || 0.15;

        osc.type = options.type || 'sine';
        osc.frequency.setValueAtTime(options.frequency || 440, now);
        if (options.detune) {
            osc.detune.setValueAtTime(options.detune, now);
        }

        gain.gain.setValueAtTime(options.gain || 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(options.output || sfxGain);

        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    function playSfx(name) {
        switch (name) {
            case 'collect':
                playTone({ frequency: 660, duration: 0.12, type: 'triangle', gain: 0.25 });
                playTone({ frequency: 990, duration: 0.08, type: 'triangle', gain: 0.2, detune: 4 });
                break;
            case 'deliver':
                playTone({ frequency: 220, duration: 0.18, type: 'square', gain: 0.22 });
                playTone({ frequency: 330, duration: 0.14, type: 'square', gain: 0.18 });
                break;
            case 'boat':
                playTone({ frequency: 140, duration: 0.25, type: 'sawtooth', gain: 0.18 });
                break;
            case 'win':
                playTone({ frequency: 523.25, duration: 0.2, type: 'triangle', gain: 0.2 });
                playTone({ frequency: 659.25, duration: 0.2, type: 'triangle', gain: 0.2 });
                playTone({ frequency: 783.99, duration: 0.22, type: 'triangle', gain: 0.22 });
                break;
            case 'lose':
                playTone({ frequency: 196.0, duration: 0.3, type: 'sine', gain: 0.2 });
                playTone({ frequency: 130.81, duration: 0.3, type: 'sine', gain: 0.18 });
                break;
            case 'error':
                playTone({ frequency: 110, duration: 0.25, type: 'square', gain: 0.2 });
                break;
            case 'click':
            default:
                playTone({ frequency: 440, duration: 0.06, type: 'square', gain: 0.12 });
                break;
        }
    }

    function startMusic() {
        if (musicTimer) return;
        musicTimer = setInterval(() => {
            const freq = musicPattern[musicStep % musicPattern.length];
            musicStep += 1;
            playTone({ frequency: freq, duration: 0.18, type: 'sine', gain: 0.08, output: musicGain });
        }, 260);
    }

    function stopMusic() {
        if (!musicTimer) return;
        clearInterval(musicTimer);
        musicTimer = null;
    }

    function resume() {
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    }

    function setVolumes(settings) {
        if (!settings) return;
        if (typeof settings.masterVolume === 'number') {
            masterGain.gain.value = settings.masterVolume / 100;
        }
        if (typeof settings.musicVolume === 'number') {
            musicGain.gain.value = settings.musicVolume / 100;
        }
        if (typeof settings.sfxVolume === 'number') {
            sfxGain.gain.value = settings.sfxVolume / 100;
        }
    }

    return {
        resume,
        startMusic,
        stopMusic,
        playSfx,
        setVolumes
    };
}

function ensureAudioReady() {
    if (!audioManager) {
        audioManager = createAudioManager();
        window.audioManager = audioManager;
        if (audioManager && window.currentSettings) {
            audioManager.setVolumes(window.currentSettings);
        }
    }
    if (audioManager) {
        audioManager.resume();
    }
}

// Spielzustand
let gameState = 'start';
let playerOnBoat = false;
let boatMoving = false;
let boatDirection = 'toIsland';

// Zeit für Animationen
let clock;
let gameTime = 0;
const DAY_LENGTH = 240; // Sekunden für einen vollen Tag-Nacht-Zyklus

// First-Person Kamera Steuerung
let yaw = 0;      // Horizontale Rotation
let pitch = 0;    // Vertikale Rotation
let isPointerLocked = false;
const mouseSensitivity = 0.003;

// Spieler-Körper (für First-Person Ansicht)
let playerHands;
let playerBody;   // Sichtbarer Körper
let bagMesh;

// Sprung-System
let isJumping = false;
let jumpVelocity = 0;
const GRAVITY = 0.015;
const JUMP_FORCE = 0.25;
const GROUND_LEVEL = 1.7;  // Augenhöhe über dem Boden (realistischer Maßstab)
const PLAYER_RADIUS = 0.6;

// Gebäude-Kollision
let buildingColliders = [];

// Sprint-Ausdauer
let stamina = 100;
const MAX_STAMINA = 100;
const STAMINA_DRAIN = 0.5;     // Pro Frame beim Sprinten
const STAMINA_REGEN = 0.3;    // Pro Frame bei Erholung
let canSprint = true;

// Steuerung
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    interact: false,  // E-Taste
    sprint: false
};

// ==========================================
// INITIALISIERUNG
// ==========================================
function init() {
    clock = new THREE.Clock();
    gameTime = 0;
    
    // Szene erstellen
    scene = new THREE.Scene();
    
    // Realistischer Himmel
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0xb7d7f0, 0.0036); // Dynamisch per Settings anpassbar

    // First-Person Kamera mit reduzierter Sichtweite
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.5,
        700  // Wird später durch Settings überschrieben
    );
    // Spawnpoint auf der Insel vor dem Haus
    const spawnY = getIslandGroundHeight(ISLAND_CENTER_X, GROUND_LEVEL, 10) + GROUND_LEVEL;
    camera.position.set(ISLAND_CENTER_X, spawnY, 10);

    // Renderer mit Performance-Optimierungen
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: false, // Antialias aus für bessere Performance
        powerPreference: "high-performance",
        stencil: false,
        depth: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Reduziert
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; // Schnellere Schatten
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Realistischere Umgebung / Himmel
    createSkyEnvironment();

    // Licht hinzufügen
    setupLights();

    // Welt aufbauen
    createWorld();

    // Spieler erstellen (First-Person Hände)
    createPlayer();

    // Event Listener
    setupEventListeners();

    // Pointer Lock für Maussteuerung
    setupPointerLock();

    // View-Distance aus Settings übernehmen
    applyGameSettings(window.currentSettings || { viewDistance: 600, shadows: true });

    // Animation starten
    animate();
}

// ==========================================
// POINTER LOCK FÜR MAUS-STEUERUNG
// ==========================================
function setupPointerLock() {
    const canvas = renderer.domElement;
    const crosshair = document.getElementById('crosshair');
    const pointerHint = document.getElementById('pointer-lock-hint');
    
    canvas.addEventListener('click', () => {
        if (gameState === 'playing' && !isPointerLocked) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === canvas;
        
        // UI Updates basierend auf Pointer Lock Status
        if (crosshair) {
            crosshair.style.display = isPointerLocked ? 'block' : 'none';
        }
        if (pointerHint) {
            pointerHint.classList.toggle('visible', !isPointerLocked && gameState === 'playing');
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (isPointerLocked && gameState === 'playing') {
            yaw -= event.movementX * mouseSensitivity;
            pitch -= event.movementY * mouseSensitivity;
            
            // Pitch begrenzen (nicht über Kopf oder unter Füße schauen)
            pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
        }
    });
}

// ==========================================
// HIMMEL + UMGEBUNG (REALISTISCHER LOOK)
// ==========================================
function createSkyEnvironment() {
    if (!renderer) return;

    const size = 512;
    skyCanvas = document.createElement('canvas');
    skyCanvas.width = size;
    skyCanvas.height = size;
    skyCtx = skyCanvas.getContext('2d');

    skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.encoding = THREE.sRGBEncoding;
    skyTexture.mapping = THREE.EquirectangularReflectionMapping;
    skyTexture.needsUpdate = true;

    scene.background = skyTexture;

    updateSkyEnvironment(0.4, 0.2, 1.0, 0.0);
}

function updateSkyEnvironment(sunAngle, sunHeight, dayBlend, warmBlend) {
    if (!skyCtx || !skyCanvas) return;
    const size = skyCanvas.width;

    const nightTop = new THREE.Color(0x08121e);
    const nightMid = new THREE.Color(0x0b1b2e);
    const nightHorizon = new THREE.Color(0x18263a);

    const dayTop = new THREE.Color(0x6ea3e0);
    const dayMid = new THREE.Color(0xa6cbea);
    const dayHorizon = new THREE.Color(0xf0d7a3);

    const warmTop = new THREE.Color(0x8a5b9b);
    const warmMid = new THREE.Color(0xf0a565);
    const warmHorizon = new THREE.Color(0xf6c187);

    const top = nightTop.clone().lerp(dayTop, dayBlend).lerp(warmTop, warmBlend * 0.6);
    const mid = nightMid.clone().lerp(dayMid, dayBlend).lerp(warmMid, warmBlend * 0.8);
    const horizon = nightHorizon.clone().lerp(dayHorizon, dayBlend).lerp(warmHorizon, warmBlend);

    const grad = skyCtx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, `#${top.getHexString()}`);
    grad.addColorStop(0.5, `#${mid.getHexString()}`);
    grad.addColorStop(1, `#${horizon.getHexString()}`);
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, size, size);

    const sunX = size * (0.5 + Math.cos(sunAngle) * 0.25);
    const sunY = size * (0.6 - sunHeight * 0.35);
    const glowRadius = 140;
    const sunIntensity = Math.max(0, sunHeight) * 0.9 + 0.08;

    const sunGradient = skyCtx.createRadialGradient(sunX, sunY, 10, sunX, sunY, glowRadius);
    sunGradient.addColorStop(0, `rgba(255, 244, 214, ${0.9 * sunIntensity})`);
    sunGradient.addColorStop(0.2, `rgba(255, 210, 150, ${0.45 * sunIntensity})`);
    sunGradient.addColorStop(0.6, `rgba(255, 180, 120, ${0.18 * sunIntensity})`);
    sunGradient.addColorStop(1, 'rgba(255, 180, 120, 0)');
    skyCtx.fillStyle = sunGradient;
    skyCtx.fillRect(0, 0, size, size);

    skyTexture.needsUpdate = true;

    if (Math.abs(sunHeight - lastSkyHeight) > 0.05 || gameTime - lastEnvUpdate > 8) {
        lastSkyHeight = sunHeight;
        lastEnvUpdate = gameTime;
        if (skyEnvMap) {
            skyEnvMap.dispose();
            skyEnvMap = null;
        }
        const pmrem = new THREE.PMREMGenerator(renderer);
        skyEnvMap = pmrem.fromEquirectangular(skyTexture).texture;
        scene.environment = skyEnvMap;
        pmrem.dispose();
    }
}

function updateDayNightCycle() {
    if (!sunLight || !renderer || !scene) return;

    const dayPhase = (gameTime % DAY_LENGTH) / DAY_LENGTH;
    const sunAngle = dayPhase * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(sunAngle);

    const dayBlend = smoothstep(-0.08, 0.35, sunHeight);
    const warmBlend = Math.max(0, 1 - Math.abs(sunHeight) * 2.2);

    const sunDistance = 260;
    const sunY = 80 + sunHeight * 240;
    sunLight.position.set(Math.cos(sunAngle) * sunDistance, sunY, Math.sin(sunAngle) * sunDistance);

    const warmColor = new THREE.Color(0xffb36b);
    const noonColor = new THREE.Color(0xffffff);
    sunLight.color.copy(noonColor).lerp(warmColor, warmBlend);
    sunLight.intensity = 0.08 + dayBlend * 1.4;

    if (fillLight) {
        fillLight.color.lerpColors(new THREE.Color(0x1d2b4f), new THREE.Color(0x98b8e6), dayBlend);
        fillLight.intensity = 0.05 + dayBlend * 0.35;
    }

    if (ambientLight) {
        ambientLight.color.lerpColors(new THREE.Color(0x0c1420), new THREE.Color(0x404050), dayBlend);
        ambientLight.intensity = 0.08 + dayBlend * 0.32;
    }

    if (hemiLight) {
        hemiLight.color.lerpColors(new THREE.Color(0x091326), new THREE.Color(0x87CEEB), dayBlend);
        hemiLight.groundColor.lerpColors(new THREE.Color(0x0f1418), new THREE.Color(0x4a7c4a), dayBlend);
        hemiLight.intensity = 0.12 + dayBlend * 0.55;
    }

    if (scene.fog) {
        scene.fog.color.lerpColors(new THREE.Color(0x0b1525), new THREE.Color(0xb7d7f0), dayBlend);
        scene.fog.density = 0.0045 - dayBlend * 0.0012;
    }

    renderer.toneMappingExposure = 0.7 + dayBlend * 0.55;

    updateSkyEnvironment(sunAngle, sunHeight, dayBlend, warmBlend);

    const nightBlend = 1 - dayBlend;
    // Straßenlaternen
    if (streetLights.length) {
        streetLights.forEach((entry) => {
            if (entry.light) {
                entry.light.intensity = entry.baseIntensity * (0.15 + nightBlend);
            }
            if (entry.glass && entry.glass.material) {
                entry.glass.material.emissiveIntensity = entry.baseEmissive * (0.2 + nightBlend);
            }
        });
    }

    // Fensterlichter
    if (windowGlowMaterials.length) {
        windowGlowMaterials.forEach((entry) => {
            entry.material.emissiveIntensity = entry.baseIntensity * (0.2 + nightBlend);
        });
    }

    // Innenlicht
    if (interiorLights.length) {
        interiorLights.forEach((entry) => {
            entry.light.intensity = entry.baseIntensity * (0.35 + nightBlend);
        });
    }

    // Fahrzeuglichter
    if (vehicles.length) {
        vehicles.forEach((car) => {
            const headlights = car.userData && car.userData.headlights ? car.userData.headlights : [];
            headlights.forEach((h) => {
                h.mesh.material.emissiveIntensity = h.baseIntensity * (0.2 + nightBlend * 1.4);
            });
            const taillights = car.userData && car.userData.taillights ? car.userData.taillights : [];
            taillights.forEach((t) => {
                t.mesh.material.emissiveIntensity = t.baseIntensity * (0.3 + nightBlend * 1.2);
            });
        });
    }

    // Wasserfarbe leicht anpassen
    if (water && water.material && water.material.color) {
        const nightWater = new THREE.Color(0x0b2d45);
        const dayWater = new THREE.Color(0x1b6fa8);
        water.material.color.lerpColors(nightWater, dayWater, dayBlend);
    }
}

// ==========================================
// REALISTISCHE BELEUCHTUNG
// ==========================================
function setupLights() {
    // Ambient Light - wärmer für realistischen Look
    ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    scene.add(ambientLight);

    // Hauptsonne - warmes Nachmittagslicht
    sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sunLight.position.set(150, 260, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.left = -220;
    sunLight.shadow.camera.right = 220;
    sunLight.shadow.camera.top = 220;
    sunLight.shadow.camera.bottom = -220;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Fülllicht (bläulich vom Himmel)
    fillLight = new THREE.DirectionalLight(0x8899cc, 0.35);
    fillLight.position.set(-100, 120, -60);
    scene.add(fillLight);

    // Hemisphere Light für natürliche Umgebungsbeleuchtung
    hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4a7c4a, 0.5);
    scene.add(hemiLight);
}

// ==========================================
// WELT ERSTELLEN
// ==========================================
function createWorld() {
    windowGlowMaterials = [];
    interiorLights = [];
    streetLights = [];
    createWater();
    createMainland();
    createRiversAndLakes();
    createTerrainFeatures();
    createCity();
    createOutskirts();
    createIsland();
    createBoatSystem();
    createHouse();
    createSeaLife();
    createSeaBoats();
    createAliens();
    createPolice();
    createVehicles();
    createNPCs();      // Zivilisten
    createAnimals();   // Tiere
}

// ==========================================
// REALISTISCHES WASSER
// ==========================================
function createWaterNoiseTexture() {
    const small = document.createElement('canvas');
    small.width = 64;
    small.height = 64;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(64, 64);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = 140 + Math.random() * 80;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 18);
    return texture;
}

function createWater() {
    const waterGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 6, WORLD_SIZE * 6, 120, 120);

    waterNoiseMap = createWaterNoiseTexture();
    const waterMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1b6fa8,
        transparent: true,
        opacity: 0.9,
        roughness: 0.22,
        metalness: 0.12,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        reflectivity: 0.4
    });
    waterMaterial.bumpMap = waterNoiseMap;
    waterMaterial.bumpScale = 0.55;
    waterMaterial.envMapIntensity = 0.6;
    
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1;
    water.receiveShadow = true;
    scene.add(water);
}

// ==========================================
// RIESIGES FESTLAND (STADT)
// ==========================================
function createMainland() {
    // Großes Hauptland
    const mainlandGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 200, 200);
    const mainlandMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d2d2d,
        roughness: 0.9,
        metalness: 0.1
    });
    
    mainland = new THREE.Mesh(mainlandGeometry, mainlandMaterial);
    mainland.rotation.x = -Math.PI / 2;
    initRiverPath();
    applyTerrainToMainland(mainlandGeometry);
    mainland.position.set(0, 0, 0);
    mainland.receiveShadow = true;
    mainland.castShadow = true;
    scene.add(mainland);

    createParks();
}

function applyTerrainToMainland(geometry) {
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const height = getTerrainHeightAt(x, z);
        positions.setY(i, height);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
}

function initRiverPath() {
    const left = -WORLD_HALF + 120;
    const right = WORLD_HALF - 120;
    riverCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(left, RIVER_WATER_LEVEL, 260),
        new THREE.Vector3(-300, RIVER_WATER_LEVEL, 320),
        new THREE.Vector3(-60, RIVER_WATER_LEVEL, 250),
        new THREE.Vector3(180, RIVER_WATER_LEVEL, 320),
        new THREE.Vector3(right, RIVER_WATER_LEVEL, 260)
    ]);
    riverSamples = riverCurve.getPoints(140);
}

function getTerrainHeightAt(x, z) {
    const distanceFromCity = Math.sqrt(x * x + z * z);
    const cityRadius = CITY_BOUND + 40;
    const blend = smoothstep(cityRadius, cityRadius + 120, distanceFromCity);

    const base = terrainNoise(x, z);
    const edgeFactor = Math.max(0, (distanceFromCity - cityRadius) / (WORLD_HALF - cityRadius));
    const edgeRise = edgeFactor * edgeFactor * 18;
    const riverCut = getRiverDepthAt(x, z);
    const lakeCut = getLakeDepthAt(x, z);

    return base * blend + edgeRise - riverCut - lakeCut;
}

function getRiverDepthAt(x, z) {
    if (!riverSamples.length) return 0;
    let minDist = Infinity;
    for (let i = 0; i < riverSamples.length; i++) {
        const dx = x - riverSamples[i].x;
        const dz = z - riverSamples[i].z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) minDist = dist;
    }
    if (minDist > RIVER_WIDTH) return 0;
    const t = 1 - minDist / RIVER_WIDTH;
    return t * t * RIVER_DEPTH;
}

function getLakeDepthAt(x, z) {
    const dx = x - LAKE_CENTER.x;
    const dz = z - LAKE_CENTER.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > LAKE_RADIUS) return 0;
    const t = 1 - dist / LAKE_RADIUS;
    return t * t * LAKE_DEPTH;
}

function terrainNoise(x, z) {
    const nx = x / WORLD_SIZE;
    const nz = z / WORLD_SIZE;
    let h = 0;
    h += Math.sin(nx * Math.PI * 2) * 4;
    h += Math.cos(nz * Math.PI * 2) * 4;
    h += Math.sin((nx + nz) * Math.PI * 4) * 3;
    h += Math.cos(nx * Math.PI * 6 + nz * Math.PI * 3) * 2;
    h += Math.sin(nx * Math.PI * 10 - nz * Math.PI * 8) * 1.5;
    return h;
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function getTerrainSlopeAt(x, z) {
    const step = 4;
    const h0 = getTerrainHeightAt(x, z);
    const hx = getTerrainHeightAt(x + step, z);
    const hz = getTerrainHeightAt(x, z + step);
    const dx = Math.abs(hx - h0) / step;
    const dz = Math.abs(hz - h0) / step;
    return Math.max(dx, dz);
}

function isLandSuitable(x, z, maxSlope) {
    if (getRiverDepthAt(x, z) > 0 || getLakeDepthAt(x, z) > 0) return false;
    return getTerrainSlopeAt(x, z) <= maxSlope;
}

function createRiversAndLakes() {
    createRiverWater();
    createRiverBanks();
    createRiverBridges();
    createLakeWater();
}

function createRiverWater() {
    if (!riverCurve) return;
    const riverGeometry = new THREE.TubeGeometry(riverCurve, 140, RIVER_WIDTH * 0.45, 8, false);
    const riverMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x2a6c9b,
        roughness: 0.25,
        metalness: 0.15,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        transparent: true,
        opacity: 0.92
    });
    if (waterNoiseMap) {
        riverMaterial.bumpMap = waterNoiseMap;
        riverMaterial.bumpScale = 0.35;
        riverMaterial.envMapIntensity = 0.5;
    }
    const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial);
    riverMesh.castShadow = false;
    riverMesh.receiveShadow = true;
    scene.add(riverMesh);
}

function createLakeWater() {
    const lakeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x2f7aa8,
        roughness: 0.28,
        metalness: 0.12,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        transparent: true,
        opacity: 0.92
    });
    if (waterNoiseMap) {
        lakeMaterial.bumpMap = waterNoiseMap;
        lakeMaterial.bumpScale = 0.3;
        lakeMaterial.envMapIntensity = 0.5;
    }
    const lake = new THREE.Mesh(
        new THREE.CircleGeometry(LAKE_RADIUS, 36),
        lakeMaterial
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(LAKE_CENTER.x, LAKE_WATER_LEVEL, LAKE_CENTER.z);
    lake.receiveShadow = true;
    scene.add(lake);
}

function createRiverBanks() {
    if (!riverCurve || !riverSamples.length) return;
    const bankMaterial = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.95 });
    const segmentCount = 80;
    const step = Math.floor(riverSamples.length / segmentCount);

    for (let i = 0; i < riverSamples.length - step; i += step) {
        const t = i / (riverSamples.length - 1);
        const point = riverCurve.getPoint(t);
        const tangent = riverCurve.getTangent(t).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const segmentLength = RIVER_WIDTH * 0.9;
        const segmentWidth = 3.5;
        const offsets = [RIVER_WIDTH * 0.7, -RIVER_WIDTH * 0.7];

        offsets.forEach(offset => {
            const centerX = point.x + normal.x * offset;
            const centerZ = point.z + normal.z * offset;
            const groundHeight = getTerrainHeightAt(centerX, centerZ);

            const bank = new THREE.Mesh(
                new THREE.BoxGeometry(segmentWidth, 0.3, segmentLength),
                bankMaterial
            );
            bank.position.set(centerX, groundHeight + 0.15, centerZ);
            bank.rotation.y = Math.atan2(tangent.x, tangent.z);
            bank.receiveShadow = true;
            scene.add(bank);
        });
    }
}

function createRiverBridges() {
    if (!riverCurve) return;
    const bridgeStops = [0.32, 0.62];
    bridgeStops.forEach(t => createBridgeAtRiver(t));
}

function createBridgeAtRiver(t) {
    const point = riverCurve.getPoint(t);
    const tangent = riverCurve.getTangent(t).normalize();
    const rotationY = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;

    const bridgeWidth = RIVER_WIDTH * 2.4;
    const bridgeLength = 8;
    const bridgeY = getTerrainHeightAt(point.x, point.z) + 0.6;

    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(bridgeWidth, 0.4, bridgeLength),
        new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.9 })
    );
    deck.position.set(point.x, bridgeY, point.z);
    deck.rotation.y = rotationY;
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.85 });
    [-bridgeWidth / 2 + 0.6, bridgeWidth / 2 - 0.6].forEach(offset => {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.8, bridgeLength),
            railMat
        );
        const normalX = Math.cos(rotationY + Math.PI / 2);
        const normalZ = Math.sin(rotationY + Math.PI / 2);
        rail.position.set(point.x + normalX * offset, bridgeY + 0.6, point.z + normalZ * offset);
        rail.rotation.y = rotationY;
        scene.add(rail);
    });
}

// ==========================================
// PARKS
// ==========================================
function createParks() {
    const parkPositions = [
        { x: -150, z: -150, size: 40 },
        { x: 150, z: 150, size: 35 },
        { x: -100, z: 100, size: 30 },
        { x: 100, z: -100, size: 25 },
        { x: -260, z: 40, size: 55 },
        { x: 260, z: -40, size: 50 },
        { x: -40, z: 260, size: 45 },
        { x: 40, z: -260, size: 45 }
    ];

    parkPositions.forEach(park => {
        const grass = new THREE.Mesh(
            new THREE.BoxGeometry(park.size, 0.5, park.size),
            new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9 })
        );
        grass.position.set(park.x, getTerrainHeightAt(park.x, park.z) + 0.25, park.z);
        grass.receiveShadow = true;
        scene.add(grass);

        for (let i = 0; i < 8; i++) {
            const tree = createRealisticTree();
            tree.position.set(
                park.x + (Math.random() - 0.5) * park.size * 0.8,
                getTerrainHeightAt(park.x, park.z),
                park.z + (Math.random() - 0.5) * park.size * 0.8
            );
            scene.add(tree);
        }

        for (let i = 0; i < 3; i++) {
            const bench = createBench();
            bench.position.set(
                park.x + (Math.random() - 0.5) * park.size * 0.5,
                getTerrainHeightAt(park.x, park.z) + 0.2,
                park.z + (Math.random() - 0.5) * park.size * 0.5
            );
            bench.rotation.y = Math.random() * Math.PI;
            scene.add(bench);
        }
    });
}

function createBench() {
    const bench = new THREE.Group();
    
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), woodMaterial);
    seat.position.y = 0.5;
    seat.castShadow = true;
    bench.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.1), woodMaterial);
    back.position.set(0, 0.8, -0.2);
    back.castShadow = true;
    bench.add(back);

    [-0.8, 0.8].forEach(x => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), metalMaterial);
        leg.position.set(x, 0.25, 0);
        leg.castShadow = true;
        bench.add(leg);
    });

    return bench;
}

// ==========================================
// AUSSERHALB DER STADT (WAELDER, DORF, SEEN)
// ==========================================
function createOutskirts() {
    createForestRing();
    createVillage();
    createLakes();
    createRegionalPark();
}

function createTerrainFeatures() {
    const hills = [
        { x: -420, z: -140, r: 70, h: 18 },
        { x: 460, z: 160, r: 60, h: 15 },
        { x: -520, z: 320, r: 85, h: 22 },
        { x: 520, z: -340, r: 90, h: 26 }
    ];

    const mountains = [
        { x: -600, z: 0, r: 120, h: 38 },
        { x: 600, z: 60, r: 110, h: 34 },
        { x: 0, z: 620, r: 100, h: 30 }
    ];

    const valleys = [
        { x: -420, z: 480, r: 60, d: 10 },
        { x: 420, z: -480, r: 55, d: 9 }
    ];

    hills.forEach(h => createHill(h.x, h.z, h.r, h.h));
    mountains.forEach(m => createMountain(m.x, m.z, m.r, m.h));
    valleys.forEach(v => createValley(v.x, v.z, v.r, v.d));
}

function createHill(x, z, radius, height) {
    const hill = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 20),
        new THREE.MeshStandardMaterial({ color: 0x3b7d3b, roughness: 0.9 })
    );
    hill.position.set(x, height / 2 - 0.1, z);
    hill.castShadow = true;
    hill.receiveShadow = true;
    scene.add(hill);
}

function createMountain(x, z, radius, height) {
    const base = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 22),
        new THREE.MeshStandardMaterial({ color: 0x5b5b5b, roughness: 0.95 })
    );
    base.position.set(x, height / 2 - 0.2, z);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    const peak = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.45, height * 0.45, 16),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 })
    );
    peak.position.set(x, height * 0.8, z);
    peak.castShadow = true;
    scene.add(peak);
}

function createValley(x, z, radius, depth) {
    const valley = new THREE.Mesh(
        new THREE.ConeGeometry(radius, depth, 20, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x2e5c2e, roughness: 0.95, side: THREE.DoubleSide })
    );
    valley.position.set(x, -depth / 2, z);
    valley.rotation.x = Math.PI;
    scene.add(valley);
}

function createForestRing() {
    const forestPatches = [
        { x: -420, z: 260, radius: 90, trees: 45 },
        { x: 420, z: 320, radius: 80, trees: 40 },
        { x: -380, z: -320, radius: 85, trees: 42 },
        { x: 320, z: -420, radius: 90, trees: 48 },
        { x: 0, z: 480, radius: 100, trees: 55 },
        { x: 0, z: -480, radius: 100, trees: 55 }
    ];

    forestPatches.forEach(patch => {
        createForestPatch(patch.x, patch.z, patch.radius, patch.trees);
    });
}

function createForestPatch(centerX, centerZ, radius, treeCount) {
    const forestFloor = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 1.05, 36),
        new THREE.MeshStandardMaterial({ color: 0x1f5e1f, roughness: 0.95 })
    );
    forestFloor.rotation.x = -Math.PI / 2;
    forestFloor.position.set(centerX, getTerrainHeightAt(centerX, centerZ) + 0.02, centerZ);
    forestFloor.receiveShadow = true;
    scene.add(forestFloor);

    let spawned = 0;
    let tries = 0;
    while (spawned < treeCount && tries < treeCount * 6) {
        tries += 1;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const x = centerX + Math.cos(angle) * dist;
        const z = centerZ + Math.sin(angle) * dist;
        if (!isLandSuitable(x, z, 0.35)) continue;
        const tree = createRealisticTree();
        tree.position.set(x, getTerrainHeightAt(x, z), z);
        scene.add(tree);
        spawned += 1;
    }

    for (let i = 0; i < 10; i++) {
        const bush = new THREE.Mesh(
            new THREE.SphereGeometry(1.1, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.95 })
        );
        const angle = Math.random() * Math.PI * 2;
        const dist = radius * 0.8 + Math.random() * radius * 0.2;
        const x = centerX + Math.cos(angle) * dist;
        const z = centerZ + Math.sin(angle) * dist;
        bush.position.set(x, getTerrainHeightAt(x, z) + 0.6, z);
        bush.scale.y = 0.7;
        scene.add(bush);
    }
}

function createVillage() {
    const centerX = -360;
    const centerZ = 340;
    const houseCount = 10;

    for (let i = 0; i < houseCount; i++) {
        const angle = (i / houseCount) * Math.PI * 2;
        const dist = 35 + Math.random() * 18;
        const hx = centerX + Math.cos(angle) * dist;
        const hz = centerZ + Math.sin(angle) * dist;
        if (!isLandSuitable(hx, hz, 0.25)) continue;
        createResidentialHouse(hx, hz);
    }

    createVillageSquare(centerX, centerZ);

    for (let i = 0; i < 12; i++) {
        const tree = createRealisticTree();
        const x = centerX + (Math.random() - 0.5) * 120;
        const z = centerZ + (Math.random() - 0.5) * 120;
        if (!isLandSuitable(x, z, 0.35)) continue;
        tree.position.set(x, getTerrainHeightAt(x, z), z);
        scene.add(tree);
    }
}

function createVillageSquare(x, z) {
    const square = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.2, 30),
        new THREE.MeshStandardMaterial({ color: 0x9c7a4b, roughness: 0.9 })
    );
    square.position.set(x, getTerrainHeightAt(x, z) + 0.05, z);
    square.receiveShadow = true;
    scene.add(square);

    const well = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 1.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.8 })
    );
    well.position.set(x, getTerrainHeightAt(x, z) + 0.6, z);
    well.castShadow = true;
    scene.add(well);
}

function createLakes() {
    const lakes = [
        { x: -260, z: -320, radius: 30 },
        { x: 300, z: 260, radius: 26 },
        { x: -420, z: 40, radius: 22 },
        { x: 420, z: -60, radius: 24 }
    ];

    lakes.forEach(lake => {
        createLake(lake.x, lake.z, lake.radius);
    });
}

function createLake(x, z, radius) {
    const shore = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.85, radius * 1.15, 36),
        new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.95 })
    );
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(x, 0.03, z);
    shore.receiveShadow = true;
    scene.add(shore);

    const waterSurface = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 36),
        new THREE.MeshStandardMaterial({ color: 0x2e6f9e, roughness: 0.15, metalness: 0.4 })
    );
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.set(x, 0.05, z);
    scene.add(waterSurface);
}

function createRegionalPark() {
    const parkX = 340;
    const parkZ = -260;
    const parkSize = 120;

    const grass = new THREE.Mesh(
        new THREE.BoxGeometry(parkSize, 0.2, parkSize),
        new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 })
    );
    grass.position.set(parkX, getTerrainHeightAt(parkX, parkZ) + 0.1, parkZ);
    grass.receiveShadow = true;
    scene.add(grass);

    for (let i = 0; i < 20; i++) {
        const tree = createRealisticTree();
        const x = parkX + (Math.random() - 0.5) * parkSize * 0.85;
        const z = parkZ + (Math.random() - 0.5) * parkSize * 0.85;
        if (!isLandSuitable(x, z, 0.35)) continue;
        tree.position.set(x, getTerrainHeightAt(x, z), z);
        scene.add(tree);
    }

    const lake = new THREE.Mesh(
        new THREE.CircleGeometry(12, 28),
        new THREE.MeshStandardMaterial({ color: 0x3a78a0, roughness: 0.2, metalness: 0.3 })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(parkX - 25, getTerrainHeightAt(parkX - 25, parkZ + 10) + 0.12, parkZ + 10);
    scene.add(lake);
}

// ==========================================
// MEERESLEBEN UND BOOTE
// ==========================================
function createSeaLife() {
    seaCreatures = [];

    const fishCount = 45;
    const sharkCount = 6;
    for (let i = 0; i < fishCount; i++) {
        const fish = createFish();
        placeSeaCreature(fish, -0.6, WORLD_HALF * 2.2);
        fish.userData = {
            type: 'fish',
            speed: 0.15 + Math.random() * 0.1,
            angle: Math.random() * Math.PI * 2,
            radius: 8 + Math.random() * 20,
            center: fish.position.clone()
        };
        seaCreatures.push(fish);
        scene.add(fish);
    }

    for (let i = 0; i < sharkCount; i++) {
        const shark = createShark();
        placeSeaCreature(shark, -0.4, WORLD_HALF * 2.4);
        shark.userData = {
            type: 'shark',
            speed: 0.22 + Math.random() * 0.12,
            angle: Math.random() * Math.PI * 2,
            radius: 25 + Math.random() * 40,
            center: shark.position.clone()
        };
        seaCreatures.push(shark);
        scene.add(shark);
    }
}

function placeSeaCreature(creature, baseY, radiusLimit) {
    const angle = Math.random() * Math.PI * 2;
    const dist = MAINLAND_BOUND + 80 + Math.random() * radiusLimit;
    creature.position.set(
        Math.cos(angle) * dist,
        baseY,
        Math.sin(angle) * dist
    );
}

function createFish() {
    const fish = new THREE.Group();
    const colors = [0x4db6ac, 0xffcc80, 0x90caf9, 0xffab91, 0xa5d6a7];
    const bodyMat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.6 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 10), bodyMat);
    body.scale.set(1.4, 0.7, 0.6);
    fish.add(body);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 10), bodyMat);
    tail.position.set(-0.7, 0, 0);
    tail.rotation.z = Math.PI / 2;
    fish.add(tail);

    return fish;
}

function createShark() {
    const shark = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.4, metalness: 0.1 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 2.6, 12), bodyMat);
    body.rotation.z = Math.PI / 2;
    shark.add(body);

    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 10), bodyMat);
    fin.position.set(0.1, 0.45, 0);
    fin.rotation.x = Math.PI;
    shark.add(fin);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 10), bodyMat);
    tail.position.set(-1.4, 0, 0);
    tail.rotation.z = Math.PI / 2;
    shark.add(tail);

    return shark;
}

function createSeaBoats() {
    seaBoats = [];
    const boatCount = 6;
    for (let i = 0; i < boatCount; i++) {
        const boat = createSmallBoat();
        placeSeaBoat(boat);
        boat.userData = {
            speed: 0.12 + Math.random() * 0.08,
            direction: Math.random() * Math.PI * 2,
            turnRate: (Math.random() - 0.5) * 0.005
        };
        seaBoats.push(boat);
        scene.add(boat);
    }
}

function placeSeaBoat(boat) {
    const angle = Math.random() * Math.PI * 2;
    const dist = MAINLAND_BOUND + 120 + Math.random() * WORLD_HALF * 1.6;
    boat.position.set(Math.cos(angle) * dist, 1, Math.sin(angle) * dist);
    boat.rotation.y = angle + Math.PI / 2;
}

function createSmallBoat() {
    const boat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.6 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 6), hullMat);
    hull.castShadow = true;
    boat.add(hull);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 4.8), trimMat);
    deck.position.y = 0.5;
    boat.add(deck);

    return boat;
}

function updateSeaLife() {
    if (!seaCreatures.length) return;
    const time = gameTime;

    seaCreatures.forEach(creature => {
        const data = creature.userData;
        data.angle += data.speed * 0.01;
        const wobble = Math.sin(time * 1.5 + data.angle) * 0.6;
        const radius = data.radius + Math.sin(time + data.angle) * 2;

        creature.position.x = data.center.x + Math.cos(data.angle) * radius;
        creature.position.z = data.center.z + Math.sin(data.angle) * radius;
        creature.position.y += Math.sin(time * 2 + data.angle) * 0.002;

        creature.rotation.y = Math.atan2(
            Math.cos(data.angle) * radius,
            -Math.sin(data.angle) * radius
        );
        creature.rotation.z = wobble * 0.05;
    });
}

function updateSeaBoats() {
    if (!seaBoats.length) return;
    const time = gameTime;

    seaBoats.forEach(boat => {
        const data = boat.userData;
        data.direction += data.turnRate;
        boat.position.x += Math.cos(data.direction) * data.speed;
        boat.position.z += Math.sin(data.direction) * data.speed;

        const distFromCenter = Math.sqrt(boat.position.x * boat.position.x + boat.position.z * boat.position.z);
        if (distFromCenter < MAINLAND_BOUND + 60 || distFromCenter > WORLD_HALF * 2.8) {
            placeSeaBoat(boat);
        }

        boat.rotation.y = data.direction + Math.PI / 2;
        boat.position.y = 1 + Math.sin(time * 1.5 + data.direction) * 0.12;
        boat.rotation.z = Math.sin(time * 1.2 + data.direction) * 0.02;
    });
}

// ==========================================
// STADT MIT GEBÄUDEN
// ==========================================
function createCity() {
    buildings = [];
    buildingColliders = [];
    
    // Stadtzentrum mit Rathaus
    createTownHall(0, 0);
    
    // Kirche
    createChurch(-80, -80);
    
    // Krankenhaus
    createHospital(80, -60);
    
    // Schule
    createSchool(-70, 70);
    
    // Kindergarten
    createKindergarten(50, 80);
    
    // Polizeistation
    createPoliceStation(-120, 0);
    
    // Feuerwehr
    createFireStation(120, 0);
    
    // Einkaufszentrum
    createShoppingMall(0, -100);
    
    // Wohnhäuser in verschiedenen Bereichen
    const residentialAreas = [
        { x: -140, z: -140, count: 6 },
        { x: 140, z: -140, count: 6 },
        { x: -140, z: 140, count: 6 },
        { x: 140, z: 140, count: 6 },
        { x: 0, z: 130, count: 4 },
        { x: -100, z: 100, count: 4 },
        { x: 100, z: 100, count: 4 },
    ];
    
    residentialAreas.forEach(area => {
        for (let i = 0; i < area.count; i++) {
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetZ = (Math.random() - 0.5) * 40;
            createResidentialHouse(area.x + offsetX, area.z + offsetZ);
        }
    });
    
    // Bürogebäude
    createOfficeBuilding(60, 40);
    createOfficeBuilding(-60, 40);
    createOfficeBuilding(100, -120);
    createOfficeBuilding(-100, -120);
    
    // Parks mit Bäumen
    createPark(80, 130);
    createPark(-80, -130);
    
    createRoads();
}

// Rathaus
function createTownHall(x, z) {
    const building = new THREE.Group();
    
    // Hauptgebäude
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(30, 20, 25),
        new THREE.MeshStandardMaterial({ color: 0xDDD5C0, roughness: 0.6 })
    );
    main.position.y = 10;
    main.castShadow = true;
    building.add(main);
    
    // Turm
    const tower = new THREE.Mesh(
        new THREE.BoxGeometry(8, 35, 8),
        new THREE.MeshStandardMaterial({ color: 0xC9C0A8, roughness: 0.6 })
    );
    tower.position.set(0, 17.5, 0);
    tower.castShadow = true;
    building.add(tower);
    
    // Turmdach
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(6, 10, 4),
        new THREE.MeshStandardMaterial({ color: 0x2F4F4F, roughness: 0.5 })
    );
    roof.position.set(0, 40, 0);
    roof.rotation.y = Math.PI / 4;
    building.add(roof);
    
    // Uhr
    const clock = new THREE.Mesh(
        new THREE.CircleGeometry(2, 32),
        new THREE.MeshStandardMaterial({ color: 0xFFFFF0, side: THREE.DoubleSide })
    );
    clock.position.set(0, 30, 4.1);
    building.add(clock);
    
    // Säulen am Eingang
    for (let i = -2; i <= 2; i++) {
        const column = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.6, 8, 12),
            new THREE.MeshStandardMaterial({ color: 0xE8E0D0 })
        );
        column.position.set(i * 4, 4, 13);
        column.castShadow = true;
        building.add(column);
    }
    
    // Schild
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(10, 2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    sign.position.set(0, 15, 12.8);
    building.add(sign);
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 32, 27);
}

// Kirche
function createChurch(x, z) {
    const building = new THREE.Group();
    
    // Hauptgebäude
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(15, 18, 30),
        new THREE.MeshStandardMaterial({ color: 0xF5F5DC, roughness: 0.7 })
    );
    main.position.y = 9;
    main.castShadow = true;
    building.add(main);
    
    // Dach
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(17, 3, 32),
        new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.6 })
    );
    roof.position.y = 19;
    roof.rotation.z = 0;
    building.add(roof);
    
    // Glockenturm
    const tower = new THREE.Mesh(
        new THREE.BoxGeometry(8, 40, 8),
        new THREE.MeshStandardMaterial({ color: 0xE8E0D0, roughness: 0.6 })
    );
    tower.position.set(0, 20, -12);
    tower.castShadow = true;
    building.add(tower);
    
    // Turmspitze
    const spire = new THREE.Mesh(
        new THREE.ConeGeometry(5, 15, 4),
        new THREE.MeshStandardMaterial({ color: 0x2F4F4F, roughness: 0.5 })
    );
    spire.position.set(0, 47, -12);
    spire.rotation.y = Math.PI / 4;
    building.add(spire);
    
    // Kreuz
    const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 4, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8 })
    );
    crossV.position.set(0, 57, -12);
    building.add(crossV);
    
    const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8 })
    );
    crossH.position.set(0, 56, -12);
    building.add(crossH);
    
    // Fenster (Buntglas-Stil)
    const windowMat = new THREE.MeshStandardMaterial({ 
        color: 0x4169E1, 
        emissive: 0x4169E1, 
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
    });
    
    [-5, 0, 5].forEach(offset => {
        const window = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 6, 2),
            windowMat
        );
        window.position.set(7.6, 10, offset);
        building.add(window);
    });
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 17, 32);
}

// Krankenhaus
function createHospital(x, z) {
    const building = new THREE.Group();
    
    // Hauptgebäude
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(40, 25, 30),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 })
    );
    main.position.y = 12.5;
    main.castShadow = true;
    building.add(main);
    
    // Rotes Kreuz
    const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(2, 8, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xFF0000 })
    );
    crossV.position.set(0, 20, 15.3);
    building.add(crossV);
    
    const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(8, 2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xFF0000 })
    );
    crossH.position.set(0, 20, 15.3);
    building.add(crossH);
    
    // Notaufnahme-Vordach
    const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(15, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xFF0000 })
    );
    canopy.position.set(0, 6, 19);
    building.add(canopy);
    
    // Fensterreihen
    for (let floor = 0; floor < 5; floor++) {
        for (let w = 0; w < 8; w++) {
            const window = new THREE.Mesh(
                new THREE.BoxGeometry(3, 3, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x87CEEB, roughness: 0.1 })
            );
            window.position.set(-17 + w * 5, 5 + floor * 5, 15.1);
            building.add(window);
        }
    }
    
    // Schild "KRANKENHAUS"
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(20, 3, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x006400 })
    );
    sign.position.set(0, 3, 15.3);
    building.add(sign);
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 42, 32);
}

// Schule
function createSchool(x, z) {
    const building = new THREE.Group();
    
    // Hauptgebäude
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(50, 15, 25),
        new THREE.MeshStandardMaterial({ color: 0xCD853F, roughness: 0.7 })
    );
    main.position.y = 7.5;
    main.castShadow = true;
    building.add(main);
    
    // Dach
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(52, 2, 27),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6 })
    );
    roof.position.y = 16;
    building.add(roof);
    
    // Fenster
    for (let floor = 0; floor < 2; floor++) {
        for (let w = 0; w < 10; w++) {
            const window = new THREE.Mesh(
                new THREE.BoxGeometry(3, 4, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x87CEEB, roughness: 0.1 })
            );
            window.position.set(-22 + w * 5, 5 + floor * 6, 12.6);
            building.add(window);
        }
    }
    
    // Schulhof-Zaun (symbolisch)
    const fence = new THREE.Mesh(
        new THREE.BoxGeometry(60, 1.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    fence.position.set(0, 0.75, 20);
    building.add(fence);
    
    // Flaggenmast
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0xC0C0C0 })
    );
    pole.position.set(20, 6, 15);
    building.add(pole);
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 52, 27);
}

// Kindergarten
function createKindergarten(x, z) {
    const building = new THREE.Group();
    
    // Buntes Hauptgebäude
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(25, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0xFFEB3B, roughness: 0.6 })
    );
    main.position.y = 4;
    main.castShadow = true;
    building.add(main);
    
    // Buntes Dach
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(18, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xFF5722, roughness: 0.5 })
    );
    roof.position.y = 11;
    roof.rotation.y = Math.PI / 4;
    building.add(roof);
    
    // Bunte Fenster
    const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFF00FF];
    colors.forEach((color, i) => {
        const window = new THREE.Mesh(
            new THREE.CircleGeometry(1.5, 16),
            new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })
        );
        window.position.set(-8 + i * 5, 5, 10.1);
        building.add(window);
    });
    
    // Spielplatz-Schaukel
    const swingFrame = new THREE.Mesh(
        new THREE.BoxGeometry(6, 4, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xFF0000 })
    );
    swingFrame.position.set(0, 2, 18);
    building.add(swingFrame);
    
    // Sandkasten
    const sandbox = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.5, 5),
        new THREE.MeshStandardMaterial({ color: 0xF4A460 })
    );
    sandbox.position.set(-8, 0.25, 18);
    building.add(sandbox);
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 27, 22);
}

// Polizeistation
function createPoliceStation(x, z) {
    const building = new THREE.Group();
    
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(25, 12, 20),
        new THREE.MeshStandardMaterial({ color: 0x4169E1, roughness: 0.5 })
    );
    main.position.y = 6;
    main.castShadow = true;
    building.add(main);
    
    // Weißer Streifen
    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(25.1, 2, 20.1),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
    );
    stripe.position.y = 8;
    building.add(stripe);
    
    // "POLIZEI" Schild
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(12, 2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x00008B })
    );
    sign.position.set(0, 10, 10.2);
    building.add(sign);
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 27, 22);
}

// Feuerwehr
function createFireStation(x, z) {
    const building = new THREE.Group();
    
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(30, 15, 25),
        new THREE.MeshStandardMaterial({ color: 0xB22222, roughness: 0.5 })
    );
    main.position.y = 7.5;
    main.castShadow = true;
    building.add(main);
    
    // Große Tore
    for (let i = 0; i < 3; i++) {
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(6, 8, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x8B0000 })
        );
        door.position.set(-9 + i * 9, 4, 12.7);
        building.add(door);
    }
    
    // Turm
    const tower = new THREE.Mesh(
        new THREE.BoxGeometry(6, 25, 6),
        new THREE.MeshStandardMaterial({ color: 0xB22222 })
    );
    tower.position.set(12, 12.5, -8);
    tower.castShadow = true;
    building.add(tower);
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 32, 27);
}

// Einkaufszentrum
function createShoppingMall(x, z) {
    const building = new THREE.Group();
    
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(50, 12, 35),
        new THREE.MeshStandardMaterial({ color: 0xE0E0E0, roughness: 0.3, metalness: 0.2 })
    );
    main.position.y = 6;
    main.castShadow = true;
    building.add(main);
    
    // Glasfront
    const glass = new THREE.Mesh(
        new THREE.BoxGeometry(48, 10, 0.5),
        new THREE.MeshStandardMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.6,
            roughness: 0.1
        })
    );
    glass.position.set(0, 6, 17.5);
    building.add(glass);
    
    // Schriftzug
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(25, 3, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xFF4500 })
    );
    sign.position.set(0, 11, 17.8);
    building.add(sign);
    
    // Parkplatz-Markierungen
    for (let i = 0; i < 8; i++) {
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.05, 4),
            new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
        );
        line.position.set(-21 + i * 6, 0.03, 25);
        building.add(line);
    }
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 52, 37);
}

// Bürogebäude
function createOfficeBuilding(x, z) {
    const building = new THREE.Group();
    const floors = 8 + Math.floor(Math.random() * 8);
    const height = floors * 4;
    
    const colors = [0x4682B4, 0x708090, 0x2F4F4F, 0x556B2F];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(18, height, 18),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 })
    );
    main.position.y = height / 2;
    main.castShadow = true;
    building.add(main);
    
    // Glasfenster
    for (let floor = 0; floor < floors; floor++) {
        for (let side = 0; side < 4; side++) {
            for (let w = 0; w < 3; w++) {
                const window = new THREE.Mesh(
                    new THREE.BoxGeometry(side % 2 === 0 ? 4 : 0.2, 2.5, side % 2 === 0 ? 0.2 : 4),
                    new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.1, metalness: 0.9 })
                );
                const pos = { x: 0, y: 2 + floor * 4, z: 0 };
                if (side === 0) { pos.x = -6 + w * 6; pos.z = 9.1; }
                else if (side === 1) { pos.x = 9.1; pos.z = -6 + w * 6; }
                else if (side === 2) { pos.x = -6 + w * 6; pos.z = -9.1; }
                else { pos.x = -9.1; pos.z = -6 + w * 6; }
                window.position.set(pos.x, pos.y, pos.z);
                building.add(window);
            }
        }
    }
    
    building.position.set(x, 0, z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 20, 20);
}

// Wohnhaus
function createResidentialHouse(x, z) {
    const building = new THREE.Group();
    
    // Realistische Fassadenfarben
    const wallColors = [
        { base: 0xE8DCC8, trim: 0xFFFFF0 }, // Beige mit weißem Trim
        { base: 0xD4C4A8, trim: 0xF5F5F5 }, // Sandstein
        { base: 0xB8860B, trim: 0xFFF8DC }, // Dunkles Gold
        { base: 0xCD853F, trim: 0xFFFFE0 }, // Peru
        { base: 0xA0522D, trim: 0xFAF0E6 }, // Sienna (Backstein-ähnlich)
        { base: 0x8B7355, trim: 0xF5DEB3 }  // Braun
    ];
    const roofColors = [0x4A4A4A, 0x8B0000, 0x2F2F2F, 0x654321, 0x4A3728];
    
    const colorScheme = wallColors[Math.floor(Math.random() * wallColors.length)];
    const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
    const floors = 1 + Math.floor(Math.random() * 2);
    const height = 5 + floors * 3;
    const houseWidth = 10;
    const houseDepth = 12;
    
    // Fundament
    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth + 0.5, 0.8, houseDepth + 0.5),
        new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95 })
    );
    foundation.position.y = 0.4;
    foundation.castShadow = true;
    building.add(foundation);
    
    // Hauptwand mit Textur-Effekt
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: colorScheme.base, 
        roughness: 0.85,
        metalness: 0.02
    });
    
    const main = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth, height, houseDepth),
        wallMaterial
    );
    main.position.y = height / 2 + 0.8;
    main.castShadow = true;
    main.receiveShadow = true;
    building.add(main);
    
    // Wandverkleidung/Trim oben
    const topTrim = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth + 0.4, 0.3, houseDepth + 0.4),
        new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.6 })
    );
    topTrim.position.y = height + 0.8;
    building.add(topTrim);
    
    // Realistisches Dach mit Dachüberstand
    const roofGeom = new THREE.ConeGeometry(9, 5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ 
        color: roofColor, 
        roughness: 0.8,
        metalness: 0.1
    });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + 3.3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    building.add(roof);
    
    // Dachunterseite
    const roofBase = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth + 2, 0.3, houseDepth + 2),
        new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.7 })
    );
    roofBase.position.y = height + 0.95;
    building.add(roofBase);
    
    // Schornstein
    const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3.5, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 })
    );
    chimney.position.set(3, height + 4, -2);
    chimney.castShadow = true;
    building.add(chimney);
    
    // Türrahmen
    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 3.2, 0.15),
        new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.6 })
    );
    doorFrame.position.set(0, 2.4, houseDepth/2 + 0.08);
    building.add(doorFrame);
    
    // Tür mit Details
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5D3A1A, roughness: 0.7 });
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.8, 0.12),
        doorMat
    );
    door.position.set(0, 2.2, houseDepth/2 + 0.15);
    building.add(door);
    
    // Türgriff
    const doorHandle = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.8, roughness: 0.2 })
    );
    doorHandle.position.set(0.5, 2.2, houseDepth/2 + 0.25);
    building.add(doorHandle);
    
    // Vordach über der Tür
    const porch = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.2, 1.5),
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8 })
    );
    porch.position.set(0, 3.8, houseDepth/2 + 0.8);
    porch.castShadow = true;
    building.add(porch);
    
    // Vordach-Stützen
    [-1.2, 1.2].forEach(px => {
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8),
            new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.5 })
        );
        pillar.position.set(px, 2.2, houseDepth/2 + 1.3);
        building.add(pillar);
    });
    
    // Treppenstufen
    for (let s = 0; s < 2; s++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.25, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 })
        );
        step.position.set(0, 0.12 + s * 0.25, houseDepth/2 + 1.5 + s * 0.5);
        building.add(step);
    }
    
    // Fenster mit Rahmen und Tiefe
    const windowPositions = [
        { x: -3, front: true }, { x: 3, front: true },
        { x: -3, front: false }, { x: 3, front: false }
    ];
    
    windowPositions.forEach(wp => {
        for (let wy = 0; wy < floors; wy++) {
            const windowGroup = new THREE.Group();
            
            // Fensterrahmen (außen)
            const outerFrame = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 2.6, 0.1),
                new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.5 })
            );
            windowGroup.add(outerFrame);
            
            // Fensterbank
            const sill = new THREE.Mesh(
                new THREE.BoxGeometry(2.6, 0.15, 0.4),
                new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.6 })
            );
            sill.position.y = -1.25;
            sill.position.z = 0.15;
            windowGroup.add(sill);
            
            // Fensterglas mit leichter Spiegelung + Innenlicht
            const lightOn = Math.random() > 0.6;
            const glassMat = new THREE.MeshStandardMaterial({ 
                color: lightOn ? 0xFFE9B3 : 0x87CEEB, 
                emissive: lightOn ? 0x9c7a2c : 0x0b0f1a,
                emissiveIntensity: lightOn ? 0.5 : 0.1,
                roughness: 0.05, 
                metalness: 0.2,
                transparent: true,
                opacity: 0.8
            });
            glassMat.envMapIntensity = 0.7;
            windowGlowMaterials.push({ material: glassMat, baseIntensity: glassMat.emissiveIntensity });
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2.2, 0.05),
                glassMat
            );
            glass.position.z = -0.03;
            windowGroup.add(glass);
            
            // Fensterkreuz
            const crossV = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 2.2, 0.08),
                new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.5 })
            );
            crossV.position.z = 0.02;
            windowGroup.add(crossV);
            
            const crossH = new THREE.Mesh(
                new THREE.BoxGeometry(2, 0.08, 0.08),
                new THREE.MeshStandardMaterial({ color: colorScheme.trim, roughness: 0.5 })
            );
            crossH.position.z = 0.02;
            windowGroup.add(crossH);
            
            const zPos = wp.front ? houseDepth/2 + 0.1 : -(houseDepth/2 + 0.1);
            windowGroup.position.set(wp.x, 4.3 + wy * 4, zPos);
            if (!wp.front) windowGroup.rotation.y = Math.PI;
            building.add(windowGroup);
        }
    });
    
    // Seitenfenster
    [-1, 1].forEach(side => {
        for (let wy = 0; wy < floors; wy++) {
            const sideLight = Math.random() > 0.65;
            const sideGlassMat = new THREE.MeshStandardMaterial({ 
                color: sideLight ? 0xFFE9B3 : 0x87CEEB, 
                emissive: sideLight ? 0x9c7a2c : 0x0b0f1a,
                emissiveIntensity: sideLight ? 0.5 : 0.1,
                roughness: 0.05, 
                metalness: 0.2,
                transparent: true,
                opacity: 0.8
            });
            sideGlassMat.envMapIntensity = 0.7;
            windowGlowMaterials.push({ material: sideGlassMat, baseIntensity: sideGlassMat.emissiveIntensity });
            const sideWindow = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 1.8, 1.8),
                sideGlassMat
            );
            sideWindow.position.set(side * (houseWidth/2 + 0.05), 4.3 + wy * 4, 0);
            building.add(sideWindow);
        }
    });
    
    // Garten mit Gras
    const gardenGrass = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0x3A7D44, roughness: 0.95 })
    );
    gardenGrass.position.set(0, 0.07, houseDepth/2 + 6);
    gardenGrass.receiveShadow = true;
    building.add(gardenGrass);
    
    // Gehweg zur Tür
    const pathway = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.1, 4),
        new THREE.MeshStandardMaterial({ color: 0xA9A9A9, roughness: 0.9 })
    );
    pathway.position.set(0, 0.08, houseDepth/2 + 4);
    building.add(pathway);
    
    // Weißer Gartenzaun mit Pfosten
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.6 });
    [-7, 0, 7].forEach(fx => {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 1.2, 0.25),
            fenceMat
        );
        post.position.set(fx, 0.6, houseDepth/2 + 10);
        building.add(post);
    });
    
    // Zaunlatten
    for (let f = -6.5; f <= 6.5; f += 0.8) {
        const slat = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.9, 0.08),
            fenceMat
        );
        slat.position.set(f, 0.5, houseDepth/2 + 10);
        building.add(slat);
    }
    
    // Horizontale Zaunleisten
    [0.3, 0.7].forEach(hy => {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(14, 0.1, 0.08),
            fenceMat
        );
        rail.position.set(0, hy, houseDepth/2 + 9.9);
        building.add(rail);
    });
    
    // Briefkasten
    const mailbox = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    mailbox.position.set(2, 1.2, houseDepth/2 + 9.5);
    building.add(mailbox);
    
    const mailboxPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x2F2F2F, roughness: 0.5 })
    );
    mailboxPost.position.set(2, 0.6, houseDepth/2 + 9.5);
    building.add(mailboxPost);
    
    // Büsche vor dem Haus
    [-4, 4].forEach(bx => {
        const bush = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9 })
        );
        bush.position.set(bx, 0.6, houseDepth/2 + 2);
        bush.scale.y = 0.7;
        building.add(bush);
    });
    
    building.position.set(x, getTerrainHeightAt(x, z), z);
    scene.add(building);
    buildings.push(building);
    addBuildingCollider(x, z, 12, 14);
}

// Park mit Bäumen
function createPark(x, z) {
    // Grasfläche
    const grass = new THREE.Mesh(
        new THREE.BoxGeometry(40, 0.2, 40),
        new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9 })
    );
    grass.position.set(x, 0.1, z);
    grass.receiveShadow = true;
    scene.add(grass);
    
    // Bäume
    for (let i = 0; i < 8; i++) {
        const tree = createRealisticTree();
        tree.position.set(
            x + (Math.random() - 0.5) * 35,
            0,
            z + (Math.random() - 0.5) * 35
        );
        scene.add(tree);
    }
    
    // Bänke
    for (let i = 0; i < 3; i++) {
        const bench = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.8, 1),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        bench.position.set(x - 15 + i * 15, 0.4, z);
        scene.add(bench);
    }
    
    // Teich
    const pond = new THREE.Mesh(
        new THREE.CircleGeometry(6, 32),
        new THREE.MeshStandardMaterial({ color: 0x4169E1, roughness: 0.1 })
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(x + 10, 0.15, z - 10);
    scene.add(pond);
}

// Straßen erstellen
function createRoads() {
    // Realistischere Straßenmaterialien
    const asphaltMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2C2C2C, 
        roughness: 0.92,
        metalness: 0.02
    });
    const lineMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.5
    });
    const yellowLineMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700,
        roughness: 0.5
    });
    const sidewalkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xA0A0A0, 
        roughness: 0.85 
    });
    const curbMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080, 
        roughness: 0.8 
    });
    
    // Hauptstraßen (Nord-Süd)
    [-100, 0, 100].forEach(x => {
        // Straßenbelag
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(12, 0.1, 400),
            asphaltMaterial
        );
        road.position.set(x, 0.05, 0);
        road.receiveShadow = true;
        scene.add(road);
        
        // Gelbe Mittelstreifen (durchgezogen)
        const centerLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.11, 400),
            yellowLineMaterial
        );
        centerLine.position.set(x, 0.08, 0);
        scene.add(centerLine);
        
        // Gestrichelte weiße Fahrspurlinien
        [-3, 3].forEach(offset => {
            for (let z = -195; z < 195; z += 8) {
                const dashLine = new THREE.Mesh(
                    new THREE.BoxGeometry(0.12, 0.11, 3),
                    lineMaterial
                );
                dashLine.position.set(x + offset, 0.08, z);
                scene.add(dashLine);
            }
        });
        
        // Bordsteine
        [-6.2, 6.2].forEach(offset => {
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.2, 400),
                curbMaterial
            );
            curb.position.set(x + offset, 0.1, 0);
            scene.add(curb);
        });
        
        // Gehwege
        [-7.5, 7.5].forEach(offset => {
            const sidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 0.08, 400),
                sidewalkMaterial
            );
            sidewalk.position.set(x + offset, 0.04, 0);
            sidewalk.receiveShadow = true;
            scene.add(sidewalk);
        });
        
        // Straßenlaternen
        for (let z = -180; z <= 180; z += 40) {
            [-8, 8].forEach(offset => {
                createRoadStreetLight(x + offset, z);
            });
        }
    });
    
    // Hauptstraßen (Ost-West)
    [-100, 0, 100].forEach(z => {
        // Straßenbelag
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(400, 0.1, 12),
            asphaltMaterial
        );
        road.position.set(0, 0.05, z);
        road.receiveShadow = true;
        scene.add(road);
        
        // Gelbe Mittelstreifen
        const centerLine = new THREE.Mesh(
            new THREE.BoxGeometry(400, 0.11, 0.15),
            yellowLineMaterial
        );
        centerLine.position.set(0, 0.08, z);
        scene.add(centerLine);
        
        // Gestrichelte weiße Fahrspurlinien
        [-3, 3].forEach(offset => {
            for (let x = -195; x < 195; x += 8) {
                const dashLine = new THREE.Mesh(
                    new THREE.BoxGeometry(3, 0.11, 0.12),
                    lineMaterial
                );
                dashLine.position.set(x, 0.08, z + offset);
                scene.add(dashLine);
            }
        });
        
        // Bordsteine
        [-6.2, 6.2].forEach(offset => {
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(400, 0.2, 0.3),
                curbMaterial
            );
            curb.position.set(0, 0.1, z + offset);
            scene.add(curb);
        });
        
        // Gehwege
        [-7.5, 7.5].forEach(offset => {
            const sidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(400, 0.08, 2.5),
                sidewalkMaterial
            );
            sidewalk.position.set(0, 0.04, z + offset);
            sidewalk.receiveShadow = true;
            scene.add(sidewalk);
        });
    });
    
    // Zebrastreifen an Kreuzungen
    [-100, 0, 100].forEach(x => {
        [-100, 0, 100].forEach(z => {
            createCrosswalk(x, z);
        });
    });
}

// Straßenlaterne erstellen (entlang der Straßen in createRoads)
function createRoadStreetLight(x, z) {
    const light = new THREE.Group();
    
    // Pfosten
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x2F2F2F, roughness: 0.5, metalness: 0.7 })
    );
    pole.position.y = 2.5;
    pole.castShadow = true;
    light.add(pole);
    
    // Arm
    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x2F2F2F, roughness: 0.5, metalness: 0.7 })
    );
    arm.position.set(0, 4.8, 0.6);
    light.add(arm);
    
    // Lampengehäuse
    const lampHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    lampHousing.position.set(0, 4.7, 1.2);
    light.add(lampHousing);
    
    // Lampenglas (leuchtet)
    const lampGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.08, 0.45),
        new THREE.MeshStandardMaterial({ 
            color: 0xFFF8DC, 
            emissive: 0xFFA500,
            emissiveIntensity: 0.3,
            roughness: 0.2
        })
    );
    lampGlass.position.set(0, 4.6, 1.2);
    light.add(lampGlass);

    const lampLight = new THREE.PointLight(0xffd8a3, 0.9, 28, 2);
    lampLight.position.set(0, 4.6, 1.2);
    lampLight.castShadow = false;
    light.add(lampLight);
    
    light.position.set(x, 0, z);
    scene.add(light);
    streetLights.push({ light: lampLight, glass: lampGlass, baseIntensity: lampLight.intensity, baseEmissive: lampGlass.material.emissiveIntensity });
}

// Zebrastreifen erstellen
function createCrosswalk(x, z) {
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.6 });
    
    // Zebrastreifen Nord-Süd
    for (let i = -5; i <= 5; i += 1.2) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.11, 4),
            stripeMat
        );
        stripe.position.set(x + i, 0.08, z + 8);
        scene.add(stripe);
        
        const stripe2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.11, 4),
            stripeMat
        );
        stripe2.position.set(x + i, 0.08, z - 8);
        scene.add(stripe2);
    }
    
    // Zebrastreifen Ost-West
    for (let i = -5; i <= 5; i += 1.2) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.11, 0.6),
            stripeMat
        );
        stripe.position.set(x + 8, 0.08, z + i);
        scene.add(stripe);
        
        const stripe2 = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.11, 0.6),
            stripeMat
        );
        stripe2.position.set(x - 8, 0.08, z + i);
        scene.add(stripe2);
    }
}

// Gebäude-Kollision hinzufügen
function addBuildingCollider(x, z, width, depth) {
    buildingColliders.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2
    });
}

function addRectBuildingWallColliders(centerX, centerZ, width, depth, wallThickness, doorWidth) {
    const halfW = width / 2;
    const halfD = depth / 2;
    const thickness = wallThickness;

    // Seitenwände
    addBuildingCollider(centerX - halfW, centerZ, thickness, depth);
    addBuildingCollider(centerX + halfW, centerZ, thickness, depth);

    // Rückwand
    addBuildingCollider(centerX, centerZ - halfD, width, thickness);

    // Vorderwand mit Türöffnung
    if (doorWidth && doorWidth < width) {
        const sideWidth = (width - doorWidth) / 2;
        const offset = doorWidth / 2 + sideWidth / 2;
        const frontZ = centerZ + halfD;
        addBuildingCollider(centerX - offset, frontZ, sideWidth, thickness);
        addBuildingCollider(centerX + offset, frontZ, sideWidth, thickness);
    } else {
        addBuildingCollider(centerX, centerZ + halfD, width, thickness);
    }
}

function createRealisticBuilding() {
    const building = new THREE.Group();
    
    const width = 8 + Math.random() * 12;
    const depth = 8 + Math.random() * 12;
    const floors = 3 + Math.floor(Math.random() * 15);
    const height = floors * 4;
    
    const buildingType = Math.random();
    let mainColor;
    
    if (buildingType < 0.3) {
        mainColor = 0x4a6fa5;
    } else if (buildingType < 0.6) {
        mainColor = 0x95a5a6;
    } else if (buildingType < 0.8) {
        mainColor = 0xc0392b;
    } else {
        mainColor = 0xecf0f1;
    }

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.7, metalness: 0.1 })
    );
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    building.add(body);

    // Fenster
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x111122,
        emissiveIntensity: 0.1
    });

    for (let floor = 0; floor < floors; floor++) {
        const windowsPerFloor = Math.floor(width / 3) - 1;
        
        for (let w = 0; w < windowsPerFloor; w++) {
            // Vorderseite
            const windowFront = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 2, 0.2),
                windowMaterial
            );
            windowFront.position.set(-width/2 + 3 + w * 3, 2 + floor * 4, depth/2 + 0.1);
            building.add(windowFront);

            // Rückseite
            const windowBack = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 2, 0.2),
                windowMaterial
            );
            windowBack.position.set(-width/2 + 3 + w * 3, 2 + floor * 4, -depth/2 - 0.1);
            building.add(windowBack);
        }
    }

    // Tür
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 3.5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.3, metalness: 0.5 })
    );
    door.position.set(0, 1.75, depth/2 + 0.15);
    building.add(door);

    return building;
}

// ==========================================
// REALISTISCHE BÄUME
// ==========================================
function createRealisticTree() {
    const tree = new THREE.Group();
    
    // Verschiedene Baumtypen
    const treeType = Math.floor(Math.random() * 4);
    
    // Stammfarben mit Variation
    const barkColors = [0x3D2817, 0x4A3728, 0x5C4033, 0x6B4423];
    const trunkColor = barkColors[Math.floor(Math.random() * barkColors.length)];
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: trunkColor, 
        roughness: 0.95,
        metalness: 0.02
    });
    
    // Blattfarben mit Variation
    const leafColors = [0x228B22, 0x2E8B2E, 0x3CB371, 0x32CD32, 0x006400];
    const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
    const leafMaterial = new THREE.MeshStandardMaterial({ 
        color: leafColor, 
        roughness: 0.85,
        metalness: 0.0
    });
    
    if (treeType === 0) {
        // Großer Eichenbaum
        const trunkHeight = 4 + Math.random() * 2;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.6, trunkHeight, 10),
            trunkMaterial
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Wurzelansätze
        for (let r = 0; r < 5; r++) {
            const root = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.2, 0.8, 6),
                trunkMaterial
            );
            const angle = (r / 5) * Math.PI * 2;
            root.position.set(Math.cos(angle) * 0.4, 0.3, Math.sin(angle) * 0.4);
            root.rotation.x = Math.cos(angle) * 0.4;
            root.rotation.z = Math.sin(angle) * 0.4;
            tree.add(root);
        }
        
        // Hauptäste
        for (let b = 0; b < 3; b++) {
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.15, 1.5, 6),
                trunkMaterial
            );
            const angle = (b / 3) * Math.PI * 2 + Math.random() * 0.5;
            branch.position.set(
                Math.cos(angle) * 0.6,
                trunkHeight - 0.5,
                Math.sin(angle) * 0.6
            );
            branch.rotation.x = Math.sin(angle) * 0.6;
            branch.rotation.z = -Math.cos(angle) * 0.6;
            tree.add(branch);
        }
        
        // Laubkrone - mehrere überlappende Kugeln
        const crownPositions = [
            { x: 0, y: trunkHeight + 1.5, z: 0, r: 3 },
            { x: 1.2, y: trunkHeight + 1, z: 0.8, r: 2.2 },
            { x: -1, y: trunkHeight + 1.3, z: -0.6, r: 2 },
            { x: 0.5, y: trunkHeight + 2.5, z: -0.8, r: 1.8 },
            { x: -0.8, y: trunkHeight + 0.8, z: 1, r: 1.6 }
        ];
        
        crownPositions.forEach(pos => {
            const leafCluster = new THREE.Mesh(
                new THREE.DodecahedronGeometry(pos.r, 1),
                leafMaterial
            );
            leafCluster.position.set(pos.x, pos.y, pos.z);
            leafCluster.rotation.set(Math.random(), Math.random(), Math.random());
            leafCluster.castShadow = true;
            tree.add(leafCluster);
        });
        
    } else if (treeType === 1) {
        // Tannenbaum/Nadelbaum
        const trunkHeight = 5 + Math.random() * 2;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.4, trunkHeight, 8),
            trunkMaterial
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Tannenzweige in Schichten
        const pineColor = 0x1a5c1a;
        const pineMat = new THREE.MeshStandardMaterial({ color: pineColor, roughness: 0.85 });
        
        const layers = 5 + Math.floor(Math.random() * 2);
        for (let i = 0; i < layers; i++) {
            const layerHeight = trunkHeight * 0.4 + i * (trunkHeight * 0.5 / layers);
            const coneSize = 2.8 - i * 0.4;
            
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(coneSize, 2, 8),
                pineMat
            );
            cone.position.y = layerHeight + 1;
            cone.castShadow = true;
            tree.add(cone);
        }
        
        // Spitze
        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 1.5, 6),
            pineMat
        );
        tip.position.y = trunkHeight + layers * 0.8;
        tree.add(tip);
        
    } else if (treeType === 2) {
        // Birke
        const birkeMat = new THREE.MeshStandardMaterial({ 
            color: 0xF5F5DC, 
            roughness: 0.7 
        });
        
        const trunkHeight = 6 + Math.random() * 2;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 10),
            birkeMat
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Schwarze Streifen auf der Birke
        for (let s = 0; s < 8; s++) {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.08, 0.02),
                new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
            );
            stripe.position.set(0, 0.8 + s * 0.7 + Math.random() * 0.3, 0.17);
            stripe.rotation.y = Math.random() * Math.PI * 2;
            tree.add(stripe);
        }
        
        // Äste
        for (let b = 0; b < 4; b++) {
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.06, 1.5, 6),
                birkeMat
            );
            const angle = (b / 4) * Math.PI * 2;
            branch.position.set(
                Math.cos(angle) * 0.3,
                trunkHeight - 1 + b * 0.3,
                Math.sin(angle) * 0.3
            );
            branch.rotation.x = Math.sin(angle) * 0.8;
            branch.rotation.z = -Math.cos(angle) * 0.8;
            tree.add(branch);
        }
        
        // Hellgrüne Blätter
        const birkeLeafMat = new THREE.MeshStandardMaterial({ 
            color: 0x90EE90, 
            roughness: 0.8 
        });
        
        const crownPositions = [
            { x: 0, y: trunkHeight + 0.5, z: 0, r: 2 },
            { x: 0.8, y: trunkHeight, z: 0.5, r: 1.5 },
            { x: -0.7, y: trunkHeight + 0.3, z: -0.4, r: 1.3 }
        ];
        
        crownPositions.forEach(pos => {
            const leaves = new THREE.Mesh(
                new THREE.DodecahedronGeometry(pos.r, 1),
                birkeLeafMat
            );
            leaves.position.set(pos.x, pos.y, pos.z);
            leaves.castShadow = true;
            tree.add(leaves);
        });
        
    } else {
        // Ahorn/Ahornbaum
        const trunkHeight = 5 + Math.random();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.45, trunkHeight, 10),
            trunkMaterial
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Verzweigungen
        [-1, 1].forEach(side => {
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.12, 2, 6),
                trunkMaterial
            );
            branch.position.set(side * 0.8, trunkHeight - 0.5, 0);
            branch.rotation.z = -side * 0.8;
            tree.add(branch);
        });
        
        // Herbstfarben möglich
        const isAutumn = Math.random() > 0.7;
        const autumnColors = [0xFFA500, 0xFF6347, 0xDC143C, 0xB22222];
        const crownColor = isAutumn 
            ? autumnColors[Math.floor(Math.random() * autumnColors.length)] 
            : leafColor;
        const crownMat = new THREE.MeshStandardMaterial({ 
            color: crownColor, 
            roughness: 0.8 
        });
        
        // Runde Krone
        const crown = new THREE.Mesh(
            new THREE.DodecahedronGeometry(3, 1),
            crownMat
        );
        crown.position.y = trunkHeight + 2;
        crown.castShadow = true;
        tree.add(crown);
        
        // Zusätzliche Laubcluster
        for (let c = 0; c < 3; c++) {
            const cluster = new THREE.Mesh(
                new THREE.DodecahedronGeometry(1.5, 1),
                crownMat
            );
            const angle = (c / 3) * Math.PI * 2;
            cluster.position.set(
                Math.cos(angle) * 2,
                trunkHeight + 1 + Math.random(),
                Math.sin(angle) * 2
            );
            cluster.castShadow = true;
            tree.add(cluster);
        }
    }
    
    return tree;
}

// ==========================================
// GRÖßERE INSEL
// ==========================================
function createIsland() {
    // Hauptinsel - großer grüner Kern
    const islandGeometry = new THREE.CylinderGeometry(70, 75, 4, 64);
    const islandMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9 });
    island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.position.set(ISLAND_CENTER_X, 0, ISLAND_CENTER_Z);
    island.receiveShadow = true;
    island.castShadow = true;
    scene.add(island);

    // Strand-Ring (breiter, flacher Sandbereich statt Torus)
    const beachGeo = new THREE.CylinderGeometry(85, 88, 2, 64);
    const beachMat = new THREE.MeshStandardMaterial({ color: 0xF5DEB3, roughness: 0.95 });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.position.set(ISLAND_CENTER_X, -0.5, ISLAND_CENTER_Z);
    beach.receiveShadow = true;
    scene.add(beach);

    // Nasser Sand am Wasser
    const wetSand = new THREE.Mesh(
        new THREE.CylinderGeometry(87, 90, 1.5, 64),
        new THREE.MeshStandardMaterial({ color: 0xC2A676, roughness: 0.9 })
    );
    wetSand.position.set(ISLAND_CENTER_X, -1.2, ISLAND_CENTER_Z);
    wetSand.receiveShadow = true;
    scene.add(wetSand);

    // Felsen am Strand
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 65 + Math.random() * 18;
        const rock = createRock();
        rock.position.set(ISLAND_CENTER_X + Math.cos(angle) * distance, 0.5, ISLAND_CENTER_Z + Math.sin(angle) * distance);
        scene.add(rock);
    }

    // Palmen verteilt über die Insel
    for (let i = 0; i < 40; i++) {
        const palm = createPalmTree();
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 60;
        // Nicht zu nah an Gebäude-Positionen
        const px = ISLAND_CENTER_X + Math.cos(angle) * distance;
        const pz = ISLAND_CENTER_Z + Math.sin(angle) * distance;
        const distToHouse = Math.sqrt((px - ISLAND_CENTER_X) ** 2 + (pz - (-15)) ** 2);
        const distToVilla = Math.sqrt((px - (ISLAND_CENTER_X + 30)) ** 2 + (pz - 25) ** 2);
        if (distToHouse < 18 || distToVilla < 22) continue;
        palm.position.set(px, 2, pz);
        scene.add(palm);
    }

    // Tropische Pflanzen
    for (let i = 0; i < 50; i++) {
        const plant = createTropicalPlant();
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 65;
        plant.position.set(ISLAND_CENTER_X + Math.cos(angle) * distance, 2, ISLAND_CENTER_Z + Math.sin(angle) * distance);
        scene.add(plant);
    }

    // Blumen am Strand
    for (let i = 0; i < 30; i++) {
        const flower = createIslandFlower();
        const angle = Math.random() * Math.PI * 2;
        const distance = 55 + Math.random() * 15;
        flower.position.set(ISLAND_CENTER_X + Math.cos(angle) * distance, 1.5, ISLAND_CENTER_Z + Math.sin(angle) * distance);
        scene.add(flower);
    }

    createIslandDetails();
}

function createIslandFlower() {
    const flower = new THREE.Group();
    const colors = [0xff69b4, 0xff4500, 0xffd700, 0xff1493, 0x9370db];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x228B22 })
    );
    stem.position.y = 0.25;
    flower.add(stem);
    for (let i = 0; i < 5; i++) {
        const petal = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 6, 6),
            new THREE.MeshStandardMaterial({ color: color })
        );
        const a = (i / 5) * Math.PI * 2;
        petal.position.set(Math.cos(a) * 0.15, 0.55, Math.sin(a) * 0.15);
        flower.add(petal);
    }
    return flower;
}

function createIslandDetails() {
    // Sandweg vom Steg zum Haupthaus
    const pathLength = ISLAND_CENTER_X - ISLAND_DOCK_X + 5;
    const path = new THREE.Mesh(
        new THREE.BoxGeometry(pathLength, 0.15, 4.5),
        new THREE.MeshStandardMaterial({ color: 0xdac29b, roughness: 0.95 })
    );
    path.position.set(ISLAND_DOCK_X + pathLength / 2 - 4, 2.12, 0);
    path.receiveShadow = true;
    scene.add(path);

    // Weg zur Villa (abzweigend)
    const villaPath = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.15, 40),
        new THREE.MeshStandardMaterial({ color: 0xdac29b, roughness: 0.95 })
    );
    villaPath.position.set(ISLAND_CENTER_X + 10, 2.12, 10);
    villaPath.receiveShadow = true;
    scene.add(villaPath);

    // Kleine Feuerstelle am Strand
    const firePit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.6, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 })
    );
    firePit.position.set(ISLAND_CENTER_X - 20, 2.2, 30);
    scene.add(firePit);

    // Feuer-Licht
    const fireLight = new THREE.PointLight(0xff6600, 0.8, 12);
    fireLight.position.set(ISLAND_CENTER_X - 20, 3.5, 30);
    scene.add(fireLight);

    // Steine um Feuerstelle
    for (let i = 0; i < 8; i++) {
        const stone = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 1),
            new THREE.MeshStandardMaterial({ color: 0x6d6d6d, roughness: 0.9 })
        );
        const angle = (i / 8) * Math.PI * 2;
        stone.position.set(ISLAND_CENTER_X - 20 + Math.cos(angle) * 1.8, 2.3, 30 + Math.sin(angle) * 1.8);
        scene.add(stone);
    }

    // Sitzblöcke um Feuerstelle
    for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.35, 2, 8),
            new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 })
        );
        const angle = (i / 4) * Math.PI * 2 + 0.3;
        log.position.set(ISLAND_CENTER_X - 20 + Math.cos(angle) * 3.5, 2.4, 30 + Math.sin(angle) * 3.5);
        log.rotation.z = Math.PI / 2;
        scene.add(log);
    }

    // Hängematte zwischen Palmen
    const hammockPole1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
    );
    hammockPole1.position.set(ISLAND_CENTER_X + 40, 4, -20);
    scene.add(hammockPole1);
    
    const hammockPole2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
    );
    hammockPole2.position.set(ISLAND_CENTER_X + 46, 4, -20);
    scene.add(hammockPole2);
    
    const hammock = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.1, 2),
        new THREE.MeshStandardMaterial({ color: 0xff6347, roughness: 0.8 })
    );
    hammock.position.set(ISLAND_CENTER_X + 43, 3.5, -20);
    scene.add(hammock);

    // Kleine Strandbar
    const barBase = new THREE.Mesh(
        new THREE.BoxGeometry(5, 1.2, 2),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    barBase.position.set(ISLAND_CENTER_X - 35, 2.6, -15);
    scene.add(barBase);

    const barRoof = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: 0x228B22 })
    );
    barRoof.position.set(ISLAND_CENTER_X - 35, 5, -15);
    scene.add(barRoof);

    // Barhocker
    for (let i = 0; i < 3; i++) {
        const stool = new THREE.Group();
        const seat = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 0.15, 12),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        seat.position.y = 1;
        stool.add(seat);
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 1, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        leg.position.y = 0.5;
        stool.add(leg);
        stool.position.set(ISLAND_CENTER_X - 35 + (i - 1) * 1.8, 2, -17);
        scene.add(stool);
    }
}

function createRock() {
    const rock = new THREE.Group();
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95 });

    for (let i = 0; i < 3; i++) {
        const size = 0.5 + Math.random() * 1;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 1), rockMaterial);
        stone.position.set((Math.random() - 0.5) * 1.5, size * 0.5, (Math.random() - 0.5) * 1.5);
        stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        stone.castShadow = true;
        rock.add(stone);
    }

    return rock;
}

function createPalmTree() {
    const palm = new THREE.Group();

    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 4, 0.5),
        new THREE.Vector3(0.5, 8, 0)
    );
    
    const trunk = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 20, 0.3, 8, false),
        new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 })
    );
    trunk.castShadow = true;
    palm.add(trunk);

    // Kokosnüsse
    for (let i = 0; i < 3; i++) {
        const coconut = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a3728 })
        );
        coconut.position.set(0.5 + Math.random() * 0.3, 7.5, (Math.random() - 0.5) * 0.5);
        palm.add(coconut);
    }

    // Palmblätter
    const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        side: THREE.DoubleSide,
        roughness: 0.7
    });

    for (let i = 0; i < 8; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1, 4), leafMaterial);
        leaf.position.set(0.5, 8, 0);
        leaf.rotation.y = (i / 8) * Math.PI * 2;
        leaf.rotation.x = 0.8;
        palm.add(leaf);
    }

    return palm;
}

function createTropicalPlant() {
    const plant = new THREE.Group();
    
    const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x32CD32,
        side: THREE.DoubleSide,
        roughness: 0.6
    });

    for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1), leafMaterial);
        leaf.rotation.y = (i / 6) * Math.PI * 2;
        leaf.rotation.x = -0.5;
        leaf.position.y = 0.3;
        plant.add(leaf);
    }

    return plant;
}

// ==========================================
// BOOT SYSTEM
// ==========================================
function createBoatSystem() {
    const dockMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
    
    boatDock = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 15), dockMaterial);
    boatDock.position.set(MAINLAND_DOCK_X, 1.5, 0);
    boatDock.castShadow = true;
    scene.add(boatDock);

    // Hafenpfeiler
    for (let i = -1; i <= 1; i++) {
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0x3d2817 })
        );
        pillar.position.set(MAINLAND_DOCK_X + 4, 0, i * 6);
        pillar.castShadow = true;
        scene.add(pillar);
    }

    islandDock = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 15), dockMaterial);
    islandDock.position.set(ISLAND_DOCK_X, 1.5, 0);
    islandDock.castShadow = true;
    scene.add(islandDock);

    createDockDetails(boatDock, false);
    createDockDetails(islandDock, true);
    createMainlandHarborArea();
    createIslandHarborArea();

    createBoat();
}

function createBoat() {
    boat = new THREE.Group();

    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.65 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.55 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x4a6670, roughness: 0.1, transparent: true, opacity: 0.6 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 9), hullMat);
    hull.position.y = 0.6;
    hull.castShadow = true;
    boat.add(hull);

    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.2, 12), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0.4, 6.2);
    boat.add(bow);

    const stern = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 12), hullMat);
    stern.rotation.x = -Math.PI / 2;
    stern.position.set(0, 0.45, -6.1);
    boat.add(stern);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 6.2), trimMat);
    deck.position.y = 1.2;
    boat.add(deck);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.6), trimMat);
    cabin.position.set(0, 1.8, 0.8);
    cabin.castShadow = true;
    boat.add(cabin);

    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.05), glassMat);
    frontWindow.position.set(0, 2.0, 2.1);
    boat.add(frontWindow);

    const leftWindow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.4), glassMat);
    leftWindow.position.set(-1.1, 2.0, 0.8);
    boat.add(leftWindow);

    const rightWindow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.4), glassMat);
    rightWindow.position.set(1.1, 2.0, 0.8);
    boat.add(rightWindow);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    [-2.1, 2.1].forEach(x => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 6.6), railMat);
        rail.position.set(x, 1.5, -0.2);
        boat.add(rail);
    });

    const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.05, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x4a3000, roughness: 0.6 })
    );
    wheel.position.set(0.8, 1.7, 1.7);
    wheel.rotation.x = Math.PI / 2;
    boat.add(wheel);

    boat.position.set(BOAT_ISLAND_X, 1, 0); // Boot startet bei der Insel
    scene.add(boat);
}

function createDockDetails(dockMesh, isIsland) {
    const dockGroup = new THREE.Group();
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.95 });

    const extension = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 12), plankMat);
    extension.position.set(0, -0.2, -8);
    dockGroup.add(extension);

    for (let i = -3; i <= 3; i += 3) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 3.2, 8), postMat);
        post.position.set(i, -1.2, -13);
        post.castShadow = true;
        dockGroup.add(post);
    }

    for (let z = -2; z >= -10; z -= 4) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.15, 1.2), plankMat);
        plank.position.set(0, 0.2, z);
        dockGroup.add(plank);
    }

    if (isIsland) {
        const hut = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 2), plankMat);
        hut.position.set(-3, 1.0, 2.5);
        hut.castShadow = true;
        dockGroup.add(hut);
    } else {
        const crane = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3.5, 8), postMat);
        crane.position.set(3.2, 1.4, 3.5);
        dockGroup.add(crane);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.2), postMat);
        arm.position.set(3.2, 3.1, 2.3);
        dockGroup.add(arm);
    }

    dockGroup.position.copy(dockMesh.position);
    scene.add(dockGroup);
}

function createMainlandHarborArea() {
    const baseX = MAINLAND_DOCK_X - 18;
    const baseZ = -8;
    const ground = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.2, 18),
        new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.9 })
    );
    ground.position.set(baseX, 0.05, baseZ);
    ground.receiveShadow = true;
    scene.add(ground);

    for (let i = 0; i < 6; i++) {
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 1.2, 1.4),
            new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 })
        );
        crate.position.set(baseX - 8 + Math.random() * 10, 0.7, baseZ - 5 + Math.random() * 8);
        crate.castShadow = true;
        scene.add(crate);
    }

    for (let i = 0; i < 3; i++) {
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, 1.4, 12),
            new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 })
        );
        barrel.position.set(baseX + 6 + Math.random() * 4, 0.7, baseZ + 3 + Math.random() * 4);
        barrel.castShadow = true;
        scene.add(barrel);
    }

    const kiosk = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 2.4, 3.5),
        new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.7 })
    );
    kiosk.position.set(baseX - 2, 1.2, baseZ + 6);
    kiosk.castShadow = true;
    scene.add(kiosk);

    const kioskRoof = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.4, 4.2),
        new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.6 })
    );
    kioskRoof.position.set(baseX - 2, 2.6, baseZ + 6);
    scene.add(kioskRoof);

    const bench = createBench();
    bench.position.set(baseX + 2, 0.1, baseZ + 8);
    bench.rotation.y = Math.PI / 2;
    scene.add(bench);

    for (let i = 0; i < 2; i++) {
        const lamp = createHarborLamp();
        lamp.position.set(baseX + 12, 0, baseZ - 6 + i * 8);
        scene.add(lamp);
    }
}

function createIslandHarborArea() {
    const baseX = ISLAND_DOCK_X + 15;
    const baseZ = -4;
    const sand = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.2, 14),
        new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.95 })
    );
    sand.position.set(baseX, 2.05, baseZ);
    sand.receiveShadow = true;
    scene.add(sand);

    for (let i = 0; i < 6; i++) {
        const palm = createPalmTree();
        palm.position.set(baseX - 8 + Math.random() * 16, 2.5, baseZ - 5 + Math.random() * 10);
        scene.add(palm);
    }
}

function createHarborLamp() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.4, metalness: 0.6 });
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.5, 8), poleMat);
    pole.position.y = 2.2;
    pole.castShadow = true;
    lamp.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), poleMat);
    arm.position.set(0, 4.2, 0.6);
    lamp.add(arm);

    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })
    );
    housing.position.set(0, 4.1, 1.1);
    lamp.add(housing);

    const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.08, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xfff3c1, emissive: 0xffe082, emissiveIntensity: 0.4 })
    );
    light.position.set(0, 4.0, 1.1);
    lamp.add(light);

    const bulb = new THREE.PointLight(0xffe2a8, 0.8, 22, 2);
    bulb.position.set(0, 4.0, 1.1);
    lamp.add(bulb);
    streetLights.push({ light: bulb, glass: light, baseIntensity: bulb.intensity, baseEmissive: light.material.emissiveIntensity });

    return lamp;
}

// ==========================================
// HAUS AUF DER INSEL (BEGEHBAR MIT 3 STOCKWERKEN)
// ==========================================
let alienPrisons = [];
let insideHouse = false;
let storageChest = null;
let chestItems = [];
let chestOpen = false;
let villa = null;

function createHouse() {
    house = new THREE.Group();
    alienPrisons = [];

    const houseX = ISLAND_CENTER_X;
    const houseZ = -15;
    const floorY = 2;
    const FLOOR_HEIGHT = 4;
    const WALL_THICK = 0.4;
    const HOUSE_W = 22;
    const HOUSE_D = 18;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xFFFACD, roughness: 0.8 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 });

    // ======= FUNDAMENT =======
    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(HOUSE_W + 2, 1, HOUSE_D + 2),
        stoneMat
    );
    foundation.position.y = 0.5;
    foundation.castShadow = true;
    house.add(foundation);

    // ======= 3 STOCKWERKE BAUEN =======
    for (let floor = 0; floor < 3; floor++) {
        const baseY = 1 + floor * FLOOR_HEIGHT;

        // Boden
        const floorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(HOUSE_W, 0.3, HOUSE_D),
            floorMat
        );
        floorMesh.position.y = baseY + 0.15;
        floorMesh.receiveShadow = true;
        house.add(floorMesh);

        // Rückwand
        const bw = new THREE.Mesh(new THREE.BoxGeometry(HOUSE_W, FLOOR_HEIGHT, WALL_THICK), wallMat);
        bw.position.set(0, baseY + FLOOR_HEIGHT / 2, -HOUSE_D / 2);
        bw.castShadow = true;
        house.add(bw);

        // Linke Wand
        const lw = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, FLOOR_HEIGHT, HOUSE_D), wallMat);
        lw.position.set(-HOUSE_W / 2, baseY + FLOOR_HEIGHT / 2, 0);
        lw.castShadow = true;
        house.add(lw);

        // Rechte Wand
        const rw = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, FLOOR_HEIGHT, HOUSE_D), wallMat);
        rw.position.set(HOUSE_W / 2, baseY + FLOOR_HEIGHT / 2, 0);
        rw.castShadow = true;
        house.add(rw);

        // Vorderwand mit Türöffnung (nur EG) oder komplett
        if (floor === 0) {
            // Links von Tür
            const fwl = new THREE.Mesh(new THREE.BoxGeometry(7, FLOOR_HEIGHT, WALL_THICK), wallMat);
            fwl.position.set(-7.5, baseY + FLOOR_HEIGHT / 2, HOUSE_D / 2);
            house.add(fwl);
            // Rechts von Tür
            const fwr = new THREE.Mesh(new THREE.BoxGeometry(7, FLOOR_HEIGHT, WALL_THICK), wallMat);
            fwr.position.set(7.5, baseY + FLOOR_HEIGHT / 2, HOUSE_D / 2);
            house.add(fwr);
            // Über Tür
            const fwt = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, WALL_THICK), wallMat);
            fwt.position.set(0, baseY + FLOOR_HEIGHT - 0.6, HOUSE_D / 2);
            house.add(fwt);
        } else {
            // Fenster in Vorderwand
            const fwl2 = new THREE.Mesh(new THREE.BoxGeometry(8, FLOOR_HEIGHT, WALL_THICK), wallMat);
            fwl2.position.set(-7, baseY + FLOOR_HEIGHT / 2, HOUSE_D / 2);
            house.add(fwl2);
            const fwr2 = new THREE.Mesh(new THREE.BoxGeometry(8, FLOOR_HEIGHT, WALL_THICK), wallMat);
            fwr2.position.set(7, baseY + FLOOR_HEIGHT / 2, HOUSE_D / 2);
            house.add(fwr2);
            const fwt2 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, WALL_THICK), wallMat);
            fwt2.position.set(0, baseY + FLOOR_HEIGHT - 0.75, HOUSE_D / 2);
            house.add(fwt2);
            const fwb2 = new THREE.Mesh(new THREE.BoxGeometry(6, 1, WALL_THICK), wallMat);
            fwb2.position.set(0, baseY + 0.5, HOUSE_D / 2);
            house.add(fwb2);
            // Fenster Glas
            const windowLight = Math.random() > 0.55;
            const windowMat = new THREE.MeshStandardMaterial({
                color: windowLight ? 0xFFE9B3 : 0x87CEEB,
                emissive: windowLight ? 0x9c7a2c : 0x0b0f1a,
                emissiveIntensity: windowLight ? 0.5 : 0.1,
                transparent: true,
                opacity: 0.45,
                roughness: 0.08,
                metalness: 0.2
            });
            windowMat.envMapIntensity = 0.6;
            windowGlowMaterials.push({ material: windowMat, baseIntensity: windowMat.emissiveIntensity });
            const winGlass = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.5, 0.1),
                windowMat);
            winGlass.position.set(0, baseY + 2, HOUSE_D / 2 + 0.2);
            house.add(winGlass);
        }

        // Seitenfenster
        const sideWindowLight = Math.random() > 0.6;
        const winMat = new THREE.MeshStandardMaterial({
            color: sideWindowLight ? 0xFFE9B3 : 0x87CEEB,
            emissive: sideWindowLight ? 0x9c7a2c : 0x0b0f1a,
            emissiveIntensity: sideWindowLight ? 0.45 : 0.1,
            transparent: true,
            opacity: 0.45,
            roughness: 0.08,
            metalness: 0.2
        });
        winMat.envMapIntensity = 0.6;
        windowGlowMaterials.push({ material: winMat, baseIntensity: winMat.emissiveIntensity });
        [-1, 1].forEach(side => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 2.5), winMat);
            win.position.set(side * (HOUSE_W / 2 + 0.1), baseY + 2.2, -2);
            house.add(win);
            const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 2.5), winMat);
            win2.position.set(side * (HOUSE_W / 2 + 0.1), baseY + 2.2, 4);
            house.add(win2);
        });

        // Innenbeleuchtung pro Stockwerk
        const light = new THREE.PointLight(0xffcc77, 0.8, 18);
        light.position.set(0, baseY + 3.5, 0);
        house.add(light);
        interiorLights.push({ light, baseIntensity: light.intensity });

        // ======= TREPPE ZUM NÄCHSTEN STOCKWERK =======
        if (floor < 2) {
            const stairMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
            for (let s = 0; s < 10; s++) {
                const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.8), stairMat);
                step.position.set(HOUSE_W / 2 - 2, baseY + 0.3 + s * (FLOOR_HEIGHT / 10), -HOUSE_D / 2 + 1.5 + s * 0.8);
                step.castShadow = true;
                house.add(step);
            }
            // Treppengeländer
            const railing = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 1.2, HOUSE_D - 4),
                new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
            );
            railing.position.set(HOUSE_W / 2 - 3.3, baseY + FLOOR_HEIGHT / 2 + 0.6, 0);
            house.add(railing);
        }
    }

    // ======= DACH =======
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(17, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.7 })
    );
    roof.position.y = 1 + 3 * 4 + 3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // Schornstein
    const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x8B0000 })
    );
    chimney.position.set(5, 1 + 3 * 4 + 5, 3);
    chimney.castShadow = true;
    house.add(chimney);

    // ======= EG: GEFÄNGNISSE + TRUHE =======
    const prisonPositions = [
        { x: -7, z: -5 },
        { x: -3, z: -5 },
        { x: 3, z: -5 },
        { x: 7, z: -5 },
        { x: -7, z: 3 }
    ];

    prisonPositions.forEach((pos, index) => {
        const prison = createAlienPrison(index);
        prison.position.set(pos.x, 1.15, pos.z);
        house.add(prison);
        alienPrisons.push({
            mesh: prison,
            localPos: pos,
            worldX: houseX + pos.x,
            worldZ: houseZ + pos.z,
            hasAlien: false,
            alienMesh: prison.getObjectByName('prisonAlien')
        });
    });

    // Truhe (Lager) im EG
    storageChest = createStorageChest();
    storageChest.position.set(7, 1.15, 4);
    house.add(storageChest);

    // Tisch im EG
    const table = createWoodTable();
    table.position.set(0, 1.15, 3);
    house.add(table);

    // ======= 1. OG: SCHLAFZIMMER =======
    const bed = createBed();
    bed.position.set(-6, 5.15, -4);
    house.add(bed);

    // Nachttisch
    const nightstand = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.8, 1),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    nightstand.position.set(-3.5, 5.55, -5);
    house.add(nightstand);
    // Lampe auf Nachttisch
    const nsLamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa000, emissiveIntensity: 0.3 })
    );
    nsLamp.position.set(-3.5, 6.2, -5);
    house.add(nsLamp);

    // Kleiderschrank 1. OG
    const wardrobe = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    wardrobe.position.set(6, 6.65, -7.5);
    house.add(wardrobe);

    // Teppich 1.OG
    const carpet = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.05, 4),
        new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.95 })
    );
    carpet.position.set(-3, 5.2, 2);
    house.add(carpet);

    // Zweite Truhe 1. OG
    const chest2 = createStorageChest();
    chest2.position.set(6, 5.15, 4);
    house.add(chest2);

    // ======= 2. OG: BÜRO/BEOBACHTUNGSRAUM =======
    // Schreibtisch
    const desk = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1, 2),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    desk.position.set(0, 9.65, -6);
    house.add(desk);

    // Stuhl vor Schreibtisch
    const chair = createChair();
    chair.position.set(0, 9.15, -4);
    house.add(chair);

    // Bücherregal 2. OG
    const bookshelf = createBookshelf();
    bookshelf.position.set(-8, 9.15, -2);
    house.add(bookshelf);

    // Fernrohr / Teleskop
    const telescope = createTelescope();
    telescope.position.set(5, 9.15, 5);
    house.add(telescope);

    // ======= VERANDA =======
    const veranda = new THREE.Mesh(
        new THREE.BoxGeometry(HOUSE_W + 4, 0.3, 6),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
    );
    veranda.position.set(0, 1.15, HOUSE_D / 2 + 3);
    veranda.castShadow = true;
    house.add(veranda);

    // Stufen zur Tür
    for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(5, 0.3, 1),
            stoneMat
        );
        step.position.set(0, 0.15 + i * 0.3, HOUSE_D / 2 + 6.5 + i);
        step.castShadow = true;
        house.add(step);
    }

    // Veranda-Geländer
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e0 });
    [-1, 1].forEach(side => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 6), railMat);
        rail.position.set(side * (HOUSE_W / 2 + 1.8), 1.9, HOUSE_D / 2 + 3);
        house.add(rail);
    });
    const frontRailL = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.15), railMat);
    frontRailL.position.set(-8, 1.9, HOUSE_D / 2 + 5.8);
    house.add(frontRailL);
    const frontRailR = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.15), railMat);
    frontRailR.position.set(8, 1.9, HOUSE_D / 2 + 5.8);
    house.add(frontRailR);

    // Willkommens-Schild
    const signPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3000 })
    );
    signPost.position.set(-10, 2, HOUSE_D / 2 + 8);
    house.add(signPost);
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 1.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    sign.position.set(-10, 3.2, HOUSE_D / 2 + 8);
    house.add(sign);

    house.position.set(houseX, floorY, houseZ);
    scene.add(house);

    // Kollisionen für Hauswände (Türöffnung bleibt frei)
    const wallCollider = WALL_THICK + 0.4;
    addRectBuildingWallColliders(houseX, houseZ, HOUSE_W, HOUSE_D, wallCollider, 8);

    // ======= ZWEITE VILLA =======
    createVilla();
}

// ======= MÖBEL-HELFER =======
function createBed() {
    const bed = new THREE.Group();
    // Bettrahmen
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.5, 3),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    frame.position.y = 0.25;
    bed.add(frame);
    // Matratze
    const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.4, 2.6),
        new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 })
    );
    mattress.position.y = 0.7;
    bed.add(mattress);
    // Kissen
    const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.3, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xadd8e6, roughness: 0.9 })
    );
    pillow.position.set(0, 0.95, -0.8);
    bed.add(pillow);
    // Decke
    const blanket = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.15, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x4169e1, roughness: 0.9 })
    );
    blanket.position.set(0, 0.95, 0.3);
    bed.add(blanket);
    // Kopfteil
    const headboard = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    headboard.position.set(0, 1.0, -1.35);
    bed.add(headboard);
    return bed;
}

function createStorageChest() {
    const chest = new THREE.Group();
    // Basis
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    base.position.y = 0.5;
    chest.add(base);
    // Deckel
    const lid = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.3, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x4a2f15, roughness: 0.7 })
    );
    lid.position.y = 1.15;
    chest.add(lid);
    // Metallverzierung
    const band1 = new THREE.Mesh(
        new THREE.BoxGeometry(2.15, 0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.8, roughness: 0.3 })
    );
    band1.position.set(0, 0.7, 0.62);
    chest.add(band1);
    const band2 = band1.clone();
    band2.position.set(0, 0.3, 0.62);
    chest.add(band2);
    // Schloss
    const lock = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 })
    );
    lock.position.set(0, 1.0, 0.66);
    chest.add(lock);
    chest.userData.isChest = true;
    return chest;
}

function createWoodTable() {
    const table = new THREE.Group();
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.2, 2),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
    );
    top.position.y = 1;
    table.add(top);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e });
    [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), legMat);
        leg.position.set(x, 0.5, z);
        table.add(leg);
    });
    return table;
}

function createChair() {
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.15, 1),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
    );
    seat.position.y = 0.6;
    chair.add(seat);
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    back.position.set(0, 1.1, -0.42);
    chair.add(back);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e });
    [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), legMat);
        leg.position.set(x, 0.3, z);
        chair.add(leg);
    });
    return chair;
}

function createBookshelf() {
    const shelf = new THREE.Group();
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 3, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
    );
    frame.position.y = 1.5;
    shelf.add(frame);
    // Bücher
    const bookColors = [0x8B0000, 0x00008B, 0x006400, 0x8B8B00, 0x4B0082];
    for (let r = 0; r < 3; r++) {
        for (let b = 0; b < 4; b++) {
            const book = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.8, 0.5),
                new THREE.MeshStandardMaterial({ color: bookColors[(r * 4 + b) % bookColors.length] })
            );
            book.position.set(-0.8 + b * 0.5, 0.5 + r * 1, 0);
            shelf.add(book);
        }
    }
    return shelf;
}

function createTelescope() {
    const tele = new THREE.Group();
    // Stativ
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
    for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), legMat);
        const a = (i / 3) * Math.PI * 2;
        leg.position.set(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5);
        leg.rotation.x = Math.cos(a) * 0.2;
        leg.rotation.z = Math.sin(a) * 0.2;
        tele.add(leg);
    }
    // Rohr
    const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.2, 1.5, 12),
        new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.6 })
    );
    tube.position.y = 2.2;
    tube.rotation.x = 0.5;
    tele.add(tube);
    return tele;
}

// ==========================================
// GROSSE VILLA (ZWEITES GEBÄUDE)
// ==========================================
function createVilla() {
    villa = new THREE.Group();
    const VW = 28; // Breite
    const VD = 22; // Tiefe
    const FLOOR_H = 4;
    const WALL_T = 0.4;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5ebe0, roughness: 0.7 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f4f4f, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2110, roughness: 0.7 });

    // ======= KELLER (unterirdisch) =======
    // Kellerboden
    const basementFloor = new THREE.Mesh(new THREE.BoxGeometry(VW, 0.3, VD), tileMat);
    basementFloor.position.y = -3.85;
    villa.add(basementFloor);

    // Kellerwände
    const kellerWallH = 4;
    const bkw = new THREE.Mesh(new THREE.BoxGeometry(VW, kellerWallH, WALL_T),
        new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 }));
    bkw.position.set(0, -2, -VD / 2);
    villa.add(bkw);
    const lkw = bkw.clone(); lkw.rotation.y = Math.PI / 2;
    lkw.position.set(-VW / 2, -2, 0);
    lkw.geometry = new THREE.BoxGeometry(WALL_T, kellerWallH, VD);
    villa.add(lkw);
    const rkw = lkw.clone();
    rkw.position.set(VW / 2, -2, 0);
    villa.add(rkw);
    const fkw = bkw.clone();
    fkw.position.set(0, -2, VD / 2);
    villa.add(fkw);

    // Kellerbeleuchtung
    const kellerLight = new THREE.PointLight(0xffffff, 0.6, 20);
    kellerLight.position.set(0, -0.5, 0);
    villa.add(kellerLight);
    interiorLights.push({ light: kellerLight, baseIntensity: kellerLight.intensity });

    // ===== TRAININGSRAUM IM KELLER =====
    // Boxsack
    const punchBag = new THREE.Group();
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 }));
    chain.position.y = -0.5;
    punchBag.add(chain);
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 1.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.9 }));
    bag.position.y = -1.8;
    punchBag.add(bag);
    punchBag.position.set(-8, 0, -5);
    villa.add(punchBag);

    // Hantelbank
    const bench = new THREE.Group();
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 3), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    benchSeat.position.y = -3;
    bench.add(benchSeat);
    const benchLegs = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
    [[-0.4, -1.2], [-0.4, 1.2], [0.4, -1.2], [0.4, 1.2]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), benchLegs);
        leg.position.set(x, -3.5, z);
        bench.add(leg);
    });
    // Hantelstange
    const barbell = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9 }));
    barbell.position.set(0, -2.2, -1.2);
    barbell.rotation.x = Math.PI / 2;
    bench.add(barbell);
    // Gewichte
    [-1.3, 1.3].forEach(z => {
        const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7 }));
        weight.position.set(0, -2.2, -1.2 + z);
        bench.add(weight);
    });
    bench.position.set(3, 0, -3);
    villa.add(bench);

    // Laufband
    const treadmill = new THREE.Group();
    const tBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x222222 }));
    tBase.position.y = -3.55;
    treadmill.add(tBase);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 3),
        new THREE.MeshStandardMaterial({ color: 0x333333 }));
    belt.position.y = -3.35;
    treadmill.add(belt);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    panel.position.set(0, -2.5, -1.7);
    treadmill.add(panel);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x003300, emissiveIntensity: 0.5 }));
    screen.position.set(0, -2.3, -1.75);
    treadmill.add(screen);
    treadmill.position.set(-3, 0, 5);
    villa.add(treadmill);

    // Spiegel an der Wand
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.95, roughness: 0.05 }));
    mirror.position.set(0, -2, -VD / 2 + 0.3);
    villa.add(mirror);

    // Kellertreppe nach oben
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
    for (let s = 0; s < 10; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.8), stairMat);
        step.position.set(VW / 2 - 2, -3.7 + s * 0.4, -VD / 2 + 1.5 + s * 0.9);
        villa.add(step);
    }

    // ======= EG: WOHNZIMMER + KÜCHE =======
    // EG Boden
    const egFloor = new THREE.Mesh(new THREE.BoxGeometry(VW, 0.3, VD), floorMat);
    egFloor.position.y = 0.15;
    villa.add(egFloor);

    // EG Wände
    const egWalls = (baseY) => {
        const bw = new THREE.Mesh(new THREE.BoxGeometry(VW, FLOOR_H, WALL_T), wallMat);
        bw.position.set(0, baseY + FLOOR_H / 2, -VD / 2); villa.add(bw);
        const lw = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, FLOOR_H, VD), wallMat);
        lw.position.set(-VW / 2, baseY + FLOOR_H / 2, 0); villa.add(lw);
        const rw = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, FLOOR_H, VD), wallMat);
        rw.position.set(VW / 2, baseY + FLOOR_H / 2, 0); villa.add(rw);
        // Vorderwand mit Tür
        const fwl = new THREE.Mesh(new THREE.BoxGeometry(9, FLOOR_H, WALL_T), wallMat);
        fwl.position.set(-9.5, baseY + FLOOR_H / 2, VD / 2); villa.add(fwl);
        const fwr = new THREE.Mesh(new THREE.BoxGeometry(9, FLOOR_H, WALL_T), wallMat);
        fwr.position.set(9.5, baseY + FLOOR_H / 2, VD / 2); villa.add(fwr);
        const fwt = new THREE.Mesh(new THREE.BoxGeometry(10, 1, WALL_T), wallMat);
        fwt.position.set(0, baseY + FLOOR_H - 0.5, VD / 2); villa.add(fwt);
    };
    egWalls(0);

    // Trennwand Wohnzimmer / Küche
    const divider = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, FLOOR_H, VD * 0.4), wallMat);
    divider.position.set(0, FLOOR_H / 2, -VD / 2 + VD * 0.4 / 2);
    villa.add(divider);

    // ------ WOHNZIMMER (linke Seite) ------
    // Sofa
    const sofa = createSofa();
    sofa.position.set(-8, 0.3, 2);
    villa.add(sofa);

    // Couchtisch
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x2f1b0e, roughness: 0.4, metalness: 0.1 }));
    coffeeTable.position.set(-8, 0.55, 5);
    villa.add(coffeeTable);

    // TV an der Wand
    const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 }));
    tvScreen.position.set(-8, 3, -VD / 2 + 0.5);
    villa.add(tvScreen);
    const tvGlow = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.1, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x112244, emissiveIntensity: 0.3 }));
    tvGlow.position.set(-8, 3, -VD / 2 + 0.35);
    villa.add(tvGlow);

    // Bilder an der Wand
    const picColors = [0x2e86ab, 0xa23b72, 0xf18f01, 0xc73e1d];
    for (let i = 0; i < 3; i++) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.1), darkWoodMat);
        frame.position.set(-VW / 2 + 0.3, 2.8, -4 + i * 4);
        frame.rotation.y = Math.PI / 2;
        villa.add(frame);
        const canvas = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 0.05),
            new THREE.MeshStandardMaterial({ color: picColors[i] }));
        canvas.position.set(-VW / 2 + 0.15, 2.8, -4 + i * 4);
        canvas.rotation.y = Math.PI / 2;
        villa.add(canvas);
    }

    // Stehlampe Wohnzimmer
    const standLamp = createStandLamp();
    standLamp.position.set(-12, 0.3, -2);
    villa.add(standLamp);

    // Teppich
    const livingRug = new THREE.Mesh(new THREE.BoxGeometry(8, 0.04, 6),
        new THREE.MeshStandardMaterial({ color: 0x704214, roughness: 0.95 }));
    livingRug.position.set(-8, 0.35, 3);
    villa.add(livingRug);

    // ------ KÜCHE (rechte Seite) ------
    // Küchenzeile
    const counter = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.3 }));
    counter.position.set(8, 0.9, -VD / 2 + 1.2);
    villa.add(counter);

    // Oberschränke
    const upperCab = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 0.8), woodMat);
    upperCab.position.set(8, 3.2, -VD / 2 + 0.6);
    villa.add(upperCab);

    // Herd
    const stove = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2 }));
    stove.position.set(6, 1.55, -VD / 2 + 1.2);
    villa.add(stove);
    // Heizplatten
    [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(([x, z]) => {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12),
            new THREE.MeshStandardMaterial({ color: 0x333333 }));
        plate.position.set(6 + x, 1.6, -VD / 2 + 1.2 + z);
        villa.add(plate);
    });

    // Kühlschrank
    const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.3, metalness: 0.2 }));
    fridge.position.set(12, 1.8, -VD / 2 + 1);
    villa.add(fridge);
    const fridgeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 }));
    fridgeHandle.position.set(12.8, 2, -VD / 2 + 1.7);
    villa.add(fridgeHandle);

    // Esstisch
    const diningTable = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2.5), woodMat);
    diningTable.position.set(8, 1.1, 3);
    villa.add(diningTable);
    const dTableLegs = new THREE.MeshStandardMaterial({ color: 0x3b2110 });
    [[-1.6, -0.9], [1.6, -0.9], [-1.6, 0.9], [1.6, 0.9]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), dTableLegs);
        leg.position.set(8 + x, 0.55, 3 + z);
        villa.add(leg);
    });
    // Stühle am Esstisch
    for (let i = 0; i < 4; i++) {
        const ch = createChair();
        const side = i < 2 ? -1 : 1;
        ch.position.set(8 + (i % 2 === 0 ? -1.2 : 1.2), 0.3, 3 + side * 1.8);
        ch.rotation.y = side > 0 ? Math.PI : 0;
        villa.add(ch);
    }

    // EG Licht (warm)
    const egLight = new THREE.PointLight(0xffe4b5, 1, 25);
    egLight.position.set(0, 3.5, 0);
    villa.add(egLight);
    const egLight2 = new THREE.PointLight(0xffe4b5, 0.6, 15);
    egLight2.position.set(-8, 3.5, 3);
    villa.add(egLight2);
    interiorLights.push({ light: egLight, baseIntensity: egLight.intensity });
    interiorLights.push({ light: egLight2, baseIntensity: egLight2.intensity });

    // EG Treppe nach oben
    for (let s = 0; s < 10; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.8), stairMat);
        step.position.set(VW / 2 - 2, 0.3 + s * 0.4, -VD / 2 + 1.5 + s * 0.9);
        villa.add(step);
    }

    // ======= 1. OG =======
    const og1Y = FLOOR_H;
    const og1Floor = new THREE.Mesh(new THREE.BoxGeometry(VW, 0.3, VD), floorMat);
    og1Floor.position.y = og1Y + 0.15;
    villa.add(og1Floor);

    // OG1 Wände
    ['back', 'left', 'right', 'front'].forEach(side => {
        let w;
        if (side === 'back') {
            w = new THREE.Mesh(new THREE.BoxGeometry(VW, FLOOR_H, WALL_T), wallMat);
            w.position.set(0, og1Y + FLOOR_H / 2, -VD / 2);
        } else if (side === 'left') {
            w = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, FLOOR_H, VD), wallMat);
            w.position.set(-VW / 2, og1Y + FLOOR_H / 2, 0);
        } else if (side === 'right') {
            w = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, FLOOR_H, VD), wallMat);
            w.position.set(VW / 2, og1Y + FLOOR_H / 2, 0);
        } else {
            w = new THREE.Mesh(new THREE.BoxGeometry(VW, FLOOR_H, WALL_T), wallMat);
            w.position.set(0, og1Y + FLOOR_H / 2, VD / 2);
        }
        villa.add(w);
    });

    // Fenster OG1
    const villaLight = Math.random() > 0.55;
    const winMat = new THREE.MeshStandardMaterial({
        color: villaLight ? 0xFFE9B3 : 0x87CEEB,
        emissive: villaLight ? 0x9c7a2c : 0x0b0f1a,
        emissiveIntensity: villaLight ? 0.5 : 0.1,
        transparent: true,
        opacity: 0.45,
        roughness: 0.08,
        metalness: 0.2
    });
    winMat.envMapIntensity = 0.6;
    windowGlowMaterials.push({ material: winMat, baseIntensity: winMat.emissiveIntensity });
    [[-8, -VD / 2], [4, -VD / 2], [-8, VD / 2], [4, VD / 2]].forEach(([x, z]) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.1), winMat);
        win.position.set(x, og1Y + 2.2, z + (z > 0 ? 0.3 : -0.3));
        villa.add(win);
    });

    // OG1 Licht
    const og1Light = new THREE.PointLight(0xffe4b5, 0.8, 20);
    og1Light.position.set(0, og1Y + 3.5, 0);
    villa.add(og1Light);
    interiorLights.push({ light: og1Light, baseIntensity: og1Light.intensity });

    // Schlafzimmer OG1
    const villaBed = createBed();
    villaBed.position.set(-8, og1Y + 0.3, -5);
    villa.add(villaBed);

    // Nachttisch
    const vns = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), woodMat);
    vns.position.set(-4.5, og1Y + 0.7, -6);
    villa.add(vns);

    // Badezimmer-Bereich (einfach)
    const bathtub = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.2 }));
    bathtub.position.set(8, og1Y + 0.7, -7);
    villa.add(bathtub);

    // Sofa OG1
    const villaSofa = createSofa();
    villaSofa.position.set(-4, og1Y + 0.3, 5);
    villaSofa.rotation.y = Math.PI;
    villa.add(villaSofa);

    // Bilder OG1
    for (let i = 0; i < 2; i++) {
        const fr = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 0.1), darkWoodMat);
        fr.position.set(-VW / 2 + 0.3, og1Y + 2.5, -3 + i * 8);
        fr.rotation.y = Math.PI / 2;
        villa.add(fr);
        const cv = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.05),
            new THREE.MeshStandardMaterial({ color: [0x3a86a1, 0xd4a017][i] }));
        cv.position.set(-VW / 2 + 0.15, og1Y + 2.5, -3 + i * 8);
        cv.rotation.y = Math.PI / 2;
        villa.add(cv);
    }

    // Treppe OG1→OG2 (nicht gebaut, es gibt kein OG2 - Villa hat nur Keller+EG+OG1)

    // ======= DACH =======
    const villaRoof = new THREE.Mesh(
        new THREE.ConeGeometry(20, 5, 4),
        roofMat
    );
    villaRoof.position.y = og1Y + FLOOR_H + 2.5;
    villaRoof.rotation.y = Math.PI / 4;
    villaRoof.castShadow = true;
    villa.add(villaRoof);

    // Balkon OG1 (vorne)
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 3), woodMat);
    balcony.position.set(0, og1Y + 0.15, VD / 2 + 1.5);
    villa.add(balcony);
    // Balkongeländer
    const bRailMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e0 });
    const bRailFront = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 0.12), bRailMat);
    bRailFront.position.set(0, og1Y + 0.8, VD / 2 + 2.8);
    villa.add(bRailFront);
    [-3.9, 3.9].forEach(x => {
        const bSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 3), bRailMat);
        bSide.position.set(x, og1Y + 0.8, VD / 2 + 1.5);
        villa.add(bSide);
    });

    // Außen: Veranda
    const villaVeranda = new THREE.Mesh(new THREE.BoxGeometry(VW + 4, 0.3, 5), woodMat);
    villaVeranda.position.set(0, 0.15, VD / 2 + 2.5);
    villa.add(villaVeranda);

    // Stufen
    for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 1),
            new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 }));
        step.position.set(0, -0.85 + i * 0.35, VD / 2 + 5 + i);
        villa.add(step);
    }

    // Außenlampen
    [-VW / 2 - 1, VW / 2 + 1].forEach(x => {
        const lamp = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333 }));
        pole.position.y = 1.5;
        lamp.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xfff5e6, emissive: 0xffe082, emissiveIntensity: 0.6 }));
        bulb.position.y = 3.2;
        lamp.add(bulb);
        const ll = new THREE.PointLight(0xffe082, 0.5, 10);
        ll.position.y = 3.2;
        lamp.add(ll);
        lamp.position.set(x, 0, VD / 2 + 3);
        villa.add(lamp);
    });

    // Position der Villa auf der Insel
    villa.position.set(ISLAND_CENTER_X + 30, 2, 25);
    scene.add(villa);

    // Kollisionen für Villa-Wände (Türöffnung frei lassen)
    const villaWallCollider = WALL_T + 0.4;
    addRectBuildingWallColliders(villa.position.x, villa.position.z, VW, VD, villaWallCollider, 10);
}

function createSofa() {
    const sofa = new THREE.Group();
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x4a6741, roughness: 0.85 });
    // Sitzfläche
    const seat = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 2), sofaMat);
    seat.position.y = 0.5;
    sofa.add(seat);
    // Rückenlehne
    const back = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 0.5), sofaMat);
    back.position.set(0, 1.1, -0.75);
    sofa.add(back);
    // Armlehnen
    [-2.3, 2.3].forEach(x => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 2), sofaMat);
        arm.position.set(x, 0.7, 0);
        sofa.add(arm);
    });
    // Kissen
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.9 });
    [-1.5, 0, 1.5].forEach(x => {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.4), cushionMat);
        cushion.position.set(x, 1.3, -0.5);
        sofa.add(cushion);
    });
    return sofa;
}

function createStandLamp() {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 }));
    pole.position.y = 1.25;
    lamp.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xf5deb3, side: THREE.DoubleSide }));
    shade.position.y = 2.7;
    lamp.add(shade);
    const bulb = new THREE.PointLight(0xffe4b5, 0.7, 10);
    bulb.position.y = 2.5;
    lamp.add(bulb);
    return lamp;
}

function createAlienPrison(index) {
    const prison = new THREE.Group();
    
    // Käfig-Basis
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.2, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
    );
    base.position.y = 0.1;
    prison.add(base);

    // Käfig-Gitter (vertikal)
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.2 });
    
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const bar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8),
            barMaterial
        );
        bar.position.set(Math.cos(angle) * 1, 1.35, Math.sin(angle) * 1);
        prison.add(bar);
    }

    // Käfig-Decke
    const top = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 0.15, 16),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
    );
    top.position.y = 2.6;
    prison.add(top);

    // Ring oben
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.08, 8, 24),
        barMaterial
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.5;
    prison.add(ring);

    // Ring unten
    const ringBottom = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.08, 8, 24),
        barMaterial
    );
    ringBottom.rotation.x = Math.PI / 2;
    ringBottom.position.y = 0.2;
    prison.add(ringBottom);

    // Gefangener Alien (zunächst unsichtbar)
    const alienInPrison = createSmallAlien();
    alienInPrison.name = 'prisonAlien';
    alienInPrison.position.y = 1;
    alienInPrison.scale.set(0.7, 0.7, 0.7);
    alienInPrison.visible = false;
    prison.add(alienInPrison);

    // Leuchtendes Licht wenn Alien drin
    const prisonLight = new THREE.PointLight(0x00ff00, 0, 3);
    prisonLight.name = 'prisonLight';
    prisonLight.position.y = 1.5;
    prison.add(prisonLight);

    // Nummer
    prison.userData = { prisonIndex: index };

    return prison;
}

function createSmallAlien() {
    const alien = new THREE.Group();
    
    // Körper
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshStandardMaterial({ 
            color: 0x00ff00, 
            emissive: 0x003300,
            roughness: 0.5 
        })
    );
    body.position.y = 0;
    alien.add(body);

    // Kopf
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshStandardMaterial({ 
            color: 0x00ff00, 
            emissive: 0x003300,
            roughness: 0.5 
        })
    );
    head.position.y = 0.6;
    alien.add(head);

    // Große Augen
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000, 
        emissive: 0x111111,
        roughness: 0.2 
    });
    
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), eyeMaterial);
    leftEye.position.set(-0.15, 0.65, 0.25);
    alien.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), eyeMaterial);
    rightEye.position.set(0.15, 0.65, 0.25);
    alien.add(rightEye);

    // Antenne
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    antenna.position.set(0, 0.95, 0);
    alien.add(antenna);

    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshStandardMaterial({ 
            color: 0xffff00, 
            emissive: 0xffff00,
            emissiveIntensity: 0.5 
        })
    );
    antennaTip.position.set(0, 1.1, 0);
    alien.add(antennaTip);

    return alien;
}

// ==========================================
// FAHRZEUGE (FAHRENDE AUTOS)
// ==========================================
function createVehicles() {
    vehicles = [];
    
    // Autos auf Hauptstraßen (Nord-Süd)
    CITY_ROADS.forEach(x => {
        for (let i = 0; i < 3; i++) {
            const car = createCar();
            const startZ = (Math.random() - 0.5) * ROAD_LIMIT * 2;
            const laneOffset = ROAD_LANES[Math.floor(Math.random() * ROAD_LANES.length)];
            car.position.set(x + laneOffset, 0.5, startZ);
            car.rotation.y = laneOffset > 0 ? 0 : Math.PI;
            car.userData = {
                type: 'driving',
                axis: 'z',
                direction: laneOffset > 0 ? 1 : -1,
                speed: 0.12 + Math.random() * 0.12,
                roadCoord: x,
                laneOffset,
                turnCooldown: 0
            };
            vehicles.push(car);
            scene.add(car);
        }
    });
    
    // Autos auf Hauptstraßen (Ost-West)
    CITY_ROADS.forEach(z => {
        for (let i = 0; i < 3; i++) {
            const car = createCar();
            const startX = (Math.random() - 0.5) * ROAD_LIMIT * 2;
            const laneOffset = ROAD_LANES[Math.floor(Math.random() * ROAD_LANES.length)];
            car.position.set(startX, 0.5, z + laneOffset);
            car.rotation.y = laneOffset > 0 ? Math.PI / 2 : -Math.PI / 2;
            car.userData = {
                type: 'driving',
                axis: 'x',
                direction: laneOffset > 0 ? 1 : -1,
                speed: 0.12 + Math.random() * 0.12,
                roadCoord: z,
                laneOffset,
                turnCooldown: 0
            };
            vehicles.push(car);
            scene.add(car);
        }
    });
}

function createCar() {
    const car = new THREE.Group();
    const headlights = [];
    const taillights = [];
    
    // Realistischere Autofarben
    const carTypes = [
        { color: 0xC0392B, type: 'sedan' },      // Rot
        { color: 0x2980B9, type: 'sedan' },      // Blau
        { color: 0x27AE60, type: 'suv' },        // Grün
        { color: 0xF39C12, type: 'sports' },     // Orange
        { color: 0x1C1C1C, type: 'sedan' },      // Schwarz
        { color: 0xECF0F1, type: 'sedan' },      // Weiß
        { color: 0x7F8C8D, type: 'suv' },        // Silber
        { color: 0x8E44AD, type: 'sports' },     // Lila
        { color: 0x2C3E50, type: 'sedan' },      // Dunkelblau
        { color: 0xD35400, type: 'suv' }         // Dunkelorange
    ];
    
    const carSpec = carTypes[Math.floor(Math.random() * carTypes.length)];
    
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: carSpec.color,
        roughness: 0.25,
        metalness: 0.75
    });
    
    const chromeMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        roughness: 0.1,
        metalness: 0.95
    });
    
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x4A6670,
        transparent: true,
        opacity: 0.6,
        roughness: 0.05,
        metalness: 0.3
    });

    bodyMaterial.envMapIntensity = 1.0;
    chromeMaterial.envMapIntensity = 1.4;
    glassMaterial.envMapIntensity = 0.9;
    
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.2, metalness: 0.8 });
    
    // Unterboden
    const undercarriage = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.15, 4.2),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
    );
    undercarriage.position.y = 0.2;
    car.add(undercarriage);
    
    // Hauptkarosserie unten
    const lowerBody = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.8, 4.2),
        bodyMaterial
    );
    lowerBody.position.y = 0.5;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    car.add(lowerBody);
    
    // Seitliche Kontur/Kante
    [-1, 1].forEach(side => {
        const sideLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.1, 3.8),
            chromeMaterial
        );
        sideLine.position.set(side * 1, 0.7, 0);
        car.add(sideLine);
    });
    
    // Kotflügel vorne
    [-0.9, 0.9].forEach(x => {
        const fender = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.35, 0.6),
            bodyMaterial
        );
        fender.position.set(x, 0.65, 1.5);
        car.add(fender);
    });
    
    // Kotflügel hinten
    [-0.9, 0.9].forEach(x => {
        const fender = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.35, 0.6),
            bodyMaterial
        );
        fender.position.set(x, 0.65, -1.5);
        car.add(fender);
    });
    
    // Kabine (oberer Körper) - variiert nach Typ
    const cabinHeight = carSpec.type === 'suv' ? 1 : 0.8;
    const cabinWidth = carSpec.type === 'sports' ? 1.7 : 1.85;
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth, cabinHeight, 2.2),
        bodyMaterial
    );
    cabin.position.set(0, 1.1 + (cabinHeight - 0.8) / 2, -0.2);
    cabin.castShadow = true;
    car.add(cabin);
    
    // Dach mit leichter Wölbung
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth - 0.1, 0.08, 1.8),
        bodyMaterial
    );
    roof.position.set(0, 1.1 + cabinHeight, -0.3);
    car.add(roof);
    
    // Windschutzscheibe
    const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth - 0.15, cabinHeight - 0.1, 0.08),
        glassMaterial
    );
    windshield.position.set(0, 1.15 + (cabinHeight - 0.8) / 2, 0.85);
    windshield.rotation.x = -0.25;
    car.add(windshield);
    
    // Heckscheibe
    const rearWindow = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth - 0.2, cabinHeight - 0.2, 0.08),
        glassMaterial
    );
    rearWindow.position.set(0, 1.15 + (cabinHeight - 0.8) / 2, -1.25);
    rearWindow.rotation.x = 0.2;
    car.add(rearWindow);
    
    // Seitenfenster
    [-1, 1].forEach(side => {
        const sideWindow = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, cabinHeight - 0.2, 1.6),
            glassMaterial
        );
        sideWindow.position.set(side * (cabinWidth / 2), 1.15 + (cabinHeight - 0.8) / 2, -0.2);
        car.add(sideWindow);
    });
    
    // A-Säulen (Fensterrahmen)
    [-1, 1].forEach(side => {
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, cabinHeight, 0.08),
            bodyMaterial
        );
        pillar.position.set(side * (cabinWidth / 2 - 0.05), 1.1 + (cabinHeight - 0.8) / 2, 0.8);
        pillar.rotation.x = -0.25;
        car.add(pillar);
    });
    
    // Räder mit Felgen
    const wheelPositions = [
        [-0.95, 0.35, 1.4], [0.95, 0.35, 1.4],
        [-0.95, 0.35, -1.4], [0.95, 0.35, -1.4]
    ];
    
    wheelPositions.forEach(pos => {
        const wheelGroup = new THREE.Group();
        
        // Reifen
        const tire = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.1, 8, 16),
            wheelMaterial
        );
        tire.rotation.y = Math.PI / 2;
        wheelGroup.add(tire);
        
        // Felge
        const rim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.18, 12),
            rimMaterial
        );
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);
        
        // Felgendetails
        for (let s = 0; s < 5; s++) {
            const spoke = new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 0.14, 0.18),
                rimMaterial
            );
            spoke.rotation.z = (s / 5) * Math.PI * 2;
            wheelGroup.add(spoke);
        }
        
        wheelGroup.position.set(pos[0], pos[1], pos[2]);
        wheelGroup.rotation.z = Math.PI / 2;
        car.add(wheelGroup);
    });
    
    // Scheinwerfer
    [-0.7, 0.7].forEach(x => {
        // Scheinwerfergehäuse
        const headlightHousing = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.2, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
        );
        headlightHousing.position.set(x, 0.55, 2.1);
        car.add(headlightHousing);
        
        // Lichtglas
        const headlight = new THREE.Mesh(
            new THREE.CircleGeometry(0.12, 12),
            new THREE.MeshStandardMaterial({ 
                color: 0xFFFFFF, 
                emissive: 0xFFFFFF, 
                emissiveIntensity: 0.25,
                roughness: 0.1
            })
        );
        headlight.position.set(x, 0.55, 2.15);
        car.add(headlight);
        headlights.push({ mesh: headlight, baseIntensity: headlight.material.emissiveIntensity });
    });
    
    // Rücklichter
    [-0.7, 0.7].forEach(x => {
        const taillight = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.15, 0.08),
            new THREE.MeshStandardMaterial({ 
                color: 0xFF0000, 
                emissive: 0x440000, 
                emissiveIntensity: 0.35,
                roughness: 0.2
            })
        );
        taillight.position.set(x, 0.55, -2.1);
        car.add(taillight);
        taillights.push({ mesh: taillight, baseIntensity: taillight.material.emissiveIntensity });
    });
    
    // Kühlergrill
    const grille = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.25, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
    );
    grille.position.set(0, 0.45, 2.1);
    car.add(grille);
    
    // Kühlergrill-Chromleisten
    for (let g = 0; g < 4; g++) {
        const grilleLine = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.02, 0.02),
            chromeMaterial
        );
        grilleLine.position.set(0, 0.36 + g * 0.06, 2.12);
        car.add(grilleLine);
    }
    
    // Nummernschildhalter hinten
    const licensePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 })
    );
    licensePlate.position.set(0, 0.35, -2.12);
    car.add(licensePlate);
    
    // Seitenspiegel
    [-1, 1].forEach(side => {
        const mirrorArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.05, 0.05),
            bodyMaterial
        );
        mirrorArm.position.set(side * 1.1, 1, 0.6);
        car.add(mirrorArm);
        
        const mirror = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.12, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
        );
        mirror.position.set(side * 1.2, 1, 0.6);
        car.add(mirror);
    });
    
    // Auspuff
    const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8),
        chromeMaterial
    );
    exhaust.position.set(0.6, 0.2, -2.2);
    exhaust.rotation.x = Math.PI / 2;
    car.add(exhaust);

    car.userData = car.userData || {};
    car.userData.headlights = headlights;
    car.userData.taillights = taillights;
    
    return car;
}

// ==========================================
// ALIENS
// ==========================================
function createAliens() {
    aliens = [];
    
    for (let i = 0; i < TOTAL_ALIENS; i++) {
        const alien = createAlien();
        const spawnOnRoad = Math.random() < 0.7;
        if (spawnOnRoad) {
            const axis = Math.random() < 0.5 ? 'x' : 'z';
            const road = CITY_ROADS[Math.floor(Math.random() * CITY_ROADS.length)];
            const offset = (Math.random() - 0.5) * 6;
            if (axis === 'x') {
                alien.position.set((Math.random() - 0.5) * (ROAD_LIMIT * 1.6), 0.1, road + offset);
            } else {
                alien.position.set(road + offset, 0.1, (Math.random() - 0.5) * (ROAD_LIMIT * 1.6));
            }
        } else {
            alien.position.set((Math.random() - 0.5) * (CITY_BOUND * 2 - 20), 0.1, (Math.random() - 0.5) * (CITY_BOUND * 2 - 20));
        }
        alien.userData = {
            collected: false,
            bobOffset: Math.random() * Math.PI * 2,
            moveTarget: null,
            walkTimer: Math.random() * 4
        };
        aliens.push(alien);
        scene.add(alien);
    }
}

function createAlien() {
    const kid = new THREE.Group();

    const outfitTypes = [
        { shirt: 0x42a5f5, pants: 0x1e3a5f },
        { shirt: 0xef5350, pants: 0x263238 },
        { shirt: 0x66bb6a, pants: 0x455a64 },
        { shirt: 0xffca28, pants: 0x5d4037 },
        { shirt: 0xab47bc, pants: 0x37474f }
    ];
    const skinTones = [0xFFE0BD, 0xE8BEAC, 0xD4A574, 0xC68642, 0x8D5524];

    const outfit = outfitTypes[Math.floor(Math.random() * outfitTypes.length)];
    const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: outfit.shirt, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: outfit.pants, roughness: 0.75 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), shirtMat);
    body.position.y = 0.75;
    body.castShadow = true;
    kid.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skinMat);
    head.position.y = 1.4;
    kid.add(head);

    [-0.18, 0.18].forEach(x => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.5, 10), pantsMat);
        leg.position.set(x, 0.25, 0);
        leg.castShadow = true;
        kid.add(leg);
    });

    [-0.3, 0.3].forEach(x => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 10), shirtMat);
        arm.position.set(x, 0.9, 0);
        arm.rotation.z = x > 0 ? -0.4 : 0.4;
        kid.add(arm);
    });

    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 })
    );
    hair.position.y = 1.55;
    kid.add(hair);

    return kid;
}

// ==========================================
// POLIZISTEN
// ==========================================
function createPolice() {
    police = [];
    
    for (let i = 0; i < 5; i++) {
        const cop = createPoliceman();
        cop.position.set((Math.random() - 0.5) * 300, 2, (Math.random() - 0.5) * 300);
        cop.userData = {
            speed: 0.05 + Math.random() * 0.03,
            patrolTarget: new THREE.Vector3((Math.random() - 0.5) * 300, 2, (Math.random() - 0.5) * 300)
        };
        police.push(cop);
        scene.add(cop);
    }
}

function createPoliceman() {
    const cop = new THREE.Group();

    // Materialien
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xE8BEAC, roughness: 0.7 });
    const uniformMaterial = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.6 });
    const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x0d1421, roughness: 0.7 });
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.2 });
    const beltMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.4, metalness: 0.3 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.2, metalness: 0.9 });

    // Schuhe
    [-0.12, 0.12].forEach(x => {
        const shoe = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.08, 0.22),
            shoeMaterial
        );
        shoe.position.set(x, 0.04, 0);
        shoe.castShadow = true;
        cop.add(shoe);
    });

    // Beine - realistischer mit Oberschenkel und Unterschenkel
    [-0.12, 0.12].forEach(x => {
        // Unterschenkel (CylinderGeometry statt CapsuleGeometry für r128)
        const lowerLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.35, 12),
            pantsMaterial
        );
        lowerLeg.position.set(x, 0.28, 0);
        lowerLeg.castShadow = true;
        cop.add(lowerLeg);

        // Knie
        const knee = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 12, 12),
            pantsMaterial
        );
        knee.position.set(x, 0.5, 0);
        cop.add(knee);

        // Oberschenkel
        const upperLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.065, 0.35, 12),
            pantsMaterial
        );
        upperLeg.position.set(x, 0.73, 0);
        upperLeg.castShadow = true;
        cop.add(upperLeg);
    });

    // Hüfte
    const hips = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12),
        pantsMaterial
    );
    hips.position.set(0, 0.95, 0);
    hips.rotation.z = Math.PI / 2;
    cop.add(hips);

    // Gürtel mit Ausrüstung
    const belt = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.025, 8, 24),
        beltMaterial
    );
    belt.position.set(0, 1.0, 0);
    belt.rotation.x = Math.PI / 2;
    cop.add(belt);

    // Gürtelschnalle
    const buckle = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.04, 0.02),
        goldMaterial
    );
    buckle.position.set(0, 1.0, 0.15);
    cop.add(buckle);

    // Holster
    const holster = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.12, 0.06),
        beltMaterial
    );
    holster.position.set(0.18, 0.95, 0);
    cop.add(holster);

    // Torso
    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.45, 12),
        uniformMaterial
    );
    torso.position.set(0, 1.3, 0);
    torso.castShadow = true;
    cop.add(torso);

    // Brust/Schultern
    const chest = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 16, 16),
        uniformMaterial
    );
    chest.position.set(0, 1.5, 0);
    chest.scale.set(1.1, 0.8, 0.7);
    chest.castShadow = true;
    cop.add(chest);

    // Schulterabzeichen
    [-0.18, 0.18].forEach(x => {
        const epaulette = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x283593 })
        );
        epaulette.position.set(x, 1.58, 0);
        cop.add(epaulette);
    });

    // Arme
    [-0.22, 0.22].forEach(x => {
        // Oberarm (CylinderGeometry statt CapsuleGeometry für r128)
        const upperArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12),
            uniformMaterial
        );
        upperArm.position.set(x, 1.4, 0);
        upperArm.castShadow = true;
        cop.add(upperArm);

        // Ellbogen
        const elbow = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 8, 8),
            uniformMaterial
        );
        elbow.position.set(x, 1.25, 0);
        cop.add(elbow);

        // Unterarm
        const forearm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.2, 12),
            uniformMaterial
        );
        forearm.position.set(x, 1.1, 0);
        forearm.castShadow = true;
        cop.add(forearm);

        // Hand
        const hand = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 12, 12),
            skinMaterial
        );
        hand.position.set(x, 0.95, 0);
        hand.scale.set(1, 1.3, 0.7);
        cop.add(hand);
    });

    // Hals
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12),
        skinMaterial
    );
    neck.position.set(0, 1.68, 0);
    cop.add(neck);

    // Kopf
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 24, 24),
        skinMaterial
    );
    head.position.set(0, 1.85, 0);
    head.scale.set(1, 1.1, 0.95);
    head.castShadow = true;
    cop.add(head);

    // Gesichtszüge
    // Nase
    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.04, 8),
        skinMaterial
    );
    nose.position.set(0, 1.83, 0.11);
    nose.rotation.x = -Math.PI / 2;
    cop.add(nose);

    // Augen
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const eyePupilMaterial = new THREE.MeshStandardMaterial({ color: 0x2c1810 });

    [-0.035, 0.035].forEach(x => {
        const eyeWhite = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 12, 12),
            eyeWhiteMaterial
        );
        eyeWhite.position.set(x, 1.87, 0.1);
        cop.add(eyeWhite);

        const pupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.01, 8, 8),
            eyePupilMaterial
        );
        pupil.position.set(x, 1.87, 0.115);
        cop.add(pupil);
    });

    // Augenbrauen
    [-0.035, 0.035].forEach(x => {
        const brow = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.008, 0.01),
            new THREE.MeshStandardMaterial({ color: 0x2c1810 })
        );
        brow.position.set(x, 1.91, 0.1);
        cop.add(brow);
    });

    // Mund
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.008, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xcc8888 })
    );
    mouth.position.set(0, 1.78, 0.1);
    cop.add(mouth);

    // Ohren
    [-0.115, 0.115].forEach(x => {
        const ear = new THREE.Mesh(
            new THREE.SphereGeometry(0.025, 8, 8),
            skinMaterial
        );
        ear.position.set(x, 1.85, 0);
        ear.scale.set(0.4, 1, 0.6);
        cop.add(ear);
    });

    // Haare (kurzer Schnitt)
    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.125, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x1a1209, roughness: 0.9 })
    );
    hair.position.set(0, 1.88, 0);
    cop.add(hair);

    // Polizeimütze
    const hatBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.14, 0.06, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.5 })
    );
    hatBase.position.set(0, 2.0, 0);
    cop.add(hatBase);

    const hatTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.13, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.5 })
    );
    hatTop.position.set(0, 2.07, 0);
    cop.add(hatTop);

    // Mützenschirm
    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.01, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.3, metalness: 0.4 })
    );
    visor.position.set(0, 1.98, 0.12);
    visor.rotation.x = -0.2;
    cop.add(visor);

    // Polizei-Abzeichen auf Mütze
    const hatBadge = new THREE.Mesh(
        new THREE.CircleGeometry(0.025, 8),
        goldMaterial
    );
    hatBadge.position.set(0, 2.03, 0.135);
    hatBadge.material.side = THREE.DoubleSide;
    cop.add(hatBadge);

    // Brust-Abzeichen
    const chestBadge = new THREE.Mesh(
        new THREE.CircleGeometry(0.03, 6),
        goldMaterial
    );
    chestBadge.position.set(-0.08, 1.5, 0.14);
    chestBadge.material.side = THREE.DoubleSide;
    cop.add(chestBadge);

    // Namensschild
    const nameTag = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.015, 0.005),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    nameTag.position.set(0.08, 1.5, 0.14);
    cop.add(nameTag);

    // Funkgerät an der Schulter
    const radio = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.06, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    radio.position.set(-0.16, 1.55, 0.05);
    cop.add(radio);

    return cop;
}

// ==========================================
// NPCs (ZIVILISTEN)
// ==========================================
function createNPCs() {
    npcs = [];
    
    const npcCount = 36; // Etwas dichter fuer eine lebendige Stadt
    
    // Spawn-Positionen entlang der Straßen
    const streetPositions = [];
    CITY_ROADS.forEach(mainCoord => {
        for (let i = -CITY_BOUND; i <= CITY_BOUND; i += 30) {
            streetPositions.push({ x: mainCoord + (Math.random() - 0.5) * 6, z: i + (Math.random() - 0.5) * 4 });
            streetPositions.push({ x: i + (Math.random() - 0.5) * 4, z: mainCoord + (Math.random() - 0.5) * 6 });
        }
    });
    
    for (let i = 0; i < npcCount; i++) {
        const npc = createCivilian();
        
        // Spawn auf Straßen/Gehwegen
        const spawnPos = streetPositions[Math.floor(Math.random() * streetPositions.length)];
        npc.position.set(spawnPos.x, 0.1, spawnPos.z);
        
        // Ziel auch auf Straße setzen
        const targetPos = streetPositions[Math.floor(Math.random() * streetPositions.length)];
        
        npc.userData = npc.userData || {};
        npc.userData.speed = 0.03 + Math.random() * 0.02;
        npc.userData.target = new THREE.Vector3(targetPos.x, 0, targetPos.z);
        npc.userData.walkTimer = Math.random() * 10;
        npc.userData.streetPositions = streetPositions;
        npcs.push(npc);
        scene.add(npc);
    }
}

function createCivilian() {
    const npc = new THREE.Group();
    const limbRefs = { arms: [], legs: [] };
    
    // Realistischere Kleidungsfarben
    const outfitTypes = [
        { shirt: 0x1E3A5F, pants: 0x2C3E50, type: 'business' },  // Business blau
        { shirt: 0xFFFFFF, pants: 0x1a1a1a, type: 'formal' },     // Formell
        { shirt: 0xC0392B, pants: 0x2C3E50, type: 'casual' },     // Casual rot
        { shirt: 0x27AE60, pants: 0x34495E, type: 'casual' },     // Casual grün
        { shirt: 0xF39C12, pants: 0x1a252f, type: 'casual' },     // Casual gelb
        { shirt: 0x8E44AD, pants: 0x2c2c54, type: 'trendy' },     // Trendy lila
        { shirt: 0x16A085, pants: 0x1C2833, type: 'sporty' },     // Sportlich
        { shirt: 0xE74C3C, pants: 0x17202A, type: 'casual' },     // Rot
        { shirt: 0x3498DB, pants: 0x2E4053, type: 'casual' }      // Blau
    ];
    
    const skinTones = [0xFFE0BD, 0xE8BEAC, 0xD4A574, 0xC68642, 0x8D5524, 0x5C3836];
    const hairColors = [0x090806, 0x2C1810, 0x4A3728, 0x6A4E35, 0x8B4513, 0xB8860B, 0xE5C100, 0xC41E3A, 0x1C1C1C];
    
    const outfit = outfitTypes[Math.floor(Math.random() * outfitTypes.length)];
    const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    const isMale = Math.random() > 0.5;
    
    const skinMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });
    const shirtMaterial = new THREE.MeshStandardMaterial({ color: outfit.shirt, roughness: 0.65 });
    const pantsMaterial = new THREE.MeshStandardMaterial({ color: outfit.pants, roughness: 0.7 });
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    
    // Schuhe mit mehr Detail
    [-0.12, 0.12].forEach(x => {
        const shoeBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.08, 0.22),
            shoeMaterial
        );
        shoeBase.position.set(x, 0.04, 0.02);
        shoeBase.castShadow = true;
        npc.add(shoeBase);
        
        // Schuhspitze
        const shoeToe = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 8, 4, 0, Math.PI),
            shoeMaterial
        );
        shoeToe.position.set(x, 0.04, 0.1);
        shoeToe.rotation.x = -Math.PI / 2;
        npc.add(shoeToe);
    });
    
    // Beine mit Knie-Andeutung
    [-0.12, 0.12].forEach(x => {
        // Oberschenkel
        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.06, 0.35, 10),
            pantsMaterial
        );
        thigh.position.set(x, 0.55, 0);
        thigh.castShadow = true;
        npc.add(thigh);
        
        // Unterschenkel
        const calf = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.065, 0.3, 10),
            pantsMaterial
        );
        calf.position.set(x, 0.24, 0);
        calf.castShadow = true;
        npc.add(calf);

        limbRefs.legs.push({ upper: thigh, lower: calf });
    });
    
    // Hüfte
    const hip = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.12, 0.16),
        pantsMaterial
    );
    hip.position.set(0, 0.72, 0);
    npc.add(hip);
    
    // Gürtel
    const belt = new THREE.Mesh(
        new THREE.BoxGeometry(0.29, 0.05, 0.17),
        new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.5 })
    );
    belt.position.set(0, 0.78, 0);
    npc.add(belt);
    
    // Gürtelschnalle
    const buckle = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.7, roughness: 0.3 })
    );
    buckle.position.set(0, 0.78, 0.085);
    npc.add(buckle);
    
    // Torso mit besserer Form
    const torsoHeight = isMale ? 0.5 : 0.45;
    const torsoWidth = isMale ? 0.16 : 0.14;
    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(torsoWidth, 0.14, torsoHeight, 12),
        shirtMaterial
    );
    torso.position.set(0, 1.0, 0);
    torso.castShadow = true;
    npc.add(torso);
    
    // Schultern
    const shoulders = new THREE.Mesh(
        new THREE.BoxGeometry(isMale ? 0.38 : 0.32, 0.08, 0.14),
        shirtMaterial
    );
    shoulders.position.set(0, 1.2, 0);
    npc.add(shoulders);
    
    // Arme mit Ellbogen
    [-1, 1].forEach(side => {
        const armX = side * (isMale ? 0.22 : 0.18);
        
        // Oberarm
        const upperArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.04, 0.25, 8),
            shirtMaterial
        );
        upperArm.position.set(armX, 1.05, 0);
        upperArm.rotation.z = side * 0.15;
        upperArm.castShadow = true;
        npc.add(upperArm);
        
        // Unterarm
        const lowerArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8),
            skinMaterial
        );
        lowerArm.position.set(armX * 1.1, 0.82, 0.02);
        lowerArm.rotation.z = side * 0.1;
        lowerArm.castShadow = true;
        npc.add(lowerArm);
        
        // Hand
        const hand = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 8),
            skinMaterial
        );
        hand.position.set(armX * 1.15, 0.68, 0.03);
        hand.scale.set(0.8, 1, 0.5);
        npc.add(hand);

        limbRefs.arms.push({ upper: upperArm, lower: lowerArm });
    });
    
    // Kragen
    if (outfit.type === 'business' || outfit.type === 'formal') {
        const collar = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, 0.1),
            new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 })
        );
        collar.position.set(0, 1.25, 0.06);
        npc.add(collar);
    }
    
    // Hals
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10),
        skinMaterial
    );
    neck.position.set(0, 1.3, 0);
    npc.add(neck);
    
    // Kopf mit besserer Form
    const headGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const head = new THREE.Mesh(headGeom, skinMaterial);
    head.position.set(0, 1.48, 0);
    head.scale.set(1, 1.15, 0.95);
    head.castShadow = true;
    npc.add(head);
    
    // Ohren
    [-1, 1].forEach(side => {
        const ear = new THREE.Mesh(
            new THREE.SphereGeometry(0.025, 8, 8),
            skinMaterial
        );
        ear.position.set(side * 0.12, 1.48, 0);
        ear.scale.set(0.4, 0.8, 0.5);
        npc.add(ear);
    });
    
    // Nase
    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.04, 6),
        skinMaterial
    );
    nose.position.set(0, 1.46, 0.11);
    nose.rotation.x = Math.PI / 2;
    npc.add(nose);
    
    // Augen
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    
    [-0.035, 0.035].forEach(ex => {
        // Augapfel
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), eyeMat);
        eye.position.set(ex, 1.5, 0.1);
        npc.add(eye);
        
        // Pupille
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), pupilMat);
        pupil.position.set(ex, 1.5, 0.118);
        npc.add(pupil);
    });
    
    // Mund
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.008, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xCC6666 })
    );
    mouth.position.set(0, 1.4, 0.1);
    npc.add(mouth);
    
    // Augenbrauen
    const browMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    [-0.035, 0.035].forEach(bx => {
        const brow = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.01, 0.01),
            browMat
        );
        brow.position.set(bx, 1.54, 0.09);
        brow.rotation.z = bx > 0 ? -0.1 : 0.1;
        npc.add(brow);
    });
    
    // Haare basierend auf Geschlecht
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
    
    if (isMale) {
        // Kurze Männerfrisur
        const hairTop = new THREE.Mesh(
            new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
            hairMat
        );
        hairTop.position.set(0, 1.52, -0.01);
        npc.add(hairTop);
    } else {
        // Längere Frauenfrisur
        const hairTop = new THREE.Mesh(
            new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.7),
            hairMat
        );
        hairTop.position.set(0, 1.52, -0.01);
        npc.add(hairTop);
        
        // Haare an den Seiten
        [-1, 1].forEach(side => {
            const sideHair = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.02, 0.25, 8),
                hairMat
            );
            sideHair.position.set(side * 0.1, 1.35, -0.02);
            sideHair.rotation.z = side * 0.2;
            npc.add(sideHair);
        });
    }
    
    // Zufällig: Brille
    if (Math.random() > 0.7) {
        const glassMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a, 
            roughness: 0.3 
        });
        const lensMat = new THREE.MeshStandardMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.3 
        });
        
        // Brillengestell
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), glassMat);
        bridge.position.set(0, 1.5, 0.12);
        npc.add(bridge);
        
        [-0.04, 0.04].forEach(gx => {
            const frame = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 12), glassMat);
            frame.position.set(gx, 1.5, 0.12);
            npc.add(frame);
            
            const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), lensMat);
            lens.position.set(gx, 1.5, 0.122);
            npc.add(lens);
        });
    }
    
    // Zufällig: Hut oder Mütze
    if (Math.random() > 0.8) {
        const hatMat = new THREE.MeshStandardMaterial({ 
            color: [0x1a1a1a, 0x4a3728, 0x2c3e50, 0x8B0000][Math.floor(Math.random() * 4)], 
            roughness: 0.7 
        });
        
        if (Math.random() > 0.5) {
            // Baseballkappe
            const cap = new THREE.Mesh(
                new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
                hatMat
            );
            cap.position.set(0, 1.6, 0);
            npc.add(cap);
            
            const visor = new THREE.Mesh(
                new THREE.CircleGeometry(0.08, 12, 0, Math.PI),
                hatMat
            );
            visor.position.set(0, 1.56, 0.1);
            visor.rotation.x = -0.3;
            npc.add(visor);
        } else {
            // Zylinder/Hut
            const hat = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12),
                hatMat
            );
            hat.position.set(0, 1.65, 0);
            npc.add(hat);
            
            const brim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16),
                hatMat
            );
            brim.position.set(0, 1.6, 0);
            npc.add(brim);
        }
    }

    // Zufällig: Rucksack
    if (Math.random() > 0.72) {
        const packMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.08), packMat);
        pack.position.set(0, 1.02, -0.12);
        npc.add(pack);
        const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), packMat);
        packFlap.position.set(0, 1.17, -0.08);
        npc.add(packFlap);
    }

    // Maßstab + Animationsdaten
    const scale = 0.92 + Math.random() * 0.22;
    npc.scale.set(scale, scale, scale);
    npc.userData = npc.userData || {};
    npc.userData.limbs = limbRefs;
    npc.userData.scale = scale;
    npc.userData.walkPhase = Math.random() * Math.PI * 2;
    
    return npc;
}

// ==========================================
// TIERE
// ==========================================
function createAnimals() {
    animals = [];
    
    // Hunde
    for (let i = 0; i < 10; i++) {
        const dog = createDog();
        dog.position.set((Math.random() - 0.5) * 360, 0.1, (Math.random() - 0.5) * 360);
        dog.userData = { type: 'dog', speed: 0.05 + Math.random() * 0.03, target: null, state: 'idle' };
        animals.push(dog);
        scene.add(dog);
    }
    
    // Katzen
    for (let i = 0; i < 10; i++) {
        const cat = createCat();
        cat.position.set((Math.random() - 0.5) * 360, 0.1, (Math.random() - 0.5) * 360);
        cat.userData = { type: 'cat', speed: 0.04 + Math.random() * 0.02, target: null, state: 'idle' };
        animals.push(cat);
        scene.add(cat);
    }
    
    // Vögel am Himmel
    for (let i = 0; i < 40; i++) {
        const bird = createBird();
        // Vögel in Gruppen/Schwärmen
        const swarmX = (Math.random() - 0.5) * 700;
        const swarmZ = (Math.random() - 0.5) * 700;
        bird.position.set(
            swarmX + (Math.random() - 0.5) * 30,
            20 + Math.random() * 50,
            swarmZ + (Math.random() - 0.5) * 30
        );
        bird.userData = { 
            type: 'bird', 
            speed: 0.15 + Math.random() * 0.1, 
            flyHeight: 20 + Math.random() * 40,
            circleCenter: new THREE.Vector3(swarmX, 0, swarmZ),
            circleRadius: 30 + Math.random() * 50,
            angle: Math.random() * Math.PI * 2
        };
        animals.push(bird);
        scene.add(bird);
    }
}

function createDog() {
    const dog = new THREE.Group();
    const furColor = [0x8B4513, 0xD2691E, 0xF4A460, 0x2F1810, 0xFFFFFF][Math.floor(Math.random() * 5)];
    const furMaterial = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9 });
    
    // Körper
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.5, 8), furMaterial);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.3, 0);
    body.castShadow = true;
    dog.add(body);
    
    // Beine
    [[-0.15, 0.15], [-0.15, -0.15], [0.15, 0.15], [0.15, -0.15]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), furMaterial);
        leg.position.set(x, 0.1, z);
        dog.add(leg);
    });
    
    // Kopf
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), furMaterial);
    head.position.set(0.3, 0.38, 0);
    head.scale.set(1.2, 1, 0.9);
    dog.add(head);
    
    // Schnauze
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.12, 8), furMaterial);
    snout.rotation.z = Math.PI / 2;
    snout.position.set(0.42, 0.35, 0);
    dog.add(snout);
    
    // Nase
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    nose.position.set(0.48, 0.35, 0);
    dog.add(nose);
    
    // Ohren
    [-0.08, 0.08].forEach(z => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), furMaterial);
        ear.position.set(0.25, 0.5, z);
        ear.rotation.x = z > 0 ? 0.3 : -0.3;
        dog.add(ear);
    });
    
    // Schwanz
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.2, 6), furMaterial);
    tail.position.set(-0.3, 0.4, 0);
    tail.rotation.z = -0.8;
    dog.add(tail);
    
    return dog;
}

function createCat() {
    const cat = new THREE.Group();
    const furColor = [0x808080, 0xFFA500, 0x1a1a1a, 0xFFFFFF, 0x8B4513][Math.floor(Math.random() * 5)];
    const furMaterial = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9 });
    
    // Körper
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.35, 8), furMaterial);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.18, 0);
    body.castShadow = true;
    cat.add(body);
    
    // Beine
    [[-0.1, 0.06], [-0.1, -0.06], [0.1, 0.06], [0.1, -0.06]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6), furMaterial);
        leg.position.set(x, 0.075, z);
        cat.add(leg);
    });
    
    // Kopf
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), furMaterial);
    head.position.set(0.2, 0.25, 0);
    cat.add(head);
    
    // Ohren (dreieckig)
    [-0.04, 0.04].forEach(z => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 4), furMaterial);
        ear.position.set(0.22, 0.35, z);
        ear.rotation.x = z > 0 ? 0.2 : -0.2;
        cat.add(ear);
    });
    
    // Schwanz
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.25, 6), furMaterial);
    tail.position.set(-0.25, 0.25, 0);
    tail.rotation.z = -0.5;
    cat.add(tail);
    
    return cat;
}

function createBird() {
    const bird = new THREE.Group();
    const birdColors = [0x4a4a4a, 0x2c3e50, 0x8B4513, 0x1a1a1a, 0xFFFFFF];
    const bodyColor = birdColors[Math.floor(Math.random() * birdColors.length)];
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
    
    // Körper
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), bodyMaterial);
    body.scale.set(1.5, 0.8, 0.8);
    bird.add(body);
    
    // Kopf
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bodyMaterial);
    head.position.set(0.12, 0.04, 0);
    bird.add(head);
    
    // Schnabel
    const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.06, 6),
        new THREE.MeshStandardMaterial({ color: 0xFFA500 })
    );
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.2, 0.04, 0);
    bird.add(beak);
    
    // Flügel
    [-0.08, 0.08].forEach(z => {
        const wing = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.02, 0.2),
            bodyMaterial
        );
        wing.position.set(0, 0, z > 0 ? 0.15 : -0.15);
        wing.name = 'wing';
        bird.add(wing);
    });
    
    // Schwanz
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.08), bodyMaterial);
    tail.position.set(-0.18, 0, 0);
    bird.add(tail);
    
    return bird;
}

// ==========================================
// SPIELER (FIRST-PERSON)
// ==========================================
function createPlayer() {
    // Spieler-Objekt für Position/Kollision
    player = new THREE.Object3D();
    player.position.set(0, GROUND_LEVEL, 0); // Augenhöhe ca. 1.7m
    scene.add(player);
    
    playerVelocity = new THREE.Vector3();

    // First-Person Hände erstellen
    createFirstPersonHands();
    
    // Sichtbaren Körper erstellen (Beine)
    createPlayerBody();
}

function createPlayerBody() {
    playerBody = new THREE.Group();
    
    const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, roughness: 0.8 });
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.6 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xE8BEAC, roughness: 0.7 });
    
    // Beine (sichtbar wenn man nach unten schaut)
    [-0.15, 0.15].forEach(x => {
        // Oberschenkel
        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.07, 0.5, 12),
            pantsMaterial
        );
        thigh.position.set(x, 1.15, 0);
        thigh.castShadow = true;
        playerBody.add(thigh);
        
        // Knie
        const knee = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 12, 12),
            pantsMaterial
        );
        knee.position.set(x, 0.9, 0);
        playerBody.add(knee);
        
        // Unterschenkel
        const shin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.055, 0.45, 12),
            pantsMaterial
        );
        shin.position.set(x, 0.6, 0);
        shin.castShadow = true;
        playerBody.add(shin);
        
        // Schuh
        const shoe = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.08, 0.25),
            shoeMaterial
        );
        shoe.position.set(x, 0.04, 0.03);
        shoe.castShadow = true;
        playerBody.add(shoe);
    });
    
    scene.add(playerBody);
}

function createFirstPersonHands() {
    playerHands = new THREE.Group();
    
    // Realistische Haut-Textur Material
    const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xE8BEAC,
        roughness: 0.7,
        metalness: 0.0
    });

    // Ärmel Material
    const sleeveMaterial = new THREE.MeshStandardMaterial({
        color: 0x2C3E50,
        roughness: 0.8
    });

    // Linke Hand
    const leftHand = createRealisticHand(skinMaterial, sleeveMaterial);
    leftHand.position.set(-0.35, -0.3, -0.5);
    leftHand.rotation.set(0.3, 0.2, 0.1);
    playerHands.add(leftHand);

    // Rechte Hand
    const rightHand = createRealisticHand(skinMaterial, sleeveMaterial);
    rightHand.position.set(0.35, -0.3, -0.5);
    rightHand.rotation.set(0.3, -0.2, -0.1);
    rightHand.scale.x = -1; // Spiegeln
    playerHands.add(rightHand);

    // Tüte/Tasche für Aliens (wird sichtbar wenn Aliens gesammelt)
    const bagGeometry = new THREE.Group();
    
    // Papiertüte
    const bagBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.3, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 })
    );
    bagGeometry.add(bagBody);
    
    // Tüten-Öffnung
    const bagTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.05, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x6B5344 })
    );
    bagTop.position.y = 0.15;
    bagGeometry.add(bagTop);
    
    bagGeometry.position.set(0.4, -0.35, -0.4);
    bagGeometry.rotation.set(0.2, -0.3, 0);
    bagGeometry.visible = false;
    bagGeometry.name = 'bag';
    
    bagMesh = bagGeometry;
    playerHands.add(bagMesh);

    // Hände zur Kamera hinzufügen (bewegen sich mit Kamera)
    camera.add(playerHands);
}

function createRealisticHand(skinMaterial, sleeveMaterial) {
    const hand = new THREE.Group();

    // Unterarm/Ärmel
    const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.25, 12),
        sleeveMaterial
    );
    forearm.position.set(0, 0.15, 0);
    forearm.rotation.x = Math.PI / 2;
    hand.add(forearm);

    // Handgelenk
    const wrist = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 12, 12),
        skinMaterial
    );
    wrist.scale.set(1, 0.7, 1);
    hand.add(wrist);

    // Handfläche
    const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.1),
        skinMaterial
    );
    palm.position.set(0, -0.02, -0.06);
    hand.add(palm);

    // Finger (mit CylinderGeometry statt CapsuleGeometry für r128 Kompatibilität)
    const fingerPositions = [
        { x: -0.025, z: -0.12, length: 0.06 },  // Zeigefinger
        { x: 0, z: -0.13, length: 0.07 },        // Mittelfinger
        { x: 0.025, z: -0.12, length: 0.06 },   // Ringfinger
        { x: 0.045, z: -0.10, length: 0.05 }    // Kleiner Finger
    ];

    fingerPositions.forEach(pos => {
        const finger = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, pos.length, 8),
            skinMaterial
        );
        finger.position.set(pos.x, -0.02, pos.z - pos.length/2);
        finger.rotation.x = Math.PI / 2;
        hand.add(finger);
        
        // Fingerspitze
        const fingerTip = new THREE.Mesh(
            new THREE.SphereGeometry(0.012, 6, 6),
            skinMaterial
        );
        fingerTip.position.set(pos.x, -0.02, pos.z - pos.length);
        hand.add(fingerTip);
    });

    // Daumen
    const thumb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8),
        skinMaterial
    );
    thumb.position.set(-0.055, -0.01, -0.04);
    thumb.rotation.set(Math.PI / 2, 0.5, 0);
    hand.add(thumb);
    
    // Daumenspitze
    const thumbTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 6, 6),
        skinMaterial
    );
    thumbTip.position.set(-0.07, -0.01, -0.06);
    hand.add(thumbTip);

    return hand;
}

// ==========================================
// EVENT LISTENER
// ==========================================
function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);
    
    // Buttons mit optionaler Prüfung
    const startBtn = document.getElementById('start-button');
    if (startBtn) startBtn.addEventListener('click', startGame);
    
    const restartBtn = document.getElementById('restart-button');
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    
    const playAgainBtn = document.getElementById('play-again-button');
    if (playAgainBtn) playAgainBtn.addEventListener('click', restartGame);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': case 'ArrowUp': keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft': keys.left = true; break;
        case 'KeyD': case 'ArrowRight': keys.right = true; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
        case 'Space': 
            keys.jump = true; 
            handleJump();
            break;
        case 'KeyE': 
            keys.interact = true; 
            handleInteraction(); 
            break;
        case 'KeyF':
            // Truhe öffnen/schließen
            if (chestOpen) {
                closeChest();
            } else if (insideHouse && gameState === 'playing') {
                const chestWorldX = ISLAND_CENTER_X + 7;
                const chestWorldZ = -15 + 4;
                const cdx = camera.position.x - chestWorldX;
                const cdz = camera.position.z - chestWorldZ;
                if (Math.sqrt(cdx * cdx + cdz * cdz) < 4) {
                    openChestUI();
                }
            }
            break;
        case 'Escape':
            event.preventDefault();
            if (gameState === 'playing') {
                pauseGame();
            } else if (gameState === 'paused') {
                resumeGame();
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': case 'ArrowUp': keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft': keys.left = false; break;
        case 'KeyD': case 'ArrowRight': keys.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
        case 'Space': keys.jump = false; break;
        case 'KeyE': keys.interact = false; break;
    }
}

function handleJump() {
    if (!isJumping && gameState === 'playing') {
        isJumping = true;
        jumpVelocity = JUMP_FORCE;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// SPIELLOGIK
// ==========================================

// Diese Funktion wird vom Menü-System aufgerufen
function initGame() {
    gameState = 'playing';
    resetGame();

    ensureAudioReady();
    if (audioManager) {
        audioManager.startMusic();
    }
    
    // Pointer Lock aktivieren
    const canvas = document.getElementById('game-canvas');
    canvas.requestPointerLock();
}

// Alte startGame Funktion für Kompatibilität
function startGame() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
    
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.classList.add('hidden');
    
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
    
    gameState = 'playing';
    resetGame();

    ensureAudioReady();
    if (audioManager) {
        audioManager.startMusic();
    }
}

function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
    
    gameState = 'playing';
    resetGame();

    ensureAudioReady();
    if (audioManager) {
        audioManager.startMusic();
    }
}

function resetGame() {
    gameTime = 0;
    // Zurück zur Insel spawnen
    const spawnY = getIslandGroundHeight(ISLAND_CENTER_X, GROUND_LEVEL, 10) + GROUND_LEVEL;
    player.position.set(ISLAND_CENTER_X, spawnY, 10);
    playerOnBoat = false;
    boatMoving = false;
    boat.position.set(BOAT_ISLAND_X, 1, 0); // Boot bei der Insel
    boatDirection = 'toMainland';
    
    // First-Person Kamera zurücksetzen
    yaw = 0;
    pitch = 0;
    camera.position.set(ISLAND_CENTER_X, spawnY, 10);
    camera.rotation.set(0, 0, 0);
    
    collectedAliens = 0;
    deliveredAliens = 0;
    insideHouse = false;
    updateAlienCounter();
    
    // Gefängnisse zurücksetzen
    alienPrisons.forEach(prison => {
        prison.hasAlien = false;
        if (prison.alienMesh) prison.alienMesh.visible = false;
        const light = prison.mesh.getObjectByName('prisonLight');
        if (light) light.intensity = 0;
    });
    
    aliens.forEach(alien => {
        alien.visible = true;
        alien.userData.collected = false;
        alien.position.set((Math.random() - 0.5) * (CITY_BOUND * 2 - 20), 3, (Math.random() - 0.5) * (CITY_BOUND * 2 - 20));
    });

    police.forEach(cop => {
        cop.position.set((Math.random() - 0.5) * (MAINLAND_BOUND - 80) * 2, 2, (Math.random() - 0.5) * (MAINLAND_BOUND - 80) * 2);
    });

    const bag = player.getObjectByName('bag');
    if (bag) bag.material.opacity = 0;
    
    // Pointer Lock Hinweis anzeigen
    const pointerHint = document.getElementById('pointer-lock-hint');
    if (pointerHint) pointerHint.classList.add('visible');
}

function handleInteraction() {
    if (gameState !== 'playing') return;

    // Alien einsammeln
    aliens.forEach(alien => {
        if (!alien.userData.collected && alien.visible) {
            const distance = player.position.distanceTo(alien.position);
            if (distance < 4) {
                alien.visible = false;
                alien.userData.collected = true;
                collectedAliens++;
                updateAlienCounter();
                showMessage('Kind eingesammelt! 🧒');

                if (audioManager) audioManager.playSfx('collect');
                
                if (bagMesh) bagMesh.visible = true;
            }
        }
    });

    // Boot am Festland - Spieler muss in der Nähe vom Boot ODER Dock sein
    if (!playerOnBoat && !boatMoving) {
        const distanceToBoat = player.position.distanceTo(boat.position);
        const distanceToDock = player.position.distanceTo(boatDock.position);
        const nearMainlandBoat = (distanceToBoat < 12 || distanceToDock < 12) && boat.position.x < BOAT_SWITCH_X;
        
        if (nearMainlandBoat) {
            if (collectedAliens > 0) {
                playerOnBoat = true;
                boatMoving = true;
                boatDirection = 'toIsland';
                showMessage('Auf zur Insel mit den Kindern! 🚤');
                if (audioManager) audioManager.playSfx('boat');
            } else {
                showMessage('Sammle erst Kinder ein!');
                if (audioManager) audioManager.playSfx('error');
            }
        }
    }

    // Boot an der Insel - Spieler muss in der Nähe vom Boot ODER Insel-Dock sein
    if (!playerOnBoat && !boatMoving) {
        const distanceToBoat = player.position.distanceTo(boat.position);
        const distanceToIslandDock = player.position.distanceTo(islandDock.position);
        const nearIslandBoat = (distanceToBoat < 12 || distanceToIslandDock < 12) && boat.position.x >= BOAT_SWITCH_X;
        
        if (nearIslandBoat) {
            playerOnBoat = true;
            boatMoving = true;
            boatDirection = 'toMainland';
            showMessage('Zum Festland - Kinder sammeln! 🚤');
            if (audioManager) audioManager.playSfx('boat');
        }
    }

    // Prüfe ob Spieler im Haus ist (größeres Haus, 3 Stockwerke)
    updateInsideHouseStatus();

    // Aliens in Gefängnisse abliefern (im Haus)
    if (insideHouse && collectedAliens > 0) {
        // Finde ein leeres Gefängnis
        const emptyPrison = alienPrisons.find(p => !p.hasAlien);
        if (emptyPrison) {
            emptyPrison.hasAlien = true;
            emptyPrison.alienMesh.visible = true;
            
            // Licht einschalten
            const light = emptyPrison.mesh.getObjectByName('prisonLight');
            if (light) light.intensity = 1;
            
            deliveredAliens += 1;
            collectedAliens -= 1;
            showMessage(`Kind eingesperrt! 🔒 (${deliveredAliens}/${TOTAL_ALIENS})`);
            updateAlienCounter();

            if (audioManager) audioManager.playSfx('deliver');
            
            // Tasche aktualisieren
            if (collectedAliens === 0 && bagMesh) {
                bagMesh.visible = false;
            }

            if (deliveredAliens >= TOTAL_ALIENS) {
                gameWon();
            }
        } else {
            showMessage('Alle Gefängnisse sind voll! 🏆');
            if (audioManager) audioManager.playSfx('error');
        }
    }
}

function showMessage(text) {
    const msgElement = document.getElementById('status-message');
    msgElement.textContent = text;
    msgElement.classList.add('visible');
    setTimeout(() => msgElement.classList.remove('visible'), 2000);
}

// ==========================================
// TRUHE / LAGER SYSTEM
// ==========================================
function openChestUI() {
    chestOpen = true;
    document.exitPointerLock();
    const popup = document.getElementById('chest-popup');
    if (popup) popup.classList.remove('hidden');
    updateChestUI();
}

function closeChest() {
    chestOpen = false;
    const popup = document.getElementById('chest-popup');
    if (popup) popup.classList.add('hidden');
    // Re-lock pointer
    const canvas = renderer.domElement;
    canvas.requestPointerLock();
}

function storeItemInChest() {
    if (collectedAliens > 0) {
        collectedAliens--;
        chestItems.push({ type: 'kid', time: Date.now() });
        updateAlienCounter();
        updateChestUI();
        showMessage('Kind in Truhe gelegt! 📦');
        if (collectedAliens === 0 && bagMesh) bagMesh.visible = false;
    } else {
        showMessage('Keine Kinder zum Einlagern!');
    }
}

function takeItemFromChest() {
    if (chestItems.length > 0) {
        chestItems.pop();
        collectedAliens++;
        updateAlienCounter();
        updateChestUI();
        showMessage('Kind aus Truhe genommen! 🧒');
        if (bagMesh) bagMesh.visible = true;
    } else {
        showMessage('Truhe ist leer!');
    }
}

function updateChestUI() {
    const container = document.getElementById('chest-items');
    if (!container) return;
    if (chestItems.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">Truhe ist leer</p>';
    } else {
        container.innerHTML = chestItems.map((item, i) => 
            `<div style="background:#3a3a3a;border-radius:8px;padding:8px;text-align:center;">🧒 Kind ${i + 1}</div>`
        ).join('');
    }
}

window.closeChest = closeChest;
window.storeItemInChest = storeItemInChest;
window.takeItemFromChest = takeItemFromChest;

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    document.exitPointerLock();
    if (audioManager) {
        audioManager.stopMusic();
    }
    const pausePopup = document.getElementById('pause-popup');
    if (pausePopup) pausePopup.classList.remove('hidden');
}

function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    const pausePopup = document.getElementById('pause-popup');
    if (pausePopup) pausePopup.classList.add('hidden');
    ensureAudioReady();
    if (audioManager) {
        audioManager.startMusic();
    }
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.requestPointerLock();
}

function backToMenuFromPause() {
    gameState = 'start';
    document.exitPointerLock();
    if (audioManager) {
        audioManager.stopMusic();
    }
    const pausePopup = document.getElementById('pause-popup');
    if (pausePopup) pausePopup.classList.add('hidden');
    const settingsPopup = document.getElementById('settings-popup');
    if (settingsPopup) settingsPopup.classList.add('hidden');

    if (typeof backToMenu === 'function') {
        backToMenu();
    } else {
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.classList.remove('hidden');
        const hud = document.getElementById('hud');
        if (hud) hud.classList.add('hidden');
    }
}

function updateAlienCounter() {
    document.getElementById('alien-count').textContent = 
        `${collectedAliens} (${deliveredAliens}/${TOTAL_ALIENS} abgeliefert)`;
}

function gameOver() {
    gameState = 'gameover';
    document.exitPointerLock();

    if (audioManager) audioManager.playSfx('lose');
    
    // Menü-System benachrichtigen
    if (typeof onGameOver === 'function') {
        onGameOver(deliveredAliens);
    } else {
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    
    document.getElementById('hud').classList.add('hidden');
}

function gameWon() {
    gameState = 'win';
    document.exitPointerLock();

    if (audioManager) audioManager.playSfx('win');
    
    // Menü-System benachrichtigen
    if (typeof onGameWin === 'function') {
        onGameWin(deliveredAliens);
    } else {
        document.getElementById('win-screen').classList.remove('hidden');
    }
    
    document.getElementById('hud').classList.add('hidden');
}

function updateViewDistance(distance) {
    if (!camera || !scene || !scene.fog) return;
    const clamped = Math.max(250, Math.min(1400, distance || 700));
    camera.far = clamped;
    camera.updateProjectionMatrix();
    scene.fog.density = 1 / (clamped * 0.65);
}

// Einstellungen vom Menü
function applyGameSettings(settings) {
    if (!settings) return;
    ensureAudioReady();
    if (audioManager) {
        audioManager.setVolumes(settings);
    }
    if (settings.viewDistance) {
        updateViewDistance(settings.viewDistance);
    }
    if (typeof settings.shadows === 'boolean' && renderer) {
        renderer.shadowMap.enabled = settings.shadows;
    }
}

window.ensureAudioReady = ensureAudioReady;

// ==========================================
// SPIELER BEWEGUNG (FIRST-PERSON)
// ==========================================
function updatePlayer(deltaTime) {
    if (gameState !== 'playing' || playerOnBoat) return;

    const groundHeight = isOnIsland() ? getIslandGroundHeight(player.position.x, player.position.y, player.position.z) : getTerrainHeightAt(player.position.x, player.position.z);
    const groundY = groundHeight + GROUND_LEVEL;

    // Sprint-Ausdauer verwalten
    updateStamina();
    
    const baseSpeed = 0.15;
    const canSprintNow = keys.sprint && canSprint && stamina > 0;
    const sprintMultiplier = canSprintNow ? 1.8 : 1.0;
    const speed = baseSpeed * sprintMultiplier;
    
    const direction = new THREE.Vector3();

    // Bewegungsrichtung basierend auf Kamera-Rotation (yaw)
    const forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
    );
    const right = new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
    );

    if (keys.forward) direction.add(forward);
    if (keys.backward) direction.sub(forward);
    if (keys.left) direction.sub(right);
    if (keys.right) direction.add(right);

    const isMoving = direction.length() > 0;
    
    if (isMoving) {
        direction.normalize();
        
        // Neue Position berechnen
        const newX = player.position.x + direction.x * speed;
        const newZ = player.position.z + direction.z * speed;
        
        // Kollisionsprüfung mit Gebäuden
        if (!checkBuildingCollision(newX, newZ)) {
            player.position.x = newX;
            player.position.z = newZ;
        } else {
            // Versuche nur eine Richtung
            if (!checkBuildingCollision(newX, player.position.z)) {
                player.position.x = newX;
            } else if (!checkBuildingCollision(player.position.x, newZ)) {
                player.position.z = newZ;
            }
        }
    }

    // Springen / Gravitation
    if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity -= GRAVITY;
        
        if (player.position.y <= groundY) {
            player.position.y = groundY;
            isJumping = false;
            jumpVelocity = 0;
        }
    } else {
        player.position.y = groundY;
    }

    // Kopfwackeln beim Laufen (nur am Boden)
    let bobOffset = 0;
    if (isMoving && !isJumping) {
        const bobSpeed = canSprintNow ? 14 : 10;
        const bobAmount = canSprintNow ? 0.05 : 0.03;
        bobOffset = Math.sin(gameTime * bobSpeed) * bobAmount;
    }

    // Grenzen - Festland
    if (!isOnIsland()) {
        player.position.x = Math.max(-MAINLAND_BOUND, Math.min(MAINLAND_BOUND, player.position.x));
        player.position.z = Math.max(-MAINLAND_BOUND, Math.min(MAINLAND_BOUND, player.position.z));
    } else {
        // Grenzen - Insel
        const distFromIslandCenter = Math.sqrt(
            Math.pow(player.position.x - ISLAND_CENTER_X, 2) + Math.pow(player.position.z - ISLAND_CENTER_Z, 2)
        );
        if (distFromIslandCenter > ISLAND_RADIUS - 2) {
            const angle = Math.atan2(player.position.z - ISLAND_CENTER_Z, player.position.x - ISLAND_CENTER_X);
            player.position.x = ISLAND_CENTER_X + Math.cos(angle) * (ISLAND_RADIUS - 2);
            player.position.z = ISLAND_CENTER_Z + Math.sin(angle) * (ISLAND_RADIUS - 2);
        }
    }

    updateInsideHouseStatus();

    // Kamera-Position aktualisieren
    camera.position.x = player.position.x;
    camera.position.z = player.position.z;
    camera.position.y = player.position.y + bobOffset;

    // Kamera-Rotation basierend auf Maus
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    
    // Interaktions-Hinweise anzeigen
    updateInteractionHints();
    
    // Spieler-Körper aktualisieren (sichtbare Beine/Arme)
    updatePlayerBody();
}

function updateStamina() {
    const staminaBar = document.getElementById('stamina-bar');
    const isMoving = keys.forward || keys.backward || keys.left || keys.right;
    
    if (keys.sprint && isMoving && canSprint) {
        // Ausdauer verbrauchen
        stamina -= STAMINA_DRAIN;
        if (stamina <= 0) {
            stamina = 0;
            canSprint = false;
        }
        if (staminaBar) staminaBar.classList.add('low');
    } else {
        // Ausdauer regenerieren
        stamina += STAMINA_REGEN;
        if (stamina >= MAX_STAMINA) {
            stamina = MAX_STAMINA;
            canSprint = true;
        }
        if (stamina > 30) {
            canSprint = true;
        }
        if (staminaBar) {
            staminaBar.classList.remove('low');
            if (stamina < MAX_STAMINA) {
                staminaBar.classList.add('recovering');
            } else {
                staminaBar.classList.remove('recovering');
            }
        }
    }
    
    // UI aktualisieren
    if (staminaBar) {
        staminaBar.style.width = `${(stamina / MAX_STAMINA) * 100}%`;
    }
}

function updateInteractionHints() {
    const hintElement = document.getElementById('interaction-hint');
    if (!hintElement) return;
    
    let hint = '';
    
    // Alien in der Nähe?
    aliens.forEach(alien => {
        if (!alien.userData.collected && alien.visible) {
            const distance = player.position.distanceTo(alien.position);
            if (distance < 5) {
                hint = '[E] Kind einsammeln';
            }
        }
    });
    
    // Boot in der Nähe?
    if (!hint && !playerOnBoat) {
        const distToBoat = player.position.distanceTo(boat.position);
        const distToDock = player.position.distanceTo(boatDock.position);
        const distToIslandDock = player.position.distanceTo(islandDock.position);
        
        // Boot am Festland
        if ((distToBoat < 15 || distToDock < 15) && boat.position.x < BOAT_SWITCH_X) {
            hint = collectedAliens > 0 ? '[E] Boot zur Insel nehmen' : '[E] Boot (sammle erst Kinder!)';
        } 
        // Boot an der Insel
        else if ((distToBoat < 15 || distToIslandDock < 15) && boat.position.x >= BOAT_SWITCH_X) {
            hint = '[E] Boot zum Festland nehmen';
        }
    }
    
    // Haus in der Nähe?
    if (!hint && collectedAliens > 0) {
        const distToHouse = player.position.distanceTo(house.position);
        if (distToHouse < 15) {
            hint = '[E] Kinder im Haus abliefern';
        }
    }

    // Truhe in der Nähe? (im Haus)
    if (!hint && insideHouse && storageChest) {
        const chestWorldX = ISLAND_CENTER_X + 7;
        const chestWorldZ = -15 + 4;
        const dx = camera.position.x - chestWorldX;
        const dz = camera.position.z - chestWorldZ;
        if (Math.sqrt(dx * dx + dz * dz) < 4) {
            hint = '[F] Truhe öffnen';
        }
    }
    
    if (hint) {
        hintElement.textContent = hint;
        hintElement.classList.add('visible');
    } else {
        hintElement.classList.remove('visible');
    }
}

function updatePlayerBody() {
    if (!playerBody) return;
    
    // Beine folgen dem Spieler
    playerBody.position.copy(player.position);
    playerBody.position.y = player.position.y - GROUND_LEVEL;
    playerBody.rotation.y = yaw;
}

function isOnIsland() {
    return player.position.x > ISLAND_THRESHOLD_X;
}

function isInsideMainHouseBounds(px, pz, padding = 0) {
    const houseX = ISLAND_CENTER_X;
    const houseZ = -15;
    const halfW = 22 / 2;
    const halfD = 18 / 2;
    return (
        px > houseX - halfW + padding &&
        px < houseX + halfW - padding &&
        pz > houseZ - halfD + padding &&
        pz < houseZ + halfD - padding
    );
}

function isInsideVillaBounds(px, pz, padding = 0) {
    const villaX = ISLAND_CENTER_X + 30;
    const villaZ = 25;
    const halfW = 28 / 2;
    const halfD = 22 / 2;
    return (
        px > villaX - halfW + padding &&
        px < villaX + halfW - padding &&
        pz > villaZ - halfD + padding &&
        pz < villaZ + halfD - padding
    );
}

function updateInsideHouseStatus() {
    insideHouse = isInsideMainHouseBounds(player.position.x, player.position.z, 0.4);
}

function getIslandGroundHeight(px, py, pz) {
    // Base island surface
    let ground = 2;
    const feetY = py - GROUND_LEVEL;
    
    // Check if player is inside main house (3 floors)
    const houseX = ISLAND_CENTER_X;
    const houseZ = -15;
    const HOUSE_W = 22;
    const HOUSE_D = 18;
    const houseHalfW = HOUSE_W / 2;
    const houseHalfD = HOUSE_D / 2;
    const inHouseX = px > houseX - houseHalfW && px < houseX + houseHalfW;
    const inHouseZ = pz > houseZ - houseHalfD && pz < houseZ + houseHalfD;
    
    if (inHouseX && inHouseZ) {
        // Floor heights (world-space): EG=3.15, 1.OG=7.15, 2.OG=11.15
        const floor0 = 3.15;
        const floor1 = 7.15;
        const floor2 = 11.15;
        // Find the highest floor based on Füße statt Augenhöhe
        if (feetY >= floor2 - 0.3) {
            ground = floor2;
        } else if (feetY >= floor1 - 0.3) {
            ground = floor1;
        } else {
            ground = floor0;
        }
        // On stairs (right side, back area) - smooth ramp
        const stairX = houseX + houseHalfW - 2; // right side near wall
        if (px > stairX - 3 && px < stairX + 1) {
            const stairStartZ = houseZ - houseHalfD + 1.5;
            const stairRun = 0.8 * 10;
            const stairProgress = (pz - stairStartZ) / stairRun; // 0-1 entlang der Treppe
            const clampedProgress = Math.max(0, Math.min(1, stairProgress));
            // Check which floor transition
            if (feetY < floor1 - 0.2) {
                ground = floor0 + clampedProgress * 4;
            } else if (feetY < floor2 - 0.2) {
                ground = floor1 + clampedProgress * 4;
            }
        }
    } else {
        // Veranda vorne (gleiches Niveau wie EG)
        const onPorch =
            px > houseX - (houseHalfW + 2) &&
            px < houseX + (houseHalfW + 2) &&
            pz >= houseZ + houseHalfD &&
            pz <= houseZ + houseHalfD + 6;
        if (onPorch) ground = 3.15;
    }
    
    // Check if in villa (Keller+EG+OG1)
    const villaX = ISLAND_CENTER_X + 30;
    const villaZ = 25;
    const VW = 28, VD = 22;
    const inVillaX = px > villaX - VW / 2 && px < villaX + VW / 2;
    const inVillaZ = pz > villaZ - VD / 2 && pz < villaZ + VD / 2;
    
    if (inVillaX && inVillaZ) {
        // Villa floors (world-space): Keller=-1.85, EG=2.15, OG1=6.15
        const vFloor0 = -1.85;
        const vFloor1 = 2.15;
        const vFloor2 = 6.15;
        if (feetY >= vFloor2 - 0.3) {
            ground = vFloor2;
        } else if (feetY >= vFloor1 - 0.3) {
            ground = vFloor1;
        } else {
            ground = vFloor0;
        }
        // Villa stairs
        const vStairX = villaX + VW / 2 - 2;
        if (px > vStairX - 3 && px < vStairX + 1) {
            const stairStartZ = villaZ - VD / 2 + 1.5;
            const stairRun = 0.9 * 10;
            const stairProgress = (pz - stairStartZ) / stairRun;
            const cp = Math.max(0, Math.min(1, stairProgress));
            if (feetY < vFloor1 - 0.2) {
                ground = vFloor0 + cp * 4;
            } else if (feetY < vFloor2 - 0.2) {
                ground = vFloor1 + cp * 4;
            }
        }
    } else {
        const onVillaVeranda =
            px > villaX - (VW / 2 + 2) &&
            px < villaX + (VW / 2 + 2) &&
            pz >= villaZ + VD / 2 &&
            pz <= villaZ + VD / 2 + 5;
        if (onVillaVeranda) ground = 2.15;
    }
    
    return ground;
}

// Gebäude-Kollision prüfen
function checkBuildingCollision(x, z) {
    for (const collider of buildingColliders) {
        if (x + PLAYER_RADIUS > collider.minX && 
            x - PLAYER_RADIUS < collider.maxX &&
            z + PLAYER_RADIUS > collider.minZ && 
            z - PLAYER_RADIUS < collider.maxZ) {
            return true; // Kollision!
        }
    }
    return false;
}

// ==========================================
// BOOT BEWEGUNG
// ==========================================
function updateBoat() {
    if (!boatMoving) return;

    const boatSpeed = 0.3; // Schnelleres Boot
    
    if (boatDirection === 'toIsland') {
        boat.position.x += boatSpeed;
        if (boat.position.x >= BOAT_ISLAND_X) {
            boat.position.x = BOAT_ISLAND_X;
            boatMoving = false;
            playerOnBoat = false;
            // Spieler auf Insel-Dock absetzen
            const islandDockY = getIslandGroundHeight(BOAT_ISLAND_X, GROUND_LEVEL, 5) + GROUND_LEVEL;
            player.position.set(BOAT_ISLAND_X, islandDockY, 5);
            camera.position.set(BOAT_ISLAND_X, islandDockY, 5);
            showMessage('Willkommen auf der Insel! Geh ins Haus! 🏝️');
        }
    } else {
        boat.position.x -= boatSpeed;
        if (boat.position.x <= BOAT_MAINLAND_X) {
            boat.position.x = BOAT_MAINLAND_X;
            boatMoving = false;
            playerOnBoat = false;
            // Spieler auf Festland-Dock absetzen
            const groundHeight = getTerrainHeightAt(BOAT_MAINLAND_X, 0);
            player.position.set(BOAT_MAINLAND_X, groundHeight + GROUND_LEVEL, 0);
            camera.position.set(BOAT_MAINLAND_X, groundHeight + GROUND_LEVEL, 0);
            showMessage('In der Stadt! Sammle Kinder! 🌆');
        }
    }

    // Spieler folgt Boot während der Fahrt
    if (playerOnBoat) {
        player.position.x = boat.position.x;
        player.position.z = boat.position.z;
        player.position.y = 4;
        camera.position.x = boat.position.x;
        camera.position.z = boat.position.z;
        camera.position.y = 4;
    }

    // Boot schaukelt
    const time = gameTime;
    boat.position.y = 1 + Math.sin(time * 2) * 0.15;
    boat.rotation.z = Math.sin(time * 1.5) * 0.03;
    boat.rotation.x = Math.sin(time * 1.8) * 0.02;
}

// ==========================================
// POLIZEI KI
// ==========================================
function updatePolice() {
    if (gameState !== 'playing') return;

    const playerOnMainland = !isOnIsland();

    police.forEach(cop => {
        if (playerOnMainland && collectedAliens > 0) {
            const direction = new THREE.Vector3();
            direction.subVectors(player.position, cop.position);
            direction.y = 0;
            direction.normalize();

            cop.position.x += direction.x * cop.userData.speed * 2.5;
            cop.position.z += direction.z * cop.userData.speed * 2.5;
            cop.lookAt(player.position.x, cop.position.y, player.position.z);

            if (cop.position.distanceTo(player.position) < 2) {
                gameOver();
            }
        } else {
            const direction = new THREE.Vector3();
            direction.subVectors(cop.userData.patrolTarget, cop.position);
            direction.y = 0;
            
            if (direction.length() < 2) {
                cop.userData.patrolTarget = new THREE.Vector3(
                    (Math.random() - 0.5) * (MAINLAND_BOUND - 80) * 2, 2, (Math.random() - 0.5) * (MAINLAND_BOUND - 80) * 2
                );
            } else {
                direction.normalize();
                cop.position.x += direction.x * cop.userData.speed;
                cop.position.z += direction.z * cop.userData.speed;
                cop.lookAt(cop.userData.patrolTarget);
            }
        }

        cop.position.x = Math.max(-MAINLAND_BOUND, Math.min(MAINLAND_BOUND, cop.position.x));
        cop.position.z = Math.max(-MAINLAND_BOUND, Math.min(MAINLAND_BOUND, cop.position.z));
        cop.position.y = getTerrainHeightAt(cop.position.x, cop.position.z) + 0.1;
    });

    const hudElement = document.getElementById('hud');
    let policeNear = false;
    police.forEach(cop => {
        if (cop.position.distanceTo(player.position) < 20) policeNear = true;
    });
    
    if (policeNear && playerOnMainland) {
        hudElement.classList.add('police-warning');
    } else {
        hudElement.classList.remove('police-warning');
    }
}

// ==========================================
// ANIMATIONEN
// ==========================================
function updateAliens() {
    const time = gameTime * 2;
    aliens.forEach(alien => {
        if (alien.visible && !alien.userData.collected) {
            // Kinder laufen leicht herum
            const groundHeight = getTerrainHeightAt(alien.position.x, alien.position.z);
            alien.position.y = groundHeight + 0.1 + Math.sin(time + alien.userData.bobOffset) * 0.03;

            if (!alien.userData.moveTarget || Math.random() < 0.006) {
                alien.userData.moveTarget = new THREE.Vector3(
                    (Math.random() - 0.5) * (CITY_BOUND * 2 - 20),
                    alien.position.y,
                    (Math.random() - 0.5) * (CITY_BOUND * 2 - 20)
                );
            }

            const target = alien.userData.moveTarget;
            const direction = new THREE.Vector3(
                target.x - alien.position.x,
                0,
                target.z - alien.position.z
            );

            const distance = direction.length();
            if (distance > 1.5) {
                direction.normalize();
                const kidSpeed = 0.03;
                alien.position.x += direction.x * kidSpeed;
                alien.position.z += direction.z * kidSpeed;
                alien.rotation.y = Math.atan2(direction.x, direction.z);
            }

            // Im Bereich bleiben
            alien.position.x = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, alien.position.x));
            alien.position.z = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, alien.position.z));
        }
    });
}

function updateWater() {
    const time = gameTime * 0.5;
    const positions = water.geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const wave = Math.sin(x * 0.03 + time * 3) * 0.5 + Math.cos(y * 0.03 + time * 2) * 0.5;
        positions.setZ(i, wave);
    }
    positions.needsUpdate = true;

    if (water.material && water.material.bumpMap) {
        water.material.bumpMap.offset.x = time * 0.02;
        water.material.bumpMap.offset.y = time * 0.015;
        water.material.bumpMap.needsUpdate = true;
    }
}

function updateCamera() {
    // First-Person Kamera - folgt dem Spieler direkt
    // Die Rotation wird bereits in updatePlayer() gesetzt
    // Hier nur für Boot-Modus oder andere Spezialfälle
    
    if (playerOnBoat && boat) {
        // Wenn auf dem Boot, Kamera auf Boot setzen
        camera.position.x = boat.position.x;
        camera.position.y = boat.position.y + 3;
        camera.position.z = boat.position.z;
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }
}

// ==========================================
// ANIMATIONS-LOOP
// ==========================================
function stepGame(deltaTime) {
    if (gameState === 'playing') {
        gameTime += deltaTime;
        updateDayNightCycle();
        updatePlayer(deltaTime);
        updateBoat();
        updatePolice();
        updateAliens();
        updateNPCs();
        updateAnimals();
        updateVehicles();
        updateSeaLife();
        updateSeaBoats();
        updateWater();
    }

    updateCamera();
}

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    stepGame(deltaTime);
    renderer.render(scene, camera);
}

// ==========================================
// FAHRZEUG UPDATE
// ==========================================
function updateVehicles() {
    vehicles.forEach(car => {
        if (car.userData.type !== 'driving') return;

        const speed = car.userData.speed;
        const direction = car.userData.direction;
        const laneOffset = car.userData.laneOffset;

        if (car.userData.turnCooldown > 0) {
            car.userData.turnCooldown -= 1;
        }

        if (car.userData.axis === 'z') {
            car.position.z += speed * direction;
            car.position.x = car.userData.roadCoord + laneOffset;

            if (car.position.z > ROAD_LIMIT) car.position.z = -ROAD_LIMIT;
            if (car.position.z < -ROAD_LIMIT) car.position.z = ROAD_LIMIT;

            for (let i = 0; i < CITY_ROADS.length; i++) {
                const intersection = CITY_ROADS[i];
                if (Math.abs(car.position.z - intersection) < 1.2 && car.userData.turnCooldown === 0) {
                    if (Math.random() < 0.3) {
                        car.userData.axis = 'x';
                        car.userData.roadCoord = intersection;
                        car.userData.direction = Math.random() < 0.5 ? 1 : -1;
                        car.userData.turnCooldown = 60;
                    }
                    break;
                }
            }
        } else {
            car.position.x += speed * direction;
            car.position.z = car.userData.roadCoord + laneOffset;

            if (car.position.x > ROAD_LIMIT) car.position.x = -ROAD_LIMIT;
            if (car.position.x < -ROAD_LIMIT) car.position.x = ROAD_LIMIT;

            for (let i = 0; i < CITY_ROADS.length; i++) {
                const intersection = CITY_ROADS[i];
                if (Math.abs(car.position.x - intersection) < 1.2 && car.userData.turnCooldown === 0) {
                    if (Math.random() < 0.3) {
                        car.userData.axis = 'z';
                        car.userData.roadCoord = intersection;
                        car.userData.direction = Math.random() < 0.5 ? 1 : -1;
                        car.userData.turnCooldown = 60;
                    }
                    break;
                }
            }
        }

        if (car.userData.axis === 'z') {
            car.rotation.y = car.userData.direction > 0 ? 0 : Math.PI;
        } else {
            car.rotation.y = car.userData.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
        }

        car.position.y = getTerrainHeightAt(car.position.x, car.position.z) + 0.5;
        
        // Räder drehen
        car.children.forEach(child => {
            if (child.geometry && child.geometry.type === 'CylinderGeometry' && child.position.y < 0.5) {
                child.rotation.x += speed * 0.3;
            }
        });
    });
}

// ==========================================
// NPC UPDATE
// ==========================================
function updateNPCs() {
    npcs.forEach(npc => {
        if (!npc.userData.target) return;
        
        const target = npc.userData.target;
        const direction = new THREE.Vector3(
            target.x - npc.position.x,
            0,
            target.z - npc.position.z
        );
        
        const distance = direction.length();
        
        if (distance < 2) {
            // Neues Ziel setzen (auf Straßen)
            const streetPositions = npc.userData.streetPositions || [];
            if (streetPositions.length) {
                const next = streetPositions[Math.floor(Math.random() * streetPositions.length)];
                npc.userData.target = new THREE.Vector3(next.x, 0, next.z);
            } else {
                npc.userData.target = new THREE.Vector3(
                    (Math.random() - 0.5) * (MAINLAND_BOUND - 80) * 2,
                    0,
                    (Math.random() - 0.5) * (MAINLAND_BOUND - 80) * 2
                );
            }
        } else {
            direction.normalize();
            npc.position.x += direction.x * npc.userData.speed;
            npc.position.z += direction.z * npc.userData.speed;
            npc.rotation.y = Math.atan2(direction.x, direction.z);
            
            // Lauf-Animation (leichtes Auf und Ab)
            npc.userData.walkTimer += 0.15;
        }
        
        const walkPhase = npc.userData.walkTimer || 0;
        const swing = Math.sin(walkPhase * 2.4 + (npc.userData.walkPhase || 0)) * 0.6;
        const limbs = npc.userData.limbs;
        if (limbs && limbs.arms && limbs.legs) {
            limbs.arms.forEach((arm, idx) => {
                const dir = idx === 0 ? 1 : -1;
                arm.upper.rotation.x = swing * dir * 0.4;
                arm.lower.rotation.x = swing * dir * 0.2;
            });
            limbs.legs.forEach((leg, idx) => {
                const dir = idx === 0 ? -1 : 1;
                leg.upper.rotation.x = swing * dir * 0.5;
                leg.lower.rotation.x = swing * dir * 0.3;
            });
        }

        // Im Bereich bleiben
        npc.position.x = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, npc.position.x));
        npc.position.z = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, npc.position.z));
        // Terrain-Höhe + Lauf-Animation
        const walkBob = Math.abs(Math.sin(walkPhase)) * 0.06;
        const npcScale = npc.userData.scale || 1;
        npc.position.y = getTerrainHeightAt(npc.position.x, npc.position.z) + 0.1 * npcScale + walkBob;
    });
}

// ==========================================
// TIER UPDATE
// ==========================================
function updateAnimals() {
    const time = gameTime;
    
    animals.forEach(animal => {
        if (animal.userData.type === 'bird') {
            // Vögel fliegen im Kreis
            animal.userData.angle += 0.01;
            const radius = 20 + Math.sin(time * 0.5) * 10;
            animal.position.x = animal.userData.circleCenter.x + Math.cos(animal.userData.angle) * radius;
            animal.position.z = animal.userData.circleCenter.z + Math.sin(animal.userData.angle) * radius;
            animal.position.y = animal.userData.flyHeight + Math.sin(time * 2) * 2;
            
            // Flugrichtung
            animal.rotation.y = animal.userData.angle + Math.PI / 2;
            
            // Flügel-Animation
            animal.children.forEach(child => {
                if (child.name === 'wing') {
                    child.rotation.x = Math.sin(time * 15) * 0.5;
                }
            });
        } else {
            // Hunde und Katzen laufen herum
            if (!animal.userData.target || Math.random() < 0.005) {
                animal.userData.target = new THREE.Vector3(
                    (Math.random() - 0.5) * (MAINLAND_BOUND - 120) * 2,
                    0,
                    (Math.random() - 0.5) * (MAINLAND_BOUND - 120) * 2
                );
            }
            
            const target = animal.userData.target;
            const direction = new THREE.Vector3(
                target.x - animal.position.x,
                0,
                target.z - animal.position.z
            );
            
            const distance = direction.length();
            
            if (distance > 1) {
                direction.normalize();
                animal.position.x += direction.x * animal.userData.speed;
                animal.position.z += direction.z * animal.userData.speed;
                animal.rotation.y = Math.atan2(direction.x, direction.z);
            }
            
            // Im Bereich bleiben
            animal.position.x = Math.max(-MAINLAND_BOUND + 40, Math.min(MAINLAND_BOUND - 40, animal.position.x));
            animal.position.z = Math.max(-MAINLAND_BOUND + 40, Math.min(MAINLAND_BOUND - 40, animal.position.z));
            animal.position.y = getTerrainHeightAt(animal.position.x, animal.position.z) + 0.1;
        }
    });
}

// ==========================================
// TEST / DEBUG HOOKS
// ==========================================
function renderGameToText() {
    if (!player) {
        return JSON.stringify({ mode: gameState, note: 'player not initialized' });
    }
    updateInsideHouseStatus();
    const dayPhase = (gameTime % DAY_LENGTH) / DAY_LENGTH;
    const round = (value) => Math.round(value * 10) / 10;
    const visibleAliens = aliens
        .filter(alien => alien.visible && !alien.userData.collected)
        .slice(0, 6)
        .map(alien => ({
            x: round(alien.position.x),
            y: round(alien.position.y),
            z: round(alien.position.z)
        }));

    const insideVilla = isInsideVillaBounds(player.position.x, player.position.z, 0.4);

    const payload = {
        mode: gameState,
        coords: 'x,z auf Bodenebene; y nach oben; Einheiten ~Meter',
        player: {
            x: round(player.position.x),
            y: round(player.position.y),
            z: round(player.position.z),
            yaw: round(yaw),
            pitch: round(pitch)
        },
        onIsland: isOnIsland(),
        timeOfDay: Math.round(dayPhase * 100) / 100,
        insideHouse,
        insideVilla,
        collectedAliens,
        deliveredAliens,
        totalAliens: TOTAL_ALIENS,
        boat: boat
            ? {
                  x: round(boat.position.x),
                  y: round(boat.position.y),
                  z: round(boat.position.z),
                  moving: boatMoving,
                  direction: boatDirection
              }
            : null,
        aliensVisible: visibleAliens,
        policeNearby: police.some(cop => cop.position.distanceTo(player.position) < 20)
    };

    return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
    const step = 1 / 60;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) {
        stepGame(step);
    }
    renderer.render(scene, camera);
};

// ==========================================
// SPIEL STARTEN
// ==========================================
init();
