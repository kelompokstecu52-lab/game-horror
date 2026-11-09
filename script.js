let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isPlaying = false;

let solvedPuzzles = 0;
const totalPuzzles = 3;
let currentActivePuzzleIndex = null;
let raycaster = new THREE.Raycaster();

let flashlight;
let ghost;
let ghostAngle = 0;

let minimapCtx, minimapCanvas;

const puzzles = [
    { question: "Berapakah hasil dari: 12 + 8 × 2 ?", answer: 28, hint: "Gunakan aturan prioritas perkalian (Kabataku)." },
    { question: "Jika sebuah angka dikalikan 5, lalu dikurangi 7, hasilnya adalah 18. Berapakah angka tersebut?", answer: 5, hint: "Gunakan persamaan aljabar: 5x - 7 = 18." },
    { question: "Berapakah nilai dari 2 pangkat 4 (2⁴) ditambah 10?", answer: 26, hint: "Hitung nilai perpangkatan terlebih dahulu." }
];

const interactiveAltars = [];

function init() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.10);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 14);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x050508, 1.2);
    scene.add(ambientLight);

    // Senter yang dipegang pemain
    flashlight = new THREE.SpotLight(0xffffee, 3.8, 25, Math.PI / 6, 0.5, 1);
    flashlight.position.set(0, 0, 0);
    camera.add(flashlight);
    flashlight.target.position.set(0, 0, -1);
    camera.add(flashlight.target);
    scene.add(camera);

    createClassroomEnvironment();
    createAltars();
    createGhost();

    minimapCanvas = document.getElementById('minimap-canvas');
    minimapCtx = minimapCanvas.getContext('2d');

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('click', onClick);

    const canvasElement = renderer.domElement;
    canvasElement.addEventListener('click', () => {
        if (isPlaying && !document.getElementById('puzzle-modal').classList.contains('active')) {
            canvasElement.requestPointerLock();
        }
    });

    document.addEventListener('mousemove', onMouseMove);
}

// Membuat Suasana Ruang Kelas Horror
function createClassroomEnvironment() {
    // Lantai ubin kelas
    const floorGeo = new THREE.PlaneGeometry(30, 35);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Plafon
    const ceiling = new THREE.Mesh(floorGeo, floorMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    scene.add(ceiling);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.7 });
    
    // Dinding Kelas (Utara, Selatan, Timur, Barat)
    const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(30, 5, 1), wallMat);
    wallNorth.position.set(0, 2.5, -17.5);
    scene.add(wallNorth);

    const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(30, 5, 1), wallMat);
    wallSouth.position.set(0, 2.5, 17.5);
    scene.add(wallSouth);

    const wallEast = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 35), wallMat);
    wallEast.position.set(15, 2.5, 0);
    scene.add(wallEast);

    const wallWest = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 35), wallMat);
    wallWest.position.set(-15, 2.5, 0);
    scene.add(wallWest);

    // Papan Tulis Hitam di Dinding Depan Kelas
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x0a1c12, roughness: 0.5 });
    const blackboard = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 0.2), boardMat);
    blackboard.position.set(0, 2.8, -17);
    scene.add(blackboard);

    // Dekorasi Meja-meja Siswa Kosong di Kelas
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 });
    for (let x = -8; x <= 8; x += 8) {
        for (let z = -6; z <= 6; z += 6) {
            const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.2), deskMat);
            desk.position.set(x, 0.5, z);
            scene.add(desk);
        }
    }
}

// Meja Altar Ujian Matematika
function createAltars() {
    const altarPositions = [
        { x: -8, z: -10, id: 0 },
        { x: 8, z: -10, id: 1 },
        { x: 0, z: 2, id: 2 }
    ];

    altarPositions.forEach(pos => {
        const group = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a0000, roughness: 0.4 });
        
        // Meja Guru / Altar Ujian khusus
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.5), baseMat);
        base.position.y = 0.55;
        group.add(base);

        // Kristal Ujian Misterius
        const crystalGeo = new THREE.OctahedronGeometry(0.35);
        const crystalMat = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000, 
            emissiveIntensity: 0.9,
            roughness: 0.2 
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = 1.5;
        group.add(crystal);

        group.position.set(pos.x, 0, pos.z);
        group.userData = { puzzleId: pos.id, solved: false, crystalMesh: crystal };
        
        scene.add(group);
        interactiveAltars.push(group);
    });
}

// Entitas Hantu Guru Berpatroli
function createGhost() {
    const ghostGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.8 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.8, 8), bodyMat);
    body.position.y = 1.4;
    ghostGroup.add(body);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    leftEye.position.set(-0.25, 2.3, 0.4);
    ghostGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    rightEye.position.set(0.25, 2.3, 0.4);
    ghostGroup.add(rightEye);

    ghostGroup.position.set(0, 0, -5);
    scene.add(ghostGroup);
    ghost = ghostGroup;
}

