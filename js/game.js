/**
 * Alien Sammler - 3D Spiel
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
let collectedAliens = 0;
let deliveredAliens = 0;
const TOTAL_ALIENS = 8;

// Spielzustand
let gameState = 'start';
let playerOnBoat = false;
let boatMoving = false;
let boatDirection = 'toIsland';

// Zeit für Animationen
let clock;

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
const GROUND_LEVEL = 3.5;  // Augenhöhe über dem Boden

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
    
    // Szene erstellen
    scene = new THREE.Scene();
    
    // Realistischer Himmel
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.004); // Stärkerer Nebel für Performance

    // First-Person Kamera mit reduzierter Sichtweite
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.5,
        500  // Reduzierte Sichtweite
    );
    // Spawnpoint auf der Insel vor dem Haus
    camera.position.set(280, 6, 10); // Auf der Insel (Höhe 6 = Inselboden + Augenhöhe)

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; // Schnellere Schatten
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

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
// REALISTISCHE BELEUCHTUNG
// ==========================================
function setupLights() {
    // Ambient Light - wärmer für realistischen Look
    const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    scene.add(ambientLight);

    // Hauptsonne - warmes Nachmittagslicht
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    sunLight.position.set(150, 300, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Fülllicht (bläulich vom Himmel)
    const fillLight = new THREE.DirectionalLight(0x8899cc, 0.4);
    fillLight.position.set(-100, 100, -50);
    scene.add(fillLight);

    // Hemisphere Light für natürliche Umgebungsbeleuchtung
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4a7c4a, 0.6);
    scene.add(hemiLight);
}

// ==========================================
// WELT ERSTELLEN
// ==========================================
function createWorld() {
    createWater();
    createMainland();
    createCity();
    createIsland();
    createBoatSystem();
    createHouse();
    createAliens();
    createPolice();
    createVehicles();
    createNPCs();      // Zivilisten
    createAnimals();   // Tiere
}

// ==========================================
// REALISTISCHES WASSER
// ==========================================
function createWater() {
    const waterGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x006994,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        metalness: 0.8
    });
    
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
    // Hauptland - 400x400
    const mainlandGeometry = new THREE.BoxGeometry(400, 3, 400);
    const mainlandMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d2d2d,
        roughness: 0.9,
        metalness: 0.1
    });
    
    mainland = new THREE.Mesh(mainlandGeometry, mainlandMaterial);
    mainland.position.set(0, 0, 0);
    mainland.receiveShadow = true;
    mainland.castShadow = true;
    scene.add(mainland);

    createParks();
    createStreets();
}

// ==========================================
// STRAßEN
// ==========================================
function createStreets() {
    const streetMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.95
    });
    
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8
    });

    // Hauptstraßen (Horizontal)
    for (let z = -180; z <= 180; z += 60) {
        const street = new THREE.Mesh(
            new THREE.BoxGeometry(380, 0.2, 15),
            streetMaterial
        );
        street.position.set(0, 1.6, z);
        street.receiveShadow = true;
        scene.add(street);
        
        // Mittelstreifen
        for (let x = -180; x <= 180; x += 10) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(5, 0.25, 0.3),
                new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
            );
            line.position.set(x, 1.75, z);
            scene.add(line);
        }

        // Gehwege
        const sidewalk1 = new THREE.Mesh(
            new THREE.BoxGeometry(380, 0.3, 3),
            sidewalkMaterial
        );
        sidewalk1.position.set(0, 1.65, z + 9);
        scene.add(sidewalk1);

        const sidewalk2 = new THREE.Mesh(
            new THREE.BoxGeometry(380, 0.3, 3),
            sidewalkMaterial
        );
        sidewalk2.position.set(0, 1.65, z - 9);
        scene.add(sidewalk2);
    }

    // Hauptstraßen (Vertikal)
    for (let x = -180; x <= 180; x += 60) {
        const street = new THREE.Mesh(
            new THREE.BoxGeometry(15, 0.2, 380),
            streetMaterial
        );
        street.position.set(x, 1.6, 0);
        street.receiveShadow = true;
        scene.add(street);
        
        for (let z = -180; z <= 180; z += 10) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.25, 5),
                new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
            );
            line.position.set(x, 1.75, z);
            scene.add(line);
        }
    }
}

// ==========================================
// PARKS
// ==========================================
function createParks() {
    const parkPositions = [
        { x: -150, z: -150, size: 40 },
        { x: 150, z: 150, size: 35 },
        { x: -100, z: 100, size: 30 },
        { x: 100, z: -100, size: 25 }
    ];

    parkPositions.forEach(park => {
        const grass = new THREE.Mesh(
            new THREE.BoxGeometry(park.size, 0.5, park.size),
            new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9 })
        );
        grass.position.set(park.x, 1.8, park.z);
        grass.receiveShadow = true;
        scene.add(grass);

        for (let i = 0; i < 8; i++) {
            const tree = createRealisticTree();
            tree.position.set(
                park.x + (Math.random() - 0.5) * park.size * 0.8,
                1.5,
                park.z + (Math.random() - 0.5) * park.size * 0.8
            );
            scene.add(tree);
        }

        for (let i = 0; i < 3; i++) {
            const bench = createBench();
            bench.position.set(
                park.x + (Math.random() - 0.5) * park.size * 0.5,
                2,
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
    
    createStreetLights();
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
            
            // Fensterglas mit leichter Spiegelung
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2.2, 0.05),
                new THREE.MeshStandardMaterial({ 
                    color: 0x87CEEB, 
                    roughness: 0.1, 
                    metalness: 0.3,
                    transparent: true,
                    opacity: 0.85
                })
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
            const sideWindow = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 1.8, 1.8),
                new THREE.MeshStandardMaterial({ 
                    color: 0x87CEEB, 
                    roughness: 0.1, 
                    metalness: 0.3,
                    transparent: true,
                    opacity: 0.85
                })
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
    
    building.position.set(x, 0, z);
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
                createStreetLight(x + offset, z);
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

// Straßenlaterne erstellen
function createStreetLight(x, z) {
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
    
    light.position.set(x, 0, z);
    scene.add(light);
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
// STRAßENLATERNEN
// ==========================================
function createStreetLights() {
    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        roughness: 0.3,
        metalness: 0.8
    });

    for (let x = -180; x <= 180; x += 30) {
        for (let z = -180; z <= 180; z += 60) {
            [-12, 12].forEach(offset => {
                const lamp = createStreetLight(poleMaterial);
                lamp.position.set(x, 1.5, z + offset);
                scene.add(lamp);
            });
        }
    }
}

function createStreetLight(poleMaterial) {
    const lamp = new THREE.Group();

    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 6, 8),
        poleMaterial
    );
    pole.position.y = 3;
    pole.castShadow = true;
    lamp.add(pole);

    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.1, 0.1),
        poleMaterial
    );
    arm.position.set(1, 5.8, 0);
    lamp.add(arm);

    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.3, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    housing.position.set(1.8, 5.65, 0);
    lamp.add(housing);

    const lightMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.1, 0.4),
        new THREE.MeshStandardMaterial({
            color: 0xFFE4B5,
            emissive: 0xFFE4B5,
            emissiveIntensity: 0.5
        })
    );
    lightMesh.position.set(1.8, 5.45, 0);
    lamp.add(lightMesh);

    return lamp;
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
    const islandGeometry = new THREE.CylinderGeometry(40, 45, 4, 64);
    const islandMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9 });
    island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.position.set(280, 0, 0);
    island.receiveShadow = true;
    island.castShadow = true;
    scene.add(island);

    // Sandstrand
    const beach = new THREE.Mesh(
        new THREE.TorusGeometry(42, 5, 4, 64),
        new THREE.MeshStandardMaterial({ color: 0xF5DEB3, roughness: 0.95 })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(280, 1, 0);
    scene.add(beach);

    // Felsen
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 35 + Math.random() * 10;
        const rock = createRock();
        rock.position.set(280 + Math.cos(angle) * distance, 1, Math.sin(angle) * distance);
        scene.add(rock);
    }

    // Palmen
    for (let i = 0; i < 20; i++) {
        const palm = createPalmTree();
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 30;
        palm.position.set(280 + Math.cos(angle) * distance, 2, Math.sin(angle) * distance);
        scene.add(palm);
    }

    // Tropische Pflanzen
    for (let i = 0; i < 30; i++) {
        const plant = createTropicalPlant();
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 35;
        plant.position.set(280 + Math.cos(angle) * distance, 2, Math.sin(angle) * distance);
        scene.add(plant);
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
    boatDock.position.set(200, 1.5, 0);
    boatDock.castShadow = true;
    scene.add(boatDock);

    // Hafenpfeiler
    for (let i = -1; i <= 1; i++) {
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0x3d2817 })
        );
        pillar.position.set(204, 0, i * 6);
        pillar.castShadow = true;
        scene.add(pillar);
    }

    islandDock = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 15), dockMaterial);
    islandDock.position.set(235, 1.5, 0);
    islandDock.castShadow = true;
    scene.add(islandDock);

    createBoat();
}

function createBoat() {
    boat = new THREE.Group();

    const hull = new THREE.Mesh(
        new THREE.BoxGeometry(4, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0xF5F5DC, roughness: 0.5 })
    );
    hull.castShadow = true;
    boat.add(hull);

    const bottom = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.5, 7.8),
        new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.6 })
    );
    bottom.position.y = -0.75;
    boat.add(bottom);

    const interior = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.8, 7),
        new THREE.MeshStandardMaterial({ color: 0xDEB887 })
    );
    interior.position.y = 0.6;
    boat.add(interior);

    const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3000, roughness: 0.7 })
    );
    mast.position.set(0, 5, 0);
    mast.castShadow = true;
    boat.add(mast);

    const sail = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 5),
        new THREE.MeshStandardMaterial({ color: 0xFFFFF0, side: THREE.DoubleSide, roughness: 0.4 })
    );
    sail.position.set(1.5, 5.5, 0);
    sail.rotation.y = Math.PI / 2;
    sail.castShadow = true;
    boat.add(sail);

    const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.05, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x4a3000, roughness: 0.6 })
    );
    wheel.position.set(0, 1.5, -3);
    wheel.rotation.x = Math.PI / 2;
    boat.add(wheel);

    boat.position.set(240, 1, 0); // Boot startet bei der Insel
    scene.add(boat);
}

// ==========================================
// HAUS AUF DER INSEL (BEGEHBAR MIT ALIEN-GEFÄNGNISSEN)
// ==========================================
let alienPrisons = [];
let insideHouse = false;

function createHouse() {
    house = new THREE.Group();
    alienPrisons = [];

    const houseX = 280;
    const houseZ = -10;
    const floorY = 2;

    // Fundament
    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(20, 1, 16),
        new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 })
    );
    foundation.position.y = 0.5;
    foundation.castShadow = true;
    house.add(foundation);

    // Boden (innen)
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.3, 14),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
    );
    floor.position.y = 1.15;
    floor.receiveShadow = true;
    house.add(floor);

    // Wände mit Türöffnung
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFACD, roughness: 0.8 });
    
    // Rückwand
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(18, 8, 0.5),
        wallMaterial
    );
    backWall.position.set(0, 5.15, -7);
    backWall.castShadow = true;
    house.add(backWall);

    // Linke Wand
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 8, 14),
        wallMaterial
    );
    leftWall.position.set(-9, 5.15, 0);
    leftWall.castShadow = true;
    house.add(leftWall);

    // Rechte Wand
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 8, 14),
        wallMaterial
    );
    rightWall.position.set(9, 5.15, 0);
    rightWall.castShadow = true;
    house.add(rightWall);

    // Vorderwand mit Türöffnung (links)
    const frontWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(6, 8, 0.5),
        wallMaterial
    );
    frontWallLeft.position.set(-6, 5.15, 7);
    frontWallLeft.castShadow = true;
    house.add(frontWallLeft);

    // Vorderwand mit Türöffnung (rechts)
    const frontWallRight = new THREE.Mesh(
        new THREE.BoxGeometry(6, 8, 0.5),
        wallMaterial
    );
    frontWallRight.position.set(6, 5.15, 7);
    frontWallRight.castShadow = true;
    house.add(frontWallRight);

    // Vorderwand über Tür
    const frontWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(6, 3, 0.5),
        wallMaterial
    );
    frontWallTop.position.set(0, 7.65, 7);
    frontWallTop.castShadow = true;
    house.add(frontWallTop);

    // Dach
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(14, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 })
    );
    roof.position.y = 12;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // Schornstein
    const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x8B0000 })
    );
    chimney.position.set(4, 13, 3);
    chimney.castShadow = true;
    house.add(chimney);

    // Innenbeleuchtung
    const insideLight = new THREE.PointLight(0xffcc77, 1, 20);
    insideLight.position.set(0, 6, 0);
    house.add(insideLight);

    // ==========================================
    // ALIEN-GEFÄNGNISSE IM HAUS
    // ==========================================
    const prisonPositions = [
        { x: -6, z: -4 },
        { x: 0, z: -4 },
        { x: 6, z: -4 },
        { x: -6, z: 2 },
        { x: 6, z: 2 }
    ];

    prisonPositions.forEach((pos, index) => {
        const prison = createAlienPrison(index);
        prison.position.set(pos.x, 1.15, pos.z);
        house.add(prison);
        
        // Speichere die Weltposition für Kollisionserkennung
        alienPrisons.push({
            mesh: prison,
            localPos: pos,
            worldX: houseX + pos.x,
            worldZ: houseZ + pos.z,
            hasAlien: false,
            alienMesh: prison.getObjectByName('prisonAlien')
        });
    });

    // Fenster (außen)
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1
    });

    // Fenster links
    const windowLeft = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.3), windowMaterial);
    windowLeft.position.set(-6, 5, 7.2);
    house.add(windowLeft);

    // Fenster rechts
    const windowRight = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.3), windowMaterial);
    windowRight.position.set(6, 5, 7.2);
    house.add(windowRight);

    // Veranda
    const veranda = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.3, 5),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
    );
    veranda.position.set(0, 1.15, 10);
    veranda.castShadow = true;
    house.add(veranda);

    // Stufen zur Tür
    for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.3, 1),
            new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 })
        );
        step.position.set(0, 0.15 + i * 0.3, 8.5 + i);
        step.castShadow = true;
        house.add(step);
    }

    // Willkommens-Schild
    const signPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3000 })
    );
    signPost.position.set(-8, 2, 12);
    house.add(signPost);

    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    sign.position.set(-8, 3.2, 12);
    house.add(sign);

    house.position.set(houseX, floorY, houseZ);
    scene.add(house);
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
    
    // Autos auf Hauptstraßen (Nord-Süd) - reduziert
    [-100, 0, 100].forEach(x => {
        for (let i = 0; i < 2; i++) {
            const car = createCar();
            const startZ = (Math.random() - 0.5) * 350;
            const lane = Math.random() < 0.5 ? -3 : 3;
            car.position.set(x + lane, 0.5, startZ);
            car.rotation.y = lane > 0 ? 0 : Math.PI;
            car.userData = {
                type: 'driving',
                axis: 'z',
                direction: lane > 0 ? 1 : -1,
                speed: 0.15 + Math.random() * 0.1,
                lane: x + lane
            };
            vehicles.push(car);
            scene.add(car);
        }
    });
    
    // Autos auf Hauptstraßen (Ost-West) - reduziert
    [-100, 0, 100].forEach(z => {
        for (let i = 0; i < 2; i++) {
            const car = createCar();
            const startX = (Math.random() - 0.5) * 350;
            const lane = Math.random() < 0.5 ? -3 : 3;
            car.position.set(startX, 0.5, z + lane);
            car.rotation.y = lane > 0 ? Math.PI / 2 : -Math.PI / 2;
            car.userData = {
                type: 'driving',
                axis: 'x',
                direction: lane > 0 ? 1 : -1,
                speed: 0.15 + Math.random() * 0.1,
                lane: z + lane
            };
            vehicles.push(car);
            scene.add(car);
        }
    });
    
    // Einige geparkte Autos - reduziert
    for (let i = 0; i < 8; i++) {
        const car = createCar();
        const x = -180 + Math.random() * 360;
        const z = -180 + Math.random() * 360;
        car.position.set(x, 0.5, z);
        car.rotation.y = Math.random() * Math.PI * 2;
        car.userData = { type: 'parked' };
        vehicles.push(car);
        scene.add(car);
    }
}

function createCar() {
    const car = new THREE.Group();
    
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
                emissiveIntensity: 0.4,
                roughness: 0.1
            })
        );
        headlight.position.set(x, 0.55, 2.15);
        car.add(headlight);
    });
    
    // Rücklichter
    [-0.7, 0.7].forEach(x => {
        const taillight = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.15, 0.08),
            new THREE.MeshStandardMaterial({ 
                color: 0xFF0000, 
                emissive: 0x440000, 
                emissiveIntensity: 0.5,
                roughness: 0.2
            })
        );
        taillight.position.set(x, 0.55, -2.1);
        car.add(taillight);
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
    
    return car;
}

// ==========================================
// ALIENS
// ==========================================
function createAliens() {
    aliens = [];
    
    for (let i = 0; i < TOTAL_ALIENS; i++) {
        const alien = createAlien();
        alien.position.set((Math.random() - 0.5) * 350, 3, (Math.random() - 0.5) * 350);
        alien.userData = { collected: false, bobOffset: Math.random() * Math.PI * 2 };
        aliens.push(alien);
        scene.add(alien);
    }
}

function createAlien() {
    const alien = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.3
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), bodyMaterial);
    body.castShadow = true;
    alien.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), bodyMaterial);
    head.position.y = 1.2;
    head.scale.set(1, 1.2, 1);
    head.castShadow = true;
    alien.add(head);

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 0.9 });
    
    [-0.3, 0.3].forEach(x => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), eyeMaterial);
        eye.position.set(x, 1.3, 0.5);
        eye.scale.set(1, 1.5, 0.5);
        alien.add(eye);
    });

    const antennaMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00FF00, emissive: 0x00FF00, emissiveIntensity: 0.2 
    });
    
    [-0.25, 0.25].forEach(x => {
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 8), antennaMaterial);
        antenna.position.set(x, 2, 0);
        antenna.rotation.z = x > 0 ? -0.3 : 0.3;
        alien.add(antenna);

        const tip = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 1 })
        );
        tip.position.set(x > 0 ? x + 0.15 : x - 0.15, 2.3, 0);
        alien.add(tip);
    });

    // Glow
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 0.1 })
    );
    glow.position.y = 0.6;
    alien.add(glow);

    return alien;
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
    
    const npcCount = 20; // Reduziert für bessere Performance
    
    // Spawn-Positionen entlang der Straßen
    const streetPositions = [];
    [-100, 0, 100].forEach(mainCoord => {
        for (let i = -180; i <= 180; i += 40) {
            streetPositions.push({ x: mainCoord + (Math.random() - 0.5) * 8, z: i });
            streetPositions.push({ x: i, z: mainCoord + (Math.random() - 0.5) * 8 });
        }
    });
    
    for (let i = 0; i < npcCount; i++) {
        const npc = createCivilian();
        
        // Spawn auf Straßen/Gehwegen
        const spawnPos = streetPositions[Math.floor(Math.random() * streetPositions.length)];
        npc.position.set(spawnPos.x, 0.1, spawnPos.z);
        
        // Ziel auch auf Straße setzen
        const targetPos = streetPositions[Math.floor(Math.random() * streetPositions.length)];
        
        npc.userData = {
            speed: 0.03 + Math.random() * 0.02,
            target: new THREE.Vector3(targetPos.x, 0, targetPos.z),
            walkTimer: Math.random() * 10,
            streetPositions: streetPositions
        };
        npcs.push(npc);
        scene.add(npc);
    }
}

function createCivilian() {
    const npc = new THREE.Group();
    
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
    
    return npc;
}

// ==========================================
// TIERE
// ==========================================
function createAnimals() {
    animals = [];
    
    // Hunde (reduziert)
    for (let i = 0; i < 5; i++) {
        const dog = createDog();
        dog.position.set((Math.random() - 0.5) * 300, 0.1, (Math.random() - 0.5) * 300);
        dog.userData = { type: 'dog', speed: 0.05 + Math.random() * 0.03, target: null, state: 'idle' };
        animals.push(dog);
        scene.add(dog);
    }
    
    // Katzen (reduziert)
    for (let i = 0; i < 5; i++) {
        const cat = createCat();
        cat.position.set((Math.random() - 0.5) * 300, 0.1, (Math.random() - 0.5) * 300);
        cat.userData = { type: 'cat', speed: 0.04 + Math.random() * 0.02, target: null, state: 'idle' };
        animals.push(cat);
        scene.add(cat);
    }
    
    // Vögel am Himmel (reduziert)
    for (let i = 0; i < 25; i++) {
        const bird = createBird();
        // Vögel in Gruppen/Schwärmen
        const swarmX = (Math.random() - 0.5) * 500;
        const swarmZ = (Math.random() - 0.5) * 500;
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
}

function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
    
    gameState = 'playing';
    resetGame();
}

function resetGame() {
    // Zurück zur Insel spawnen
    player.position.set(280, 6, 10);
    playerOnBoat = false;
    boatMoving = false;
    boat.position.set(240, 1, 0); // Boot bei der Insel
    boatDirection = 'toMainland';
    
    // First-Person Kamera zurücksetzen
    yaw = 0;
    pitch = 0;
    camera.position.set(280, 6, 10); // Auf der Insel (Höhe 6)
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
        alien.position.set((Math.random() - 0.5) * 350, 3, (Math.random() - 0.5) * 350);
    });

    police.forEach(cop => {
        cop.position.set((Math.random() - 0.5) * 300, 2, (Math.random() - 0.5) * 300);
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
                showMessage('Alien eingesammelt! 👽');
                
                if (bagMesh) bagMesh.visible = true;
            }
        }
    });

    // Boot am Festland - Spieler muss in der Nähe vom Boot ODER Dock sein
    if (!playerOnBoat && !boatMoving) {
        const distanceToBoat = player.position.distanceTo(boat.position);
        const distanceToDock = player.position.distanceTo(boatDock.position);
        const nearMainlandBoat = (distanceToBoat < 12 || distanceToDock < 12) && boat.position.x < 225;
        
        if (nearMainlandBoat) {
            if (collectedAliens > 0) {
                playerOnBoat = true;
                boatMoving = true;
                boatDirection = 'toIsland';
                showMessage('Auf zur Insel mit den Aliens! 🚤');
            } else {
                showMessage('Sammle erst Aliens ein!');
            }
        }
    }

    // Boot an der Insel - Spieler muss in der Nähe vom Boot ODER Insel-Dock sein
    if (!playerOnBoat && !boatMoving) {
        const distanceToBoat = player.position.distanceTo(boat.position);
        const distanceToIslandDock = player.position.distanceTo(islandDock.position);
        const nearIslandBoat = (distanceToBoat < 12 || distanceToIslandDock < 12) && boat.position.x >= 225;
        
        if (nearIslandBoat) {
            playerOnBoat = true;
            boatMoving = true;
            boatDirection = 'toMainland';
            showMessage('Zum Festland - Aliens sammeln! 🚤');
        }
    }

    // Prüfe ob Spieler im Haus ist
    const houseX = 280;
    const houseZ = -10;
    const playerInHouseX = camera.position.x > houseX - 9 && camera.position.x < houseX + 9;
    const playerInHouseZ = camera.position.z > houseZ - 7 && camera.position.z < houseZ + 7;
    insideHouse = playerInHouseX && playerInHouseZ;

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
            showMessage(`Alien eingesperrt! 🔒 (${deliveredAliens}/${TOTAL_ALIENS})`);
            updateAlienCounter();
            
            // Tasche aktualisieren
            if (collectedAliens === 0 && bagMesh) {
                bagMesh.visible = false;
            }

            if (deliveredAliens >= TOTAL_ALIENS) {
                gameWon();
            }
        } else {
            showMessage('Alle Gefängnisse sind voll! 🏆');
        }
    }
}

function showMessage(text) {
    const msgElement = document.getElementById('status-message');
    msgElement.textContent = text;
    msgElement.classList.add('visible');
    setTimeout(() => msgElement.classList.remove('visible'), 2000);
}

function updateAlienCounter() {
    document.getElementById('alien-count').textContent = 
        `${collectedAliens} (${deliveredAliens}/${TOTAL_ALIENS} abgeliefert)`;
}

function gameOver() {
    gameState = 'gameover';
    document.exitPointerLock();
    
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
    
    // Menü-System benachrichtigen
    if (typeof onGameWin === 'function') {
        onGameWin(deliveredAliens);
    } else {
        document.getElementById('win-screen').classList.remove('hidden');
    }
    
    document.getElementById('hud').classList.add('hidden');
}

// ==========================================
// SPIELER BEWEGUNG (FIRST-PERSON)
// ==========================================
function updatePlayer(deltaTime) {
    if (gameState !== 'playing' || playerOnBoat) return;

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
        
        if (player.position.y <= GROUND_LEVEL) {
            player.position.y = GROUND_LEVEL;
            isJumping = false;
            jumpVelocity = 0;
        }
    }

    // Kopfwackeln beim Laufen (nur am Boden)
    let bobOffset = 0;
    if (isMoving && !isJumping) {
        const bobSpeed = canSprintNow ? 14 : 10;
        const bobAmount = canSprintNow ? 0.05 : 0.03;
        bobOffset = Math.sin(clock.elapsedTime * bobSpeed) * bobAmount;
    }

    // Grenzen - Festland
    if (!isOnIsland()) {
        player.position.x = Math.max(-195, Math.min(195, player.position.x));
        player.position.z = Math.max(-195, Math.min(195, player.position.z));
    } else {
        // Grenzen - Insel
        const distFromIslandCenter = Math.sqrt(
            Math.pow(player.position.x - 280, 2) + Math.pow(player.position.z, 2)
        );
        if (distFromIslandCenter > 38) {
            const angle = Math.atan2(player.position.z, player.position.x - 280);
            player.position.x = 280 + Math.cos(angle) * 38;
            player.position.z = Math.sin(angle) * 38;
        }
    }

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
                hint = '[E] Alien einsammeln';
            }
        }
    });
    
    // Boot in der Nähe?
    if (!hint && !playerOnBoat) {
        const distToBoat = player.position.distanceTo(boat.position);
        const distToDock = player.position.distanceTo(boatDock.position);
        const distToIslandDock = player.position.distanceTo(islandDock.position);
        
        // Boot am Festland
        if ((distToBoat < 15 || distToDock < 15) && boat.position.x < 225) {
            hint = collectedAliens > 0 ? '[E] Boot zur Insel nehmen' : '[E] Boot (sammle erst Aliens!)';
        } 
        // Boot an der Insel
        else if ((distToBoat < 15 || distToIslandDock < 15) && boat.position.x >= 225) {
            hint = '[E] Boot zum Festland nehmen';
        }
    }
    
    // Haus in der Nähe?
    if (!hint && collectedAliens > 0) {
        const distToHouse = player.position.distanceTo(house.position);
        if (distToHouse < 15) {
            hint = '[E] Aliens im Haus abliefern';
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
    playerBody.position.y = 0;
    playerBody.rotation.y = yaw;
}

function isOnIsland() {
    return player.position.x > 220;
}

// Gebäude-Kollision prüfen
function checkBuildingCollision(x, z) {
    const playerRadius = 1.0; // Spieler-Radius für Kollision
    
    for (const collider of buildingColliders) {
        if (x + playerRadius > collider.minX && 
            x - playerRadius < collider.maxX &&
            z + playerRadius > collider.minZ && 
            z - playerRadius < collider.maxZ) {
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
        if (boat.position.x >= 240) {
            boat.position.x = 240;
            boatMoving = false;
            playerOnBoat = false;
            // Spieler auf Insel-Dock absetzen
            player.position.set(240, 6, 5);
            camera.position.set(240, 6, 5);
            showMessage('Willkommen auf der Insel! Geh ins Haus! 🏝️');
        }
    } else {
        boat.position.x -= boatSpeed;
        if (boat.position.x <= 205) {
            boat.position.x = 205;
            boatMoving = false;
            playerOnBoat = false;
            // Spieler auf Festland-Dock absetzen
            player.position.set(195, 3.5, 0);
            camera.position.set(195, 3.5, 0);
            showMessage('In der Stadt! Sammle Aliens! 🌆');
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
    const time = Date.now() * 0.001;
    boat.position.y = 1 + Math.sin(time * 2) * 0.15;
    boat.rotation.z = Math.sin(time * 1.5) * 0.03;
    boat.rotation.x = Math.sin(time * 1.8) * 0.02;
}

// ==========================================
// POLIZEI KI
// ==========================================
function updatePolice() {
    if (gameState !== 'playing') return;

    const playerOnMainland = player.position.x < 200;

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
                    (Math.random() - 0.5) * 300, 2, (Math.random() - 0.5) * 300
                );
            } else {
                direction.normalize();
                cop.position.x += direction.x * cop.userData.speed;
                cop.position.z += direction.z * cop.userData.speed;
                cop.lookAt(cop.userData.patrolTarget);
            }
        }

        cop.position.x = Math.max(-195, Math.min(195, cop.position.x));
        cop.position.z = Math.max(-195, Math.min(195, cop.position.z));
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
    const time = Date.now() * 0.002;
    aliens.forEach(alien => {
        if (alien.visible && !alien.userData.collected) {
            // Schwebende Bewegung
            alien.position.y = 3 + Math.sin(time + alien.userData.bobOffset) * 0.4;
            alien.rotation.y += 0.015;
            
            // Aliens bewegen sich langsam herum
            if (!alien.userData.moveTarget || Math.random() < 0.003) {
                alien.userData.moveTarget = new THREE.Vector3(
                    (Math.random() - 0.5) * 350,
                    alien.position.y,
                    (Math.random() - 0.5) * 350
                );
            }
            
            const target = alien.userData.moveTarget;
            const direction = new THREE.Vector3(
                target.x - alien.position.x,
                0,
                target.z - alien.position.z
            );
            
            const distance = direction.length();
            if (distance > 3) {
                direction.normalize();
                const alienSpeed = 0.02;
                alien.position.x += direction.x * alienSpeed;
                alien.position.z += direction.z * alienSpeed;
            }
            
            // Im Bereich bleiben
            alien.position.x = Math.max(-180, Math.min(180, alien.position.x));
            alien.position.z = Math.max(-180, Math.min(180, alien.position.z));
        }
    });
}

function updateWater() {
    const time = Date.now() * 0.0005;
    const positions = water.geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const wave = Math.sin(x * 0.03 + time * 3) * 0.5 + Math.cos(y * 0.03 + time * 2) * 0.5;
        positions.setZ(i, wave);
    }
    positions.needsUpdate = true;
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
    }
}

// ==========================================
// ANIMATIONS-LOOP
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    if (gameState === 'playing') {
        updatePlayer(deltaTime);
        updateBoat();
        updatePolice();
        updateAliens();
        updateNPCs();
        updateAnimals();
        updateVehicles();
        updateWater();
    }

    updateCamera();
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
        
        if (car.userData.axis === 'z') {
            car.position.z += speed * direction;
            // Wenn Auto aus dem Bereich fährt, zurücksetzen
            if (car.position.z > 200) car.position.z = -200;
            if (car.position.z < -200) car.position.z = 200;
        } else {
            car.position.x += speed * direction;
            if (car.position.x > 200) car.position.x = -200;
            if (car.position.x < -200) car.position.x = 200;
        }
        
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
            // Neues Ziel setzen
            npc.userData.target = new THREE.Vector3(
                (Math.random() - 0.5) * 350,
                0,
                (Math.random() - 0.5) * 350
            );
        } else {
            direction.normalize();
            npc.position.x += direction.x * npc.userData.speed;
            npc.position.z += direction.z * npc.userData.speed;
            npc.rotation.y = Math.atan2(direction.x, direction.z);
            
            // Lauf-Animation (leichtes Auf und Ab)
            npc.userData.walkTimer += 0.15;
            npc.position.y = Math.abs(Math.sin(npc.userData.walkTimer)) * 0.05;
        }
        
        // Im Bereich bleiben
        npc.position.x = Math.max(-180, Math.min(180, npc.position.x));
        npc.position.z = Math.max(-180, Math.min(180, npc.position.z));
    });
}

// ==========================================
// TIER UPDATE
// ==========================================
function updateAnimals() {
    const time = clock.elapsedTime;
    
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
                    (Math.random() - 0.5) * 300,
                    0,
                    (Math.random() - 0.5) * 300
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
            animal.position.x = Math.max(-180, Math.min(180, animal.position.x));
            animal.position.z = Math.max(-180, Math.min(180, animal.position.z));
        }
    });
}

// ==========================================
// SPIEL STARTEN
// ==========================================
init();
