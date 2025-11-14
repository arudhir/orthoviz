// Import Three.js from CDN
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// ===== CONFIGURATION =====
const CONFIG = {
    planeSpacing: 8,
    planeTilt: Math.PI / 12, // ~15 degrees
    planeSize: { width: 20, height: 12 },
    nodeRadius: 0.25,
    pathwayLineWidth: 2,
    orthologLineWidth: 4,
    colors: {
        human_mito: 0x4FC3F7,    // Soft blue/cyan
        bacteria: 0xFFB74D,       // Amber/orange
        plant: 0x81C784,          // Green
        orthologBeam: [0xFF6B9D, 0xC371F5], // Pink to purple gradient
        background: 0x0a1628
    },
    animation: {
        introDelay: 500,
        planeDuration: 600,
        nodeStagger: 80,
        beamSpeed: 0.001
    }
};

// ===== GLOBAL STATE =====
const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    nodesData: new Map(),
    edgesData: [],
    meshes: {
        planes: [],
        nodes: [],
        pathwayEdges: [],
        orthologEdges: []
    },
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    hoveredNode: null,
    selectedNode: null,
    animationTime: 0,
    visibility: {
        human_mito: true,
        bacteria: true,
        plant: true,
        orthologs: true
    }
};

// ===== INITIALIZATION =====
async function init() {
    const loadingText = document.getElementById('loading').querySelector('p');

    try {
        console.log('Initializing app...');
        loadingText.textContent = 'Setting up 3D scene...';

        setupScene();
        setupCamera();
        setupRenderer();
        setupControls();
        setupLights();
        setupEventListeners();

        // Load data
        console.log('Loading data...');
        loadingText.textContent = 'Loading metabolic pathway data...';
        await loadData();

        // Create visualization
        console.log('Creating visualization...');
        loadingText.textContent = 'Creating 3D visualization...';
        createPlanes();
        createNodes();
        createEdges();

        // Start animation
        console.log('Starting animation...');
        loadingText.textContent = 'Rendering...';
        hideLoading();
        startIntroAnimation();
        animate();

        console.log('App initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        const loading = document.getElementById('loading');
        loading.querySelector('p').innerHTML = `<span style="color: #ff6b6b;">Error: ${error.message}</span><br><br>Check browser console for details.`;
        loading.querySelector('.spinner').style.display = 'none';
    }
}

function setupScene() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(CONFIG.colors.background);
    state.scene.fog = new THREE.Fog(CONFIG.colors.background, 20, 50);
}

function setupCamera() {
    state.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    state.camera.position.set(15, 12, 20);
    state.camera.lookAt(0, 0, 0);
}

function setupRenderer() {
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(state.renderer.domElement);
}

function setupControls() {
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.minDistance = 10;
    state.controls.maxDistance = 40;
    state.controls.maxPolarAngle = Math.PI * 0.8;
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 5);
    state.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x4FC3F7, 0.3);
    directionalLight2.position.set(-5, 5, -5);
    state.scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0x81C784, 0.5, 30);
    pointLight.position.set(0, 0, 0);
    state.scene.add(pointLight);
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);

    document.getElementById('close-card').addEventListener('click', closeInfoCard);

    // Layer toggles
    document.getElementById('toggle-human').addEventListener('change', (e) => {
        state.visibility.human_mito = e.target.checked;
        updateVisibility();
    });

    document.getElementById('toggle-bacteria').addEventListener('change', (e) => {
        state.visibility.bacteria = e.target.checked;
        updateVisibility();
    });

    document.getElementById('toggle-plant').addEventListener('change', (e) => {
        state.visibility.plant = e.target.checked;
        updateVisibility();
    });

    document.getElementById('toggle-orthologs').addEventListener('change', (e) => {
        state.visibility.orthologs = e.target.checked;
        updateVisibility();
    });
}