let euler = new THREE.Euler(0, 0, 0, 'YXZ');
function onMouseMove(event) {
    if (document.pointerLockElement === renderer.domElement) {
        const movementX = event.movementX || event.mozMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || 0;

        euler.setFromQuaternion(camera.quaternion);
        euler.y -= movementX * 0.002;
        euler.x -= movementY * 0.002;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onClick() {
    if (!isPlaying) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        let parentGroup = obj;
        while (parentGroup.parent && parentGroup.parent !== scene) {
            parentGroup = parentGroup.parent;
        }

        if (interactiveAltars.includes(parentGroup)) {
            const distance = camera.position.distanceTo(parentGroup.position);
            if (distance < 4) {
                if (parentGroup.userData.solved) {
                    document.getElementById('status-display').innerText = "Status: Ujian meja ini sudah selesai!";
                } else {
                    openPuzzle(parentGroup.userData.puzzleId);
                }
            }
        }
    }
}

function openPuzzle(puzzleId) {
    currentActivePuzzleIndex = puzzleId;
    document.exitPointerLock();

    const puzzle = puzzles[puzzleId];
    document.getElementById('puzzle-question').innerHTML = `${puzzle.question}<br><br><small style="color:#ff8888;">Petunjuk: ${puzzle.hint}</small>`;
    document.getElementById('puzzle-answer-input').value = '';
    document.getElementById('puzzle-modal').style.display = 'block';
    setTimeout(() => document.getElementById('puzzle-modal').classList.add('active'), 10);
}

document.getElementById('submit-answer-btn').addEventListener('click', () => {
    const userAnswer = parseInt(document.getElementById('puzzle-answer-input').value);
    const correctPuzzle = puzzles[currentActivePuzzleIndex];

    if (userAnswer === correctPuzzle.answer) {
        document.getElementById('puzzle-modal').classList.remove('active');
        setTimeout(() => document.getElementById('puzzle-modal').style.display = 'none', 300);

        const altar = interactiveAltars.find(a => a.userData.puzzleId === currentActivePuzzleIndex);
        if (altar) {
            altar.userData.solved = true;
            altar.userData.crystalMesh.material.color.setHex(0x00ff88);
            altar.userData.crystalMesh.material.emissive.setHex(0x00ff88);
        }

        solvedPuzzles++;
        document.getElementById('score-display').innerText = `Teka-Teki Selesai: ${solvedPuzzles} / ${totalPuzzles}`;

        if (solvedPuzzles >= totalPuzzles) {
            triggerVictory();
        } else {
            document.getElementById('status-display').innerText = "Status: Benar! Cari meja ujian berikutnya.";
        }
    } else {
        triggerJumpscare();
    }
});

function triggerJumpscare() {
    const flash = document.getElementById('flash');
    flash.style.opacity = '0.8';
    setTimeout(() => { flash.style.opacity = '0'; }, 150);
    document.getElementById('status-display').innerText = "Status: JAWABAN SALAH! Guru hantu mendekat!";
}

function triggerVictory() {
    document.getElementById('status-display').innerText = "STATUS: PINTU KELAS TERBUKA! ANDA LULUS!";
    alert("SELAMAT! Anda berhasil menyelesaikan semua soal ujian matematika di kelas terkutuk ini.");
    location.reload();
}

// Fungsi Menggambar Peta Mini di Canvas Pojok Kiri
function drawMinimap() {
    if (!minimapCtx) return;
    minimapCtx.clearRect(0, 0, 120, 120);

    // Background Peta
    minimapCtx.fillStyle = "#111";
    minimapCtx.fillRect(0, 0, 120, 120);

    // Skala koordinat kelas ke canvas minimap (Map 30x35 -> Canvas 120x120)
    const scaleX = 120 / 30;
    const scaleZ = 120 / 35;

    // Gambar Altar Ujian di Peta
    interactiveAltars.forEach(altar => {
        let mx = (altar.position.x + 15) * scaleX;
        let mz = (altar.position.z + 17.5) * scaleZ;
        minimapCtx.fillStyle = altar.userData.solved ? "#00ff88" : "#ff3333";
        minimapCtx.beginPath();
        minimapCtx.arc(mx, mz, 3.5, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    // Gambar Posisi Hantu Guru di Peta
    let hx = (ghost.position.x + 15) * scaleX;
    let hz = (ghost.position.z + 17.5) * scaleZ;
    minimapCtx.fillStyle = "#aa00ff";
    minimapCtx.beginPath();
    minimapCtx.arc(hx, hz, 3, 0, Math.PI * 2);
    minimapCtx.fill();

    // Gambar Posisi Pemain (Player) di Peta
    let px = (camera.position.x + 15) * scaleX;
    let pz = (camera.position.z + 17.5) * scaleZ;
    minimapCtx.fillStyle = "#ffffff";
    minimapCtx.beginPath();
    minimapCtx.arc(px, pz, 4, 0, Math.PI * 2);
    minimapCtx.fill();
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    if (isPlaying) {
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 22.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 22.0 * delta;

        camera.translateX(-velocity.x * delta);
        camera.translateZ(-velocity.z * delta);

        camera.position.x = Math.max(-14, Math.min(14, camera.position.x));
        camera.position.z = Math.max(-16, Math.min(16, camera.position.z));

        // Pergerakan Hantu Guru Mengelilingi Kelas
        ghostAngle += delta * 0.7;
        ghost.position.x = Math.cos(ghostAngle) * 7;
        ghost.position.z = Math.sin(ghostAngle) * 7;
        ghost.rotation.y = -ghostAngle;

        if (camera.position.distanceTo(ghost.position) < 2.5) {
            triggerJumpscare();
            camera.position.x += (Math.random() - 0.5) * 3;
            camera.position.z += (Math.random() - 0.5) * 3;
        }

        interactiveAltars.forEach(altar => {
            altar.userData.crystalMesh.rotation.y += 0.02;
            altar.userData.crystalMesh.position.y = 1.5 + Math.sin(time * 0.003) * 0.1;
        });

        drawMinimap();
    }

    prevTime = time;
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    isPlaying = true;
    init();
    animate();
    renderer.domElement.requestPointerLock();
});