// ===== DATA LOADING =====
async function loadData() {
    try {
        const response = await fetch('data/demo_edges.json');

        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.nodes || !data.edges) {
            throw new Error('Invalid data format: missing nodes or edges');
        }

        // Process nodes
        data.nodes.forEach(node => {
            state.nodesData.set(node.id, node);
        });

        // Process edges
        state.edgesData = data.edges;

        console.log(`Loaded ${state.nodesData.size} nodes and ${state.edgesData.length} edges`);
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// ===== LAYOUT COMPUTATION =====
function computeNodePositions() {
    const layers = {
        human_mito: [],
        bacteria: [],
        plant: []
    };

    // Group nodes by layer
    state.nodesData.forEach((node, id) => {
        if (layers[node.layer]) {
            layers[node.layer].push(node);
        }
    });

    // Simple circular layout for each layer
    Object.keys(layers).forEach(layerName => {
        const nodes = layers[layerName];
        const radius = 6;
        const angleStep = (Math.PI * 2) / Math.max(nodes.length, 1);

        nodes.forEach((node, i) => {
            const angle = i * angleStep;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            // Assign base 2D position
            node.x = x;
            node.y = y;
        });
    });
}

function getNodePosition3D(node) {
    const layerZMap = {
        human_mito: CONFIG.planeSpacing,
        bacteria: 0,
        plant: -CONFIG.planeSpacing
    };

    const z = layerZMap[node.layer] || 0;

    // Apply tilt transformation
    const tilt = CONFIG.planeTilt;
    const rotatedY = node.y * Math.cos(tilt) - z * Math.sin(tilt);
    const rotatedZ = node.y * Math.sin(tilt) + z * Math.cos(tilt);

    return new THREE.Vector3(node.x, rotatedY, rotatedZ);
}

// ===== PLANE CREATION =====
function createPlanes() {
    const layers = [
        { name: 'human_mito', z: CONFIG.planeSpacing, color: CONFIG.colors.human_mito },
        { name: 'bacteria', z: 0, color: CONFIG.colors.bacteria },
        { name: 'plant', z: -CONFIG.planeSpacing, color: CONFIG.colors.plant }
    ];

    layers.forEach(layer => {
        const geometry = new THREE.PlaneGeometry(
            CONFIG.planeSize.width,
            CONFIG.planeSize.height
        );

        const material = new THREE.MeshPhysicalMaterial({
            color: layer.color,
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
            metalness: 0.2,
            roughness: 0.8,
            clearcoat: 0.3
        });

        const plane = new THREE.Mesh(geometry, material);

        // Position and rotate
        const tilt = CONFIG.planeTilt;
        const rotatedY = 0 * Math.cos(tilt) - layer.z * Math.sin(tilt);
        const rotatedZ = 0 * Math.sin(tilt) + layer.z * Math.cos(tilt);

        plane.position.set(0, rotatedY, rotatedZ);
        plane.rotation.x = tilt;

        // Add edge glow
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: layer.color,
            transparent: true,
            opacity: 0.3
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        plane.add(edges);

        plane.userData = { layer: layer.name };
        plane.visible = false; // Start hidden for animation

        state.scene.add(plane);
        state.meshes.planes.push(plane);
    });
}

// ===== NODE CREATION =====
function createNodes() {
    computeNodePositions();

    state.nodesData.forEach((node, id) => {
        const position = getNodePosition3D(node);

        // Node sphere
        const geometry = new THREE.SphereGeometry(CONFIG.nodeRadius, 16, 16);
        const material = new THREE.MeshPhysicalMaterial({
            color: CONFIG.colors[node.layer],
            emissive: CONFIG.colors[node.layer],
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.3,
            clearcoat: 0.5
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sphere.userData = {
            nodeId: id,
            nodeData: node,
            originalEmissiveIntensity: 0.3,
            originalScale: 1
        };

        // Add outer glow
        const glowGeometry = new THREE.SphereGeometry(CONFIG.nodeRadius * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.colors[node.layer],
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        sphere.add(glow);

        sphere.visible = false; // Start hidden for animation
        sphere.scale.set(0, 0, 0); // Start at zero scale

        state.scene.add(sphere);
        state.meshes.nodes.push(sphere);
    });
}

// ===== EDGE CREATION =====
function createEdges() {
    state.edgesData.forEach(edge => {
        if (edge.kind === 'pathway') {
            createPathwayEdge(edge);
        } else if (edge.kind === 'ortholog') {
            createOrthologEdge(edge);
        }
    });
}

function createPathwayEdge(edge) {
    const sourceNode = state.nodesData.get(edge.source);
    const targetNode = state.nodesData.get(edge.target);

    if (!sourceNode || !targetNode) return;

    const sourcePos = getNodePosition3D(sourceNode);
    const targetPos = getNodePosition3D(targetNode);

    const geometry = new THREE.BufferGeometry().setFromPoints([sourcePos, targetPos]);
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        linewidth: CONFIG.pathwayLineWidth
    });

    const line = new THREE.Line(geometry, material);
    line.userData = {
        edgeData: edge,
        kind: 'pathway',
        layer: edge.layer,
        sourceId: edge.source,
        targetId: edge.target
    };

    line.visible = false; // Start hidden for animation

    state.scene.add(line);
    state.meshes.pathwayEdges.push(line);
}

function createOrthologEdge(edge) {
    const sourceNode = state.nodesData.get(edge.source);
    const targetNode = state.nodesData.get(edge.target);

    if (!sourceNode || !targetNode) return;

    const sourcePos = getNodePosition3D(sourceNode);
    const targetPos = getNodePosition3D(targetNode);

    // Create tube geometry for glowing beam effect
    const curve = new THREE.LineCurve3(sourcePos, targetPos);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);

    // Create gradient material
    const material = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.orthologBeam[0],
        transparent: true,
        opacity: 0.6
    });

    const tube = new THREE.Mesh(tubeGeometry, material);
    tube.userData = {
        edgeData: edge,
        kind: 'ortholog',
        sourceId: edge.source,
        targetId: edge.target,
        animationOffset: Math.random() * Math.PI * 2
    };

    // Add outer glow
    const glowGeometry = new THREE.TubeGeometry(curve, 20, 0.15, 8, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.orthologBeam[1],
        transparent: true,
        opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    tube.add(glow);

    tube.visible = false; // Start hidden for animation

    state.scene.add(tube);
    state.meshes.orthologEdges.push(tube);
}

// ===== INTRO ANIMATION =====
function startIntroAnimation() {
    const { planes, nodes, pathwayEdges, orthologEdges } = state.meshes;

    // Animate planes
    setTimeout(() => {
        planes.forEach((plane, i) => {
            setTimeout(() => {
                plane.visible = true;
                animatePlaneIn(plane);
            }, i * CONFIG.animation.planeDuration);
        });
    }, CONFIG.animation.introDelay);

    // Animate nodes by layer
    const nodesByLayer = {
        human_mito: nodes.filter(n => n.userData.nodeData.layer === 'human_mito'),
        bacteria: nodes.filter(n => n.userData.nodeData.layer === 'bacteria'),
        plant: nodes.filter(n => n.userData.nodeData.layer === 'plant')
    };

    const layerOrder = ['human_mito', 'bacteria', 'plant'];
    layerOrder.forEach((layer, layerIndex) => {
        const layerNodes = nodesByLayer[layer];
        layerNodes.forEach((node, i) => {
            const delay = CONFIG.animation.introDelay +
                         (layerIndex * CONFIG.animation.planeDuration) +
                         (i * CONFIG.animation.nodeStagger);
            setTimeout(() => {
                node.visible = true;
                animateNodeIn(node);
            }, delay);
        });
    });

    // Animate edges after nodes
    const totalNodeDelay = CONFIG.animation.introDelay +
                          (3 * CONFIG.animation.planeDuration) +
                          (Math.max(...Object.values(nodesByLayer).map(arr => arr.length)) * CONFIG.animation.nodeStagger);

    setTimeout(() => {
        pathwayEdges.forEach((edge, i) => {
            setTimeout(() => {
                edge.visible = true;
            }, i * 30);
        });

        orthologEdges.forEach((edge, i) => {
            setTimeout(() => {
                edge.visible = true;
            }, i * 50);
        });
    }, totalNodeDelay);
}

function animatePlaneIn(plane) {
    const startY = plane.position.y - 5;
    const endY = plane.position.y;
    const startOpacity = 0;
    const endOpacity = 0.08;
    const duration = 800;
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        plane.position.y = startY + (endY - startY) * eased;
        plane.material.opacity = startOpacity + (endOpacity - startOpacity) * eased;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    update();
}

function animateNodeIn(node) {
    const duration = 500;
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutBack(progress);

        node.scale.setScalar(eased);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    update();
}

// Easing functions
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ===== ANIMATION LOOP =====
function animate() {
    requestAnimationFrame(animate);

    state.animationTime += CONFIG.animation.beamSpeed;

    // Animate ortholog beams (pulsing effect)
    state.meshes.orthologEdges.forEach(beam => {
        if (beam.visible) {
            const pulse = Math.sin(state.animationTime * 5 + beam.userData.animationOffset) * 0.5 + 0.5;
            beam.material.opacity = 0.4 + pulse * 0.3;
        }
    });

    // Subtle node breathing
    state.meshes.nodes.forEach(node => {
        if (node.visible && node !== state.hoveredNode) {
            const breathe = Math.sin(state.animationTime * 2 + node.position.x) * 0.05 + 1;
            node.material.emissiveIntensity = node.userData.originalEmissiveIntensity + breathe * 0.1;
        }
    });

    state.controls.update();
    state.renderer.render(state.scene, state.camera);
}

// ===== INTERACTION =====
function onMouseMove(event) {
    state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    updateRaycast();
    updateTooltip(event.clientX, event.clientY);
}

function onMouseClick() {
    if (state.hoveredNode) {
        selectNode(state.hoveredNode);
    }
}

function updateRaycast() {
    state.raycaster.setFromCamera(state.mouse, state.camera);

    const intersects = state.raycaster.intersectObjects(state.meshes.nodes);

    // Reset previous hover
    if (state.hoveredNode && (!intersects.length || intersects[0].object !== state.hoveredNode)) {
        resetNodeHighlight(state.hoveredNode);
        state.hoveredNode = null;
        hideTooltip();
    }

    // Set new hover
    if (intersects.length > 0) {
        const node = intersects[0].object;
        if (node !== state.hoveredNode) {
            state.hoveredNode = node;
            highlightNode(node);
            showTooltip(node.userData.nodeData);
        }
    }
}

function highlightNode(node) {
    node.material.emissiveIntensity = 0.8;
    node.scale.setScalar(1.3);

    // Highlight connected edges
    highlightConnectedEdges(node.userData.nodeId, true);
}

function resetNodeHighlight(node) {
    node.material.emissiveIntensity = node.userData.originalEmissiveIntensity;
    node.scale.setScalar(1);

    // Reset connected edges
    highlightConnectedEdges(node.userData.nodeId, false);
}

function highlightConnectedEdges(nodeId, highlight) {
    const opacity = highlight ? 0.8 : 0.3;

    state.meshes.pathwayEdges.forEach(edge => {
        if (edge.userData.sourceId === nodeId || edge.userData.targetId === nodeId) {
            edge.material.opacity = opacity;
        }
    });

    state.meshes.orthologEdges.forEach(edge => {
        if (edge.userData.sourceId === nodeId || edge.userData.targetId === nodeId) {
            edge.material.opacity = highlight ? 0.9 : 0.6;
        }
    });
}

function selectNode(node) {
    state.selectedNode = node;
    showInfoCard(node.userData.nodeData);
}

// ===== UI UPDATES =====
function showTooltip(nodeData) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = nodeData.label;
    tooltip.classList.remove('hidden');
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.add('hidden');
}

function updateTooltip(x, y) {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip.classList.contains('hidden')) {
        tooltip.style.left = (x + 15) + 'px';
        tooltip.style.top = (y + 15) + 'px';
    }
}

function showInfoCard(nodeData) {
    const card = document.getElementById('info-card');

    document.getElementById('card-title').textContent = nodeData.label;
    document.getElementById('card-layer').textContent = getLayerDisplayName(nodeData.layer);
    document.getElementById('card-type').textContent = nodeData.type || '-';
    document.getElementById('card-role').textContent = nodeData.role || '-';

    const notesField = document.getElementById('card-notes-field');
    if (nodeData.notes) {
        document.getElementById('card-notes').textContent = nodeData.notes;
        notesField.style.display = 'block';
    } else {
        notesField.style.display = 'none';
    }

    card.classList.remove('hidden');
}

function closeInfoCard() {
    const card = document.getElementById('info-card');
    card.classList.add('hidden');
    state.selectedNode = null;
}

function getLayerDisplayName(layer) {
    const names = {
        human_mito: 'Human Mitochondria',
        bacteria: 'Bacteria',
        plant: 'Plant/Chloroplast'
    };
    return names[layer] || layer;
}

function updateVisibility() {
    // Update nodes
    state.meshes.nodes.forEach(node => {
        const layer = node.userData.nodeData.layer;
        node.visible = state.visibility[layer];
    });

    // Update pathway edges
    state.meshes.pathwayEdges.forEach(edge => {
        const layer = edge.userData.layer;
        edge.visible = state.visibility[layer];
    });

    // Update ortholog edges
    state.meshes.orthologEdges.forEach(edge => {
        edge.visible = state.visibility.orthologs;
    });

    // Update planes
    state.meshes.planes.forEach(plane => {
        const layer = plane.userData.layer;
        plane.visible = state.visibility[layer];
    });
}

function hideLoading() {
    const loading = document.getElementById('loading');
    setTimeout(() => {
        loading.classList.add('hidden');
    }, 300);
}

// ===== WINDOW RESIZE =====
function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== CSV PARSER (for future use) =====
export function parseCsvToGraph(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const nodes = new Map();
    const edges = [];

    lines.forEach((line, index) => {
        const cols = line.split(',').map(c => c.trim());
        if (cols.length < 6) return;

        const [h_sub, h_prod, b_sub, b_prod, p_sub, p_prod] = cols;

        // Add nodes
        const addNode = (id, layer, type = 'metabolite') => {
            if (id && !nodes.has(id)) {
                nodes.set(id, {
                    id,
                    label: id.replace(/_bac|_pl/g, ''),
                    layer,
                    type
                });
            }
        };

        addNode(h_sub, 'human_mito');
        addNode(h_prod, 'human_mito');
        addNode(b_sub, 'bacteria');
        addNode(b_prod, 'bacteria');
        addNode(p_sub, 'plant');
        addNode(p_prod, 'plant');

        // Add pathway edges
        if (h_sub && h_prod) {
            edges.push({ source: h_sub, target: h_prod, kind: 'pathway', layer: 'human_mito' });
        }
        if (b_sub && b_prod) {
            edges.push({ source: b_sub, target: b_prod, kind: 'pathway', layer: 'bacteria' });
        }
        if (p_sub && p_prod) {
            edges.push({ source: p_sub, target: p_prod, kind: 'pathway', layer: 'plant' });
        }

        // Add cross-plane ortholog edges
        if (h_prod && b_prod) {
            edges.push({ source: h_prod, target: b_prod, kind: 'ortholog' });
        }
        if (h_prod && p_prod) {
            edges.push({ source: h_prod, target: p_prod, kind: 'ortholog' });
        }
    });

    return {
        nodes: Array.from(nodes.values()),
        edges
    };
}

// ===== START APPLICATION =====
init();
