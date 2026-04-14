import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
// VRMAnimationLoaderPlugin not needed - we use GLTF animations directly
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

// ===== MIXAMO → VRM BONE MAPPING =====
const mixamoToVRMBoneMap: Record<string, string> = {
    // Core body
    'mixamorigHips': 'Normalized_J_Bip_C_Hips',
    'mixamorigSpine': 'Normalized_J_Bip_C_Spine',
    'mixamorigSpine1': 'Normalized_J_Bip_C_Chest',
    'mixamorigSpine2': 'Normalized_J_Bip_C_UpperChest',
    'mixamorigNeck': 'Normalized_J_Bip_C_Neck',
    'mixamorigHead': 'Normalized_J_Bip_C_Head',
    
    // Left arm
    'mixamorigLeftShoulder': 'Normalized_J_Bip_L_Shoulder',
    'mixamorigLeftArm': 'Normalized_J_Bip_L_UpperArm',
    'mixamorigLeftForeArm': 'Normalized_J_Bip_L_LowerArm',
    'mixamorigLeftHand': 'Normalized_J_Bip_L_Hand',
    
    // Right arm
    'mixamorigRightShoulder': 'Normalized_J_Bip_R_Shoulder',
    'mixamorigRightArm': 'Normalized_J_Bip_R_UpperArm',
    'mixamorigRightForeArm': 'Normalized_J_Bip_R_LowerArm',
    'mixamorigRightHand': 'Normalized_J_Bip_R_Hand',
    
    // Left fingers - Thumb
    'mixamorigLeftHandThumb1': 'Normalized_J_Bip_L_Thumb1',
    'mixamorigLeftHandThumb2': 'Normalized_J_Bip_L_Thumb2',
    'mixamorigLeftHandThumb3': 'Normalized_J_Bip_L_Thumb3',
    
    // Left fingers - Index
    'mixamorigLeftHandIndex1': 'Normalized_J_Bip_L_Index1',
    'mixamorigLeftHandIndex2': 'Normalized_J_Bip_L_Index2',
    'mixamorigLeftHandIndex3': 'Normalized_J_Bip_L_Index3',
    
    // Left fingers - Middle
    'mixamorigLeftHandMiddle1': 'Normalized_J_Bip_L_Middle1',
    'mixamorigLeftHandMiddle2': 'Normalized_J_Bip_L_Middle2',
    'mixamorigLeftHandMiddle3': 'Normalized_J_Bip_L_Middle3',
    
    // Left fingers - Ring
    'mixamorigLeftHandRing1': 'Normalized_J_Bip_L_Ring1',
    'mixamorigLeftHandRing2': 'Normalized_J_Bip_L_Ring2',
    'mixamorigLeftHandRing3': 'Normalized_J_Bip_L_Ring3',
    
    // Left fingers - Pinky
    'mixamorigLeftHandPinky1': 'Normalized_J_Bip_L_Little1',
    'mixamorigLeftHandPinky2': 'Normalized_J_Bip_L_Little2',
    'mixamorigLeftHandPinky3': 'Normalized_J_Bip_L_Little3',
    
    // Right fingers - Thumb
    'mixamorigRightHandThumb1': 'Normalized_J_Bip_R_Thumb1',
    'mixamorigRightHandThumb2': 'Normalized_J_Bip_R_Thumb2',
    'mixamorigRightHandThumb3': 'Normalized_J_Bip_R_Thumb3',
    
    // Right fingers - Index
    'mixamorigRightHandIndex1': 'Normalized_J_Bip_R_Index1',
    'mixamorigRightHandIndex2': 'Normalized_J_Bip_R_Index2',
    'mixamorigRightHandIndex3': 'Normalized_J_Bip_R_Index3',
    
    // Right fingers - Middle
    'mixamorigRightHandMiddle1': 'Normalized_J_Bip_R_Middle1',
    'mixamorigRightHandMiddle2': 'Normalized_J_Bip_R_Middle2',
    'mixamorigRightHandMiddle3': 'Normalized_J_Bip_R_Middle3',
    
    // Right fingers - Ring
    'mixamorigRightHandRing1': 'Normalized_J_Bip_R_Ring1',
    'mixamorigRightHandRing2': 'Normalized_J_Bip_R_Ring2',
    'mixamorigRightHandRing3': 'Normalized_J_Bip_R_Ring3',
    
    // Right fingers - Pinky
    'mixamorigRightHandPinky1': 'Normalized_J_Bip_R_Little1',
    'mixamorigRightHandPinky2': 'Normalized_J_Bip_R_Little2',
    'mixamorigRightHandPinky3': 'Normalized_J_Bip_R_Little3',
    
    // Left leg
    'mixamorigLeftUpLeg': 'Normalized_J_Bip_L_UpperLeg',
    'mixamorigLeftLeg': 'Normalized_J_Bip_L_LowerLeg',
    'mixamorigLeftFoot': 'Normalized_J_Bip_L_Foot',
    'mixamorigLeftToeBase': 'Normalized_J_Bip_L_ToeBase',
    
    // Right leg
    'mixamorigRightUpLeg': 'Normalized_J_Bip_R_UpperLeg',
    'mixamorigRightLeg': 'Normalized_J_Bip_R_LowerLeg',
    'mixamorigRightFoot': 'Normalized_J_Bip_R_Foot',
    'mixamorigRightToeBase': 'Normalized_J_Bip_R_ToeBase',
};

/**
 * Remap Mixamo bone names to VRM bone names in animation tracks
 * Implements proper retargeting by calculating rest pose orientation differences
 */
function remapMixamoToVRM(clip: THREE.AnimationClip, vrm: VRM, gltfScene: THREE.Object3D): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];
    
    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();
    
    // Adjust with reference to hips height.
    const mixamoHips = gltfScene.getObjectByName('mixamorigHips');
    const vrmHips = vrm.humanoid?.getRawBoneNode('hips');
    let hipsPositionScale = 1.0;
    
    if (mixamoHips && vrmHips) {
        // Approximate scale ratio
        const vrmHipsY = vrmHips.position.y || 1.0;
        const mixamoHipsY = mixamoHips.position.y || 1.0;
        hipsPositionScale = vrmHipsY / mixamoHipsY;
    }

    for (const track of clip.tracks) {
        // Track name format: "mixamorigHips.position", "mixamorigSpine.quaternion"
        const parts = track.name.split('.');
        if (parts.length !== 2) continue;
            
        const mixamoRigName = parts[0];
        const propertyName = parts[1]; // position, quaternion, scale
            
        const vrmNodeName = mixamoToVRMBoneMap[mixamoRigName];
        const mixamoRigNode = gltfScene.getObjectByName(mixamoRigName);

        if (vrmNodeName && mixamoRigNode) {
            // Store rotations of rest-pose.
            mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
            if (mixamoRigNode.parent) {
                mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);
            } else {
                parentRestWorldRotation.identity();
            }

            if (track instanceof THREE.QuaternionKeyframeTrack) {
                // Retarget rotation of mixamoRig to NormalizedBone.
                for (let i = 0; i < track.values.length; i += 4) {
                    const flatQuaternion = Array.from(track.values.slice(i, i + 4));
                    _quatA.fromArray(flatQuaternion);

                    // Parent rest * Track rotation * Inverse rest
                    _quatA
                        .premultiply(parentRestWorldRotation)
                        .multiply(restRotationInverse);

                    _quatA.toArray(flatQuaternion);
                    for (let j = 0; j < 4; j++) {
                        track.values[i + j] = flatQuaternion[j];
                    }
                }

                // In VRM 1.0, the space matches GLTF space, no need to negate components
                tracks.push(
                    new THREE.QuaternionKeyframeTrack(
                        `${vrmNodeName}.${propertyName}`,
                        track.times,
                        track.values
                    )
                );
            } else if (track instanceof THREE.VectorKeyframeTrack) {
                if (propertyName === 'position') {
                    const values = Array.from(track.values).map(v => v * hipsPositionScale);
                    tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, values));
                }
            }
        }
    }

    console.log(`🔀 Retargeted ${tracks.length}/${clip.tracks.length} tracks from Mixamo → VRM`);

    // Create new clip with remapped tracks
    const remappedClip = new THREE.AnimationClip(
        `vrma_${clip.name}`,
        clip.duration,
        tracks
    );
    
    return remappedClip;
}

// --- Scene Setup ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20);
camera.position.set(0, 1.1, 2.2);
camera.lookAt(0, 1.0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x0a0a1a, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9; // reduced glare
document.getElementById('canvas-container')?.appendChild(renderer.domElement);

// ===== Scene Setup (continued) =====
scene.background = new THREE.Color(0x0a0a1a);

// Add subtle fog for depth
scene.fog = new THREE.Fog(0x0a0a1a, 5, 15);

// ===== Particle System for Ambient Effects =====
const particleCount = 50;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleSpeeds: number[] = [];

for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 8;
    particlePositions[i * 3 + 1] = Math.random() * 4;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    particleSpeeds.push(0.2 + Math.random() * 0.5);
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const particleMaterial = new THREE.PointsMaterial({
    color: 0x00E5D1,
    size: 0.03,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ===== Glow Ring Under Avatar =====
const ringGeometry = new THREE.RingGeometry(0.3, 0.5, 64);
const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x00E5D1,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
});
const glowRing = new THREE.Mesh(ringGeometry, ringMaterial);
glowRing.rotation.x = -Math.PI / 2;
glowRing.position.y = 0.01;
scene.add(glowRing);

// ===== Ground Plane =====
const groundGeometry = new THREE.PlaneGeometry(20, 10);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a1a,
    transparent: true,
    opacity: 0.5,
    roughness: 0.8,
    metalness: 0.2,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

// ===== Avatar Shadow =====
const shadowGeometry = new THREE.PlaneGeometry(0.8, 0.4);
const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
});
const avatarShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
avatarShadow.rotation.x = -Math.PI / 2;
avatarShadow.position.y = 0.005;
scene.add(avatarShadow);
// ===== Improved Lighting (dramatic character look) =====
const keyLight = new THREE.DirectionalLight(0xffffff, 0.8); // reduced
keyLight.position.set(2, 3, 3);
keyLight.castShadow = false;
scene.add(keyLight);

// Softer fill light
const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
fillLight.position.set(-2.5, 1.5, 2);
scene.add(fillLight);

// Stronger rim light for character outline
const rimLight = new THREE.DirectionalLight(0x00E5D1, 0.4); // reduced
rimLight.position.set(0, 2, -3);
scene.add(rimLight);

// Top light for hair highlight
const topLight = new THREE.DirectionalLight(0xffffff, 0.2); // reduced
topLight.position.set(0, 4, 1);
scene.add(topLight);

// Warm accent from below
const accentLight = new THREE.DirectionalLight(0xffa500, 0.2);
accentLight.position.set(1, -1, 2);
scene.add(accentLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Add point light for subtle glow around avatar
const avatarLight = new THREE.PointLight(0x00E5D1, 0.4, 3); // reduced
avatarLight.position.set(0, 1.2, 1);
scene.add(avatarLight);

// --- VRM Loading ---
let currentVrm: VRM | null = null;
const loader = new GLTFLoader();

// Register VRM + VRM Animation loaders
loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
});

loader.register((parser) => {
    return new VRMAnimationLoaderPlugin(parser);
});

// ===== VRM ANIMATION SYSTEM =====
interface VRMAnimationSet {
    idle: THREE.AnimationClip | null;
    idleVariants: THREE.AnimationClip[];
    walk: THREE.AnimationClip | null;
    walkVariants: THREE.AnimationClip[];
    talk: THREE.AnimationClip | null;
    talkVariants: THREE.AnimationClip[];
    wave: THREE.AnimationClip | null;
    waveVariants: THREE.AnimationClip[];
    nod: THREE.AnimationClip | null;
}

const animations: VRMAnimationSet = {
    idle: null,
    idleVariants: [],
    walk: null,
    walkVariants: [],
    talk: null,
    talkVariants: [],
    wave: null,
    waveVariants: [],
    nod: null,
};

// Animation Mixer for playing GLTF animations directly
let animationMixer: THREE.AnimationMixer | null = null;
let currentAction: THREE.AnimationAction | null = null;
let currentAnimationName: string | null = null;
let animationLoop = true;

// Track available expression names
let availableExpressions: string[] = [];

// Helper: try setting an expression by trying multiple name conventions
function setExpression(name: string, value: number) {
    if (!currentVrm?.expressionManager) return;
    // VRM 1.0 names
    const nameMap: Record<string, string[]> = {
        'aa': ['aa', 'a', 'A'],
        'ee': ['ee', 'e', 'E'],
        'ih': ['ih', 'i', 'I'],
        'oh': ['oh', 'o', 'O'],
        'ou': ['ou', 'u', 'U'],
        'blink': ['blink', 'Blink'],
        'happy': ['happy', 'Happy', 'joy', 'Joy'],
        'relaxed': ['relaxed', 'Relaxed'],
    };
    const candidates = nameMap[name] || [name];
    for (const c of candidates) {
        if (availableExpressions.includes(c)) {
            currentVrm.expressionManager.setValue(c, value);
            return;
        }
    }
    // Fallback: just try the raw name
    currentVrm.expressionManager.setValue(name, value);
}

// ===== VRM ANIMATION CONTROLLER =====

/**
 * Load a single VRMA file and extract AnimationClip from it
 */
async function loadVRMAAnimation(url: string): Promise<THREE.AnimationClip | null> {
    try {
        const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(
                url,
                (gltf) => resolve(gltf),
                undefined,
                (error) => reject(error)
            );
        });
        
        if (!currentVrm) {
            console.warn(`⚠️ Cannot retarget animation ${url}: currentVrm is not loaded`);
            return null;
        }

        // True .vrma files created with VRM schemas have their animations parsed into userData.vrmAnimations
        if (gltf.userData.vrmAnimations && gltf.userData.vrmAnimations.length > 0) {
            const vrmAnimation = gltf.userData.vrmAnimations[0];
            const clip = createVRMAnimationClip(vrmAnimation, currentVrm);
            console.log(`✅ Loaded true VRMA clip from: ${url} (${clip.name}, ${clip.duration.toFixed(2)}s)`);
            return clip;
        }

        // Fallback for raw Mixamo GLTF animations exported directly from Mixamo
        if (gltf.animations && gltf.animations.length > 0) {
            const originalClip = gltf.animations[0] as THREE.AnimationClip;
            console.log(`📦 Loaded raw fallback animation clip: ${url} (${originalClip.name}, ${originalClip.duration.toFixed(2)}s, ${originalClip.tracks.length} tracks)`);
            
            // Remap Mixamo bone names to VRM bone names
            const remappedClip = remapMixamoToVRM(originalClip, currentVrm, gltf.scene);
            
            console.log(`✅ Retargeted raw Mixamo clip from: ${url} (${remappedClip.name}, ${remappedClip.duration.toFixed(2)}s)`);
            return remappedClip;
        }
        
        console.warn(`⚠️ No animations found in: ${url}`);
        return null;
    } catch (error) {
        console.error(`❌ Failed to load VRMA: ${url}`, error);
        return null;
    }
}

/**
 * Load all VRMA animations into the animations object
 */
async function loadAllAnimations(): Promise<void> {
    console.log('🎬 Loading all VRMA animations...');
    
    // Load primary animations
    const [idle, walk, talk, talk2, wave, wave2, nod] = await Promise.all([
        loadVRMAAnimation('/animations/Breathing Idle.vrma'),
        loadVRMAAnimation('/animations/Brutal To Happy Walking.vrma'),
        loadVRMAAnimation('/animations/Talking.vrma'),
        loadVRMAAnimation('/animations/Talking (1).vrma'),
        loadVRMAAnimation('/animations/Waving.vrma'),
        loadVRMAAnimation('/animations/Waving (1).vrma'),
        loadVRMAAnimation('/animations/Head Nod Yes.vrma'),
    ]);
    
    // Assign to animation set
    animations.idle = idle;
    animations.walk = walk;
    animations.talk = talk;
    animations.wave = wave;
    animations.nod = nod;
    
    // Assign variants
    if (talk2) animations.talkVariants.push(talk2);
    if (wave2) animations.waveVariants.push(wave2);
    
    console.log('🎬 Animation loading complete!');
    console.log('📊 Loaded animations:', {
        idle: !!animations.idle,
        walk: !!animations.walk,
        talk: !!animations.talk,
        talkVariants: animations.talkVariants.length,
        wave: !!animations.wave,
        waveVariants: animations.waveVariants.length,
        nod: !!animations.nod,
    });
}

/**
 * Play an animation on the current VRM using AnimationMixer
 */
function playVRMAAnimation(
    name: 'idle' | 'walk' | 'talk' | 'wave' | 'nod',
    options?: { loop?: boolean; useVariant?: boolean }
): boolean {
    if (!currentVrm || !animationMixer) {
        console.warn('⚠️ No VRM or mixer loaded yet');
        return false;
    }
    
    let clip: THREE.AnimationClip | null = null;
    
    // Select animation clip (with variant support)
    switch (name) {
        case 'idle':
            clip = animations.idle;
            break;
        case 'walk':
            clip = animations.walk;
            break;
        case 'talk':
            // Random pick from primary + variants
            const talkClips = [animations.talk, ...animations.talkVariants].filter(Boolean) as THREE.AnimationClip[];
            clip = talkClips.length > 0 ? pickRandom(talkClips) : null;
            break;
        case 'wave':
            // Random pick from primary + variants
            const waveClips = [animations.wave, ...animations.waveVariants].filter(Boolean) as THREE.AnimationClip[];
            clip = waveClips.length > 0 ? pickRandom(waveClips) : null;
            break;
        case 'nod':
            clip = animations.nod;
            break;
    }
    
    if (!clip) {
        console.warn(`⚠️ Animation clip not found: ${name}`);
        return false;
    }
    
    // Stop current animation if playing
    if (currentAction) {
        currentAction.fadeOut(0.15); // Smooth fade out
        currentAction = null;
    }
    
    // Create new animation action
    animationLoop = options?.loop ?? true;
    currentAction = animationMixer.clipAction(clip);
    currentAction.setLoop(animationLoop ? THREE.LoopRepeat : THREE.LoopOnce);
    currentAction.clampWhenFinished = !animationLoop; // Stay at last frame if not looping
    currentAction.reset();
    
    // Play with fade in
    currentAction.fadeIn(0.15);
    currentAction.play();
    
    currentAnimationName = name;
    
    console.log(`▶️ Playing animation: ${name} (loop: ${animationLoop}, duration: ${clip.duration.toFixed(2)}s)`);
    return true;
}

/**
 * Stop current animation
 */
function stopVRMAAnimation(): void {
    if (currentAction) {
        currentAction.fadeOut(0.2);
        currentAction = null;
    }
    currentAnimationName = null;
}

/**
 * Update animation mixer in the render loop
 */
function updateVRMAAnimation(delta: number): void {
    if (animationMixer) {
        animationMixer.update(delta);
    }
}

/**
 * Helper: Random pick from array
 */
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

loader.load(
    '/Avatar.vrm',
    (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        currentVrm = vrm;

        vrm.scene.traverse((obj) => {
            obj.frustumCulled = false;
        });

        scene.add(vrm.scene);

        // Log available expressions
        if (vrm.expressionManager) {
            availableExpressions = vrm.expressionManager.expressions.map(e => e.expressionName);
            console.log('✅ Available VRM expressions:', availableExpressions);
        }

        // Initialize Animation Mixer after VRM is loaded
        animationMixer = new THREE.AnimationMixer(vrm.scene);
        animationMixer.addEventListener('finished', (e) => {
            if (e.action === currentAction) {
                stopVRMAAnimation();
                isWaving = false;
            }
        });
        console.log('🎬 Animation Mixer initialized');

        // Load VRMA animations after VRM is loaded
        loadAllAnimations().then(() => {
            console.log('🎬 All animations ready!');
        });

        // Set natural rest pose (arms at sides instead of T-pose)
        if (vrm.humanoid) {
            console.log('✅ VRM humanoid loaded');
            
            // DEBUG: List all VRM bone names
            console.log('🔍 VRM Bone Names (for Mixamo → VRM mapping):');
            const boneNames = [
                'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
                'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
                'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
                'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
                'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
            ];
            
            for (const boneName of boneNames) {
                const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName as any);
                if (boneNode) {
                    console.log(`  VRM '${boneName}' → Scene node: '${boneNode.name}'`);
                } else {
                    console.warn(`  VRM '${boneName}' → NOT FOUND`);
                }
            }
            
            const rUA = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
            const lUA = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
            const rLA = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
            const lLA = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
            if (rUA) { rUA.rotation.z = 1.2; }
            if (lUA) { lUA.rotation.z = -1.2; }
            if (rLA) { rLA.rotation.z = 0.15; }
            if (lLA) { lLA.rotation.z = -0.15; }
        }

        document.getElementById('loading-screen')?.style.setProperty('opacity', '0');
        setTimeout(() => {
            document.getElementById('loading-screen')?.remove();
        }, 1000);
    },
    (progress) => {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        const el = document.getElementById('loading-pct');
        if (el) el.textContent = `${pct}%`;
    },
    (error) => console.error('VRM load error:', error)
);

// ===== LIP-SYNC ENGINE =====
interface LipFrame {
    vowel: string; // 'aa','ee','ih','oh','ou','nn'(closed)
    duration: number;
}
let lipQueue: LipFrame[] = [];
let lipIndex = 0;
let lipTimer = 0;
let isSpeaking = false;

// Current mouth blend values (for smooth interpolation)
const mouthTarget = { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 };
const mouthCurrent = { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 };
let currentHappyValue = 0;

function charToVowel(ch: string): string {
    const c = ch.toLowerCase();
    if ('aàáảãạăắằẳẵặâấầẩẫậ'.includes(c)) return 'aa';
    if ('eèéẻẽẹêếềểễệ'.includes(c)) return 'ee';
    if ('iìíỉĩịy'.includes(c)) return 'ih';
    if ('oòóỏõọôốồổỗộơớờởỡợ'.includes(c)) return 'oh';
    if ('uùúủũụưứừửữự'.includes(c)) return 'ou';
    if (/[bcdfghjklmnpqrstvwxzđ]/.test(c)) return 'nn';
    return 'pause';
}

function textToLipQueue(text: string): LipFrame[] {
    const frames: LipFrame[] = [];
    for (const ch of text) {
        const vowel = charToVowel(ch);
        if (vowel === 'pause') {
            frames.push({ vowel: 'nn', duration: 0.18 });
        } else if (vowel === 'nn') {
            frames.push({ vowel: 'nn', duration: 0.08 });
        } else {
            frames.push({ vowel, duration: 0.15 });
        }
    }
    frames.push({ vowel: 'nn', duration: 0.3 });
    return frames;
}

function startSpeaking(text: string) {
    lipQueue = textToLipQueue(text);
    lipIndex = 0;
    lipTimer = 0;
    isSpeaking = true;
    setState('talking');
    gestureTimer = 0;
    isGesturing = false;

    const card = document.getElementById('advisor-card');
    const textEl = document.getElementById('advisor-text');
    if (textEl) textEl.textContent = text;
    card?.classList.add('visible');
}

function resetMouthTargets() {
    mouthTarget.aa = 0;
    mouthTarget.ee = 0;
    mouthTarget.ih = 0;
    mouthTarget.oh = 0;
    mouthTarget.ou = 0;
}

// ===== ANIMATION STATE =====
let isWaving = false;
let waveStartTime = 0;
let nextBlinkTime = 2;
let currentMood: 'neutral' | 'happy' | 'talking' = 'neutral';
let moodTransition = 0;
let gestureTimer = 0;
let isGesturing = false;
let gestureType: 'left' | 'right' | 'both' = 'right';
let gestureStartTime = 0;

// State machine for avatar behavior
type AvatarState = 'walking' | 'pausing' | 'engaged' | 'talking';
let avatarState: AvatarState = 'walking';

// Walking state - BB-8 style physics movement
let walkDirection: 1 | -1 = 1; // 1 = right, -1 = left
let isWalking = false;
let isPausing = false;

// Walking animation
let walkCycleTime = 0;
const walkBounceAmount = 0.025;
const walkArmSwingAmount = 0.35;
const walkLegSwingAmount = 0.45;
const walkHipSwayAmount = 0.04;

// Rest pose arm rotations (must match values set on VRM load)
const REST_R = 1.2;
const REST_L = -1.2;

// Create clock early so event handlers can use it
const clock = new THREE.Clock();

// ===== BB-8 STYLE PHYSICS MOVEMENT =====
// Normalized mouse position (-1 to 1)
let mouseNormX = 0;
let mouseNormY = 0;

// Target X position derived from mouse
let targetX = 0;

// Velocity-based movement (BB-8 style)
let velX = 0;
const maxSpeed = 0.010;      // max horizontal speed (reduced)
const moveLimit = 1.5;       // max X range ± (restricted space)
const moveDeadZone = 0.2;    // min distance before moving

// Anticipation lean (lean opposite before moving, like BB-8)
let anticipationTilt = 0;
let prevTargetX = 0;

// Dead zone micro-offset (prevent robotic precision)
let microOffsetX = 0;
let microOffsetTimer = 0;

// Hover proximity (for subtle interactions)
let hoverProximity = 0;

// Head tracking (smooth yaw)
let headCurrentRotY = 0;

// Mouse position for legacy eye tracking
const mousePosition = new THREE.Vector2(0, 0);
const lookTarget = new THREE.Vector3(0, 1.2, 1);

document.addEventListener('mousemove', (event) => {
    mouseNormX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseNormY = -(event.clientY / window.innerHeight) * 2 + 1;
    mousePosition.x = mouseNormX;
    mousePosition.y = mouseNormY;
    
    // Map mouse to world X range (like BB-8)
    targetX = mouseNormX * (moveLimit + 1.5);
});

function triggerWave() {
    if (!isWaving) {
        isWaving = true;
        waveStartTime = clock.elapsedTime;
        currentMood = 'happy';
        
        // Play wave animation (non-looping, will play once)
        playVRMAAnimation('wave', { loop: false });
        
        console.log('👋 Wave triggered at', waveStartTime);
    }
}

function setMood(mood: 'neutral' | 'happy' | 'talking', transitionSpeed = 0.5) {
    currentMood = mood;
    moodTransition = transitionSpeed;
}

function setState(newState: AvatarState) {
    const oldState = avatarState;
    avatarState = newState;
    console.log(`🔄 State: ${oldState} → ${newState}`);

    // Handle state entry
    if (newState === 'engaged') {
        currentMood = 'happy';
        moodTransition = 1;
        stopVRMAAnimation();
    } else if (newState === 'talking') {
        currentMood = 'talking';
        moodTransition = 1;
        // Play talking animation when speaking
        playVRMAAnimation('talk', { loop: true });
    } else if (newState === 'walking') {
        stopVRMAAnimation();
    } else if (newState === 'pausing') {
        stopVRMAAnimation();
    }
}

// ===== UI EVENTS =====
document.getElementById('trigger-btn')?.addEventListener('click', () => {
    triggerWave();
    startSpeaking('Chào bạn! Tôi phát hiện bạn vừa giao dịch tại Traveloka. Bạn có muốn kích hoạt bảo hiểm du lịch Shinhan Gold không?');
});

document.getElementById('close-btn')?.addEventListener('click', () => {
    document.getElementById('advisor-card')?.classList.remove('visible');
    isSpeaking = false;
    resetMouthTargets();
    setMood('neutral');
    // Return to walking
    setTimeout(() => setState('walking'), 1000);
});

document.getElementById('speak-btn')?.addEventListener('click', () => {
    const input = document.getElementById('text-input') as HTMLInputElement;
    if (input && input.value.trim()) {
        startSpeaking(input.value.trim());
        input.value = '';
    }
});

document.getElementById('text-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('speak-btn')?.click();
    }
});

// Click on avatar to engage
renderer.domElement.addEventListener('click', () => {
    triggerWave();
});

// ===== LERP helper =====
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// ===== MAIN LOOP =====

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (currentVrm) {
        const elapsed = clock.getElapsedTime();

        // ───── UPDATE VRMA ANIMATION ─────
        updateVRMAAnimation(delta);

        // ───── BB-8 STYLE PHYSICS MOVEMENT ─────
        if (avatarState === 'walking' || avatarState === 'pausing') {
            const rx = currentVrm.scene.position.x;
            
            // Dead zone micro-offset (organic imprecision like BB-8)
            microOffsetTimer += delta;
            if (microOffsetTimer > 1.8 + Math.random() * 1.5) {
                microOffsetX = (Math.random() - 0.5) * 0.3;
                microOffsetTimer = 0;
            }
            const effectiveTargetX = targetX + microOffsetX;
            
            // Anticipation lean (lean opposite before direction change)
            const targetDelta = effectiveTargetX - prevTargetX;
            prevTargetX += (effectiveTargetX - prevTargetX) * 0.05;
            anticipationTilt += (-targetDelta * 0.3 - anticipationTilt) * 0.15;
            
            // Hover proximity effect (mouse near avatar = magnetic feel)
            const robotScreenX = rx / (moveLimit + 1.5);
            const mouseDist = Math.abs(mouseNormX - robotScreenX);
            const targetProximity = mouseDist < 0.25 ? (1 - mouseDist / 0.25) : 0;
            hoverProximity += (targetProximity - hoverProximity) * 0.06;
            
            // Magnetic boost: acceleration increases when mouse is near
            const magnetBoost = 1.0 + hoverProximity * 1.2;
            
            // Velocity-based horizontal movement (BB-8 style)
            const dx = effectiveTargetX - rx;
            const dist = Math.abs(dx);
            
            if (dist > moveDeadZone) {
                velX += dx * 0.0006 * magnetBoost; // gentle acceleration (reduced)
                isWalking = true;
                isPausing = false;
                avatarState = 'walking';
                walkDirection = dx > 0 ? 1 : -1;
            } else {
                isWalking = false;
                isPausing = true;
                avatarState = 'pausing';
            }
            
            velX *= 0.90; // strong damping (BB-8 feel)
            velX = Math.max(-maxSpeed, Math.min(maxSpeed, velX)); // speed cap
            currentVrm.scene.position.x += velX;
            
            // Clamp to boundaries
            currentVrm.scene.position.x = Math.max(-moveLimit, Math.min(moveLimit, currentVrm.scene.position.x));
            
            // Body tilt: lean into movement direction + anticipation
            const moveTilt = -velX * 8 + anticipationTilt * 0.4;
            currentVrm.scene.rotation.z = lerp(currentVrm.scene.rotation.z, moveTilt * 0.15, 0.08);
        }
        else if (avatarState === 'engaged' || avatarState === 'talking') {
            // Smoothly move to center position (frame-rate independent)
            const lerpT = 1 - Math.exp(-3 * delta);
            currentVrm.scene.position.x = lerp(currentVrm.scene.position.x, 0, lerpT);
            
            // Smoothly rotate to face camera
            currentVrm.scene.rotation.y = lerp(currentVrm.scene.rotation.y, 0, lerpT);
            currentVrm.scene.rotation.z = lerp(currentVrm.scene.rotation.z, 0, lerpT);
            
            velX = 0;
            isWalking = false;
            isPausing = false;
        }
        
        // ───── PROCEDURAL BONE ANIMATIONS (Only when no VRMA is playing) ─────
        if (!currentAction) {
            const walking = avatarState === 'walking' && isWalking;

            if (walking) {
                walkCycleTime += delta;
                const walkCadence = 2.0; // steps per second (slightly slower for natural feel)
                const cycleAngle = walkCycleTime * walkCadence * Math.PI * 2;

                // Get bone references
                const hips = currentVrm.humanoid?.getRawBoneNode('hips');
                const spine = currentVrm.humanoid?.getRawBoneNode('spine');
                const chest = currentVrm.humanoid?.getRawBoneNode('chest');
                const neck = currentVrm.humanoid?.getRawBoneNode('neck');
                const head = currentVrm.humanoid?.getRawBoneNode('head');
                
                const lUpperLeg = currentVrm.humanoid?.getNormalizedBoneNode('leftUpperLeg');
                const rUpperLeg = currentVrm.humanoid?.getNormalizedBoneNode('rightUpperLeg');
                const lLowerLeg = currentVrm.humanoid?.getNormalizedBoneNode('leftLowerLeg');
                const rLowerLeg = currentVrm.humanoid?.getNormalizedBoneNode('rightLowerLeg');
                
                const lUpperArm = currentVrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
                const rUpperArm = currentVrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
                const lLowerArm = currentVrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
                const rLowerArm = currentVrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
                
                // Smoothing factor for all movements
                const smooth = 0.18;
                
                // 1. LEG SWING - Right leg leads, left leg follows
                if (lUpperLeg && rUpperLeg) {
                    const rLegSwing = Math.sin(cycleAngle) * walkLegSwingAmount;
                    rUpperLeg.rotation.x = lerp(rUpperLeg.rotation.x, rLegSwing, smooth);
                    if (rLowerLeg) rLowerLeg.rotation.x = lerp(rLowerLeg.rotation.x, rLegSwing > 0 ? rLegSwing * 0.5 : 0.05, smooth);
                    
                    const lLegSwing = Math.sin(cycleAngle + Math.PI) * walkLegSwingAmount;
                    lUpperLeg.rotation.x = lerp(lUpperLeg.rotation.x, lLegSwing, smooth);
                    if (lLowerLeg) lLowerLeg.rotation.x = lerp(lLowerLeg.rotation.x, lLegSwing > 0 ? lLegSwing * 0.5 : 0.05, smooth);
                }
                
                // 2. HIP SWAY - Gentle side to side
                if (hips) {
                    const bounce = Math.abs(Math.sin(cycleAngle)) * walkBounceAmount;
                    hips.position.y = lerp(hips.position.y, bounce, smooth);
                    const hipSway = Math.sin(cycleAngle) * walkHipSwayAmount;
                    hips.rotation.z = lerp(hips.rotation.z, hipSway, smooth);
                    hips.rotation.x = lerp(hips.rotation.x, 0.02, smooth);
                }
                
                // 3. ARM SWING - Opposite to legs (contralateral)
                if (lUpperArm && rUpperArm) {
                    const lArmSwing = Math.sin(cycleAngle) * walkArmSwingAmount;
                    lUpperArm.rotation.x = lerp(lUpperArm.rotation.x, lArmSwing, smooth);
                    lUpperArm.rotation.z = lerp(lUpperArm.rotation.z, -1.2, smooth);
                    if (lLowerArm) lLowerArm.rotation.z = lerp(lLowerArm.rotation.z, -0.15 + Math.abs(lArmSwing) * 0.08, smooth);
                    
                    const rArmSwing = Math.sin(cycleAngle + Math.PI) * walkArmSwingAmount;
                    rUpperArm.rotation.x = lerp(rUpperArm.rotation.x, rArmSwing, smooth);
                    rUpperArm.rotation.z = lerp(rUpperArm.rotation.z, 1.2, smooth);
                    if (rLowerArm) rLowerArm.rotation.z = lerp(rLowerArm.rotation.z, 0.15 - Math.abs(rArmSwing) * 0.08, smooth);
                }
                
                // 4. SPINE & CHEST - Subtly twist to counter hips (organic torque)
                if (spine) {
                    spine.rotation.z = lerp(spine.rotation.z, -Math.sin(cycleAngle) * walkHipSwayAmount * 0.3, smooth);
                    spine.rotation.x = lerp(spine.rotation.x, 0.01, smooth);
                    spine.rotation.y = lerp(spine.rotation.y, Math.sin(cycleAngle) * 0.04, smooth);
                }
                if (chest) {
                    chest.rotation.z = lerp(chest.rotation.z, -Math.sin(cycleAngle) * walkHipSwayAmount * 0.2, smooth);
                    chest.rotation.y = lerp(chest.rotation.y, Math.sin(cycleAngle) * 0.05, smooth);
                }
                
                // 5. HEAD STABILIZATION - Keep head very stable, but track cursor slightly
                if (head) {
                    head.rotation.x = lerp(head.rotation.x, -Math.sin(cycleAngle * 2) * 0.005, smooth * 0.5);
                    head.rotation.z = lerp(head.rotation.z, Math.sin(cycleAngle) * 0.01, smooth);
                }
                if (neck) {
                    neck.rotation.x = lerp(neck.rotation.x, -Math.sin(cycleAngle * 2) * 0.003, smooth * 0.5);
                }
            }
            else {
                // ───── RESET TO IDLE POSE ─────
                walkCycleTime = 0;
                
                const lUpperLeg = currentVrm.humanoid?.getNormalizedBoneNode('leftUpperLeg');
                const rUpperLeg = currentVrm.humanoid?.getNormalizedBoneNode('rightUpperLeg');
                const lLowerLeg = currentVrm.humanoid?.getNormalizedBoneNode('leftLowerLeg');
                const rLowerLeg = currentVrm.humanoid?.getNormalizedBoneNode('rightLowerLeg');
                
                if (lUpperLeg) lUpperLeg.rotation.x = lerp(lUpperLeg.rotation.x, 0, 0.1);
                if (rUpperLeg) rUpperLeg.rotation.x = lerp(rUpperLeg.rotation.x, 0, 0.1);
                if (lLowerLeg) lLowerLeg.rotation.x = lerp(lLowerLeg.rotation.x, 0, 0.1);
                if (rLowerLeg) rLowerLeg.rotation.x = lerp(rLowerLeg.rotation.x, 0, 0.1);
                
                const lUpperArm = currentVrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
                const rUpperArm = currentVrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
                const lLowerArm = currentVrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
                const rLowerArm = currentVrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
                
                if (lUpperArm) {
                    lUpperArm.rotation.x = lerp(lUpperArm.rotation.x, 0, 0.1);
                    lUpperArm.rotation.z = lerp(lUpperArm.rotation.z, -1.2, 0.1);
                }
                if (rUpperArm) {
                    rUpperArm.rotation.x = lerp(rUpperArm.rotation.x, 0, 0.1);
                    rUpperArm.rotation.z = lerp(rUpperArm.rotation.z, 1.2, 0.1);
                }
                if (lLowerArm) lLowerArm.rotation.z = lerp(lLowerArm.rotation.z, -0.15, 0.1);
                if (rLowerArm) rLowerArm.rotation.z = lerp(rLowerArm.rotation.z, 0.15, 0.1);
                
                const spine = currentVrm.humanoid?.getRawBoneNode('spine');
                if (spine) {
                    spine.rotation.z = lerp(spine.rotation.z, 0, 0.1);
                    spine.rotation.x = lerp(spine.rotation.x, 0, 0.1);
                }
                
                const hips = currentVrm.humanoid?.getRawBoneNode('hips');
                if (hips) {
                    hips.rotation.z = lerp(hips.rotation.z, 0, 0.1);
                    hips.rotation.x = lerp(hips.rotation.x, 0, 0.1);
                }
            }

            // ───── IDLE BREATHING (only when not walking) ─────
            const breathCycle = Math.sin(elapsed * 1.8) * 0.015;
            const spine = currentVrm.humanoid?.getRawBoneNode('spine');
            const chest = currentVrm.humanoid?.getRawBoneNode('chest');
            if (spine && !walking) {
                spine.rotation.x = lerp(spine.rotation.x, breathCycle, 0.1);
            }
            if (chest && !walking) {
                chest.rotation.x = lerp(chest.rotation.x, breathCycle * 0.5, 0.1);
            }

            // ───── HEAD TRACKING (BB-8 style - always tracks mouse) ─────
            const head = currentVrm.humanoid?.getRawBoneNode('head');
            const neck = currentVrm.humanoid?.getRawBoneNode('neck');
            
            if (head) {
                const targetWeight = walking ? 0.4 : 0.8;
                const headTargetY = mouseNormX * targetWeight;
                headCurrentRotY += (headTargetY - headCurrentRotY) * (walking ? 0.06 : 0.1);
                
                const idleNodX = !walking ? Math.sin(elapsed * 1.2) * 0.02 + Math.sin(elapsed * 0.7) * 0.008 : 0;
                const idleSwayY = !walking ? Math.sin(elapsed * 0.9) * 0.01 : 0;
                
                const pitchFromMouse = -mouseNormY * (walking ? 0.15 : 0.25);
                
                head.rotation.y = lerp(head.rotation.y, headCurrentRotY + idleSwayY, 0.12);
                head.rotation.x = lerp(head.rotation.x, idleNodX + pitchFromMouse, 0.1);
            }
            
            if (neck && !walking) {
                neck.rotation.y = lerp(neck.rotation.y, mouseNormX * 0.15 + Math.sin(elapsed * 0.3) * 0.02, 0.08);
                neck.rotation.x = lerp(neck.rotation.x, breathCycle * 0.4 - mouseNormY * 0.08, 0.08);
            }

            // ───── BODY WEIGHT SHIFT (only when pausing) ─────
            const hips = currentVrm.humanoid?.getRawBoneNode('hips');
            if (hips && !walking && avatarState === 'pausing') {
                hips.rotation.y = Math.sin(elapsed * 0.25) * 0.015;
                hips.position.y = Math.sin(elapsed * 1.8) * 0.002;
            }

            // ───── SHOULDER MICRO-MOVEMENT (only when pausing) ─────
            const lShoulder = currentVrm.humanoid?.getRawBoneNode('leftShoulder');
            const rShoulder = currentVrm.humanoid?.getRawBoneNode('rightShoulder');
            if (lShoulder && avatarState === 'pausing') {
                lShoulder.rotation.z = breathCycle * 0.3;
            }
            if (rShoulder && avatarState === 'pausing') {
                rShoulder.rotation.z = -breathCycle * 0.3;
            }
        }
        
        // Body facing can happen even if VRMA is playing (it modifies scene rotation)
        if (avatarState === 'walking' || avatarState === 'pausing') {
            const dxMouse = targetX - currentVrm.scene.position.x;
            const bodyTargetY = Math.atan2(dxMouse, 3.5);
            currentVrm.scene.rotation.y = lerp(currentVrm.scene.rotation.y, bodyTargetY, 0.06);
            if (avatarState === 'pausing') {
                currentVrm.scene.rotation.z = lerp(currentVrm.scene.rotation.z, 0, 0.06);
            }
        }


        // ───── EYE BLINK (enhanced with double blinks) ─────
        // ✅ KEEP THIS: VRMA animations don't include eye blinks
        if (elapsed > nextBlinkTime) {
            setExpression('blink', 1);
            setTimeout(() => {
                setExpression('blink', 0);
                // Sometimes do a double blink
                if (Math.random() > 0.7) {
                    setTimeout(() => {
                        setExpression('blink', 1);
                        setTimeout(() => setExpression('blink', 0), 100);
                    }, 150);
                }
            }, 120);
            // Next blink in 2-6 seconds
            nextBlinkTime = elapsed + 2 + Math.random() * 4;
        }

        // ───── MOOD-BASED EXPRESSIONS ─────
        if (moodTransition > 0) {
            moodTransition = Math.max(0, moodTransition - delta);
        }
        
        // Apply mood-based expressions
        if (currentMood === 'happy' && moodTransition > 0) {
            currentHappyValue = Math.min(1, moodTransition * 2);
            setExpression('happy', currentHappyValue);
        } else if (currentMood === 'talking' && moodTransition > 0) {
            currentHappyValue = Math.min(0.5, moodTransition);
            setExpression('happy', currentHappyValue);
        } else if (currentMood === 'neutral') {
            currentHappyValue = Math.max(0, currentHappyValue - delta * 2);
            setExpression('happy', currentHappyValue);
        }

        // ───── LIP-SYNC (smooth interpolation) ─────
        if (isSpeaking && lipQueue.length > 0 && lipIndex < lipQueue.length) {
            lipTimer += delta;
            const currentFrame = lipQueue[lipIndex];

            // Set target mouth shape
            resetMouthTargets();
            if (currentFrame.vowel !== 'nn') {
                (mouthTarget as any)[currentFrame.vowel] = 1.0;
            }

            // Advance frame
            if (lipTimer >= currentFrame.duration) {
                lipTimer = 0;
                lipIndex++;
                if (lipIndex >= lipQueue.length) {
                    isSpeaking = false;
                    resetMouthTargets();
                    setMood('neutral');
                    // Return to walking after talking
                    setTimeout(() => setState('walking'), 2000);
                }
            }
        }

        // Smooth interpolation of mouth shapes
        const lerpSpeed = 25; // Higher = snappier transitions
        const t = Math.min(1, delta * lerpSpeed);
        mouthCurrent.aa = lerp(mouthCurrent.aa, mouthTarget.aa, t);
        mouthCurrent.ee = lerp(mouthCurrent.ee, mouthTarget.ee, t);
        mouthCurrent.ih = lerp(mouthCurrent.ih, mouthTarget.ih, t);
        mouthCurrent.oh = lerp(mouthCurrent.oh, mouthTarget.oh, t);
        mouthCurrent.ou = lerp(mouthCurrent.ou, mouthTarget.ou, t);

        setExpression('aa', mouthCurrent.aa);
        setExpression('ee', mouthCurrent.ee);
        setExpression('ih', mouthCurrent.ih);
        setExpression('oh', mouthCurrent.oh);
        setExpression('ou', mouthCurrent.ou);

        // ───── SPEECH GESTURES ─────
        // ⚠️ COMMENTED OUT: Now handled by VRMA talking animation
        /*
        if (isSpeaking && !isGesturing && avatarState === 'talking') {
            gestureTimer += delta;
            // Start a gesture every 1-2 seconds
            if (gestureTimer > 1 + Math.random()) {
                isGesturing = true;
                gestureStartTime = elapsed;
                gestureTimer = 0;
                gestureType = Math.random() > 0.5 ? 'right' : 'left';
            }
        }

        if (isGesturing) {
            const gestureDuration = 0.8;
            const gestureProgress = Math.min(1, (elapsed - gestureStartTime) / gestureDuration);
            const lArm = currentVrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
            const rArm = currentVrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
            const lLA = currentVrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
            const rLA = currentVrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
            
            // Smooth easing
            const ease = gestureProgress < 0.5 
                ? 2 * gestureProgress * gestureProgress 
                : 1 - Math.pow(-2 * gestureProgress + 2, 2) / 2;
            
            const gestureAmount = Math.sin(gestureProgress * Math.PI); // peak in middle
            
            if (gestureType === 'right' && rArm) {
                const baseRot = REST_R;
                const gestureRot = baseRot - 0.4 * gestureAmount;
                rArm.rotation.z = gestureRot;
                if (rLA) rLA.rotation.z = 0.15 - 0.3 * gestureAmount;
            } else if (gestureType === 'left' && lArm) {
                const baseRot = REST_L;
                const gestureRot = baseRot + 0.4 * gestureAmount;
                lArm.rotation.z = gestureRot;
                if (lLA) lLA.rotation.z = -0.15 + 0.3 * gestureAmount;
            }
            
            if (gestureProgress >= 1) {
                isGesturing = false;
            }
        }
        */ // End of commented out speech gestures

        // ───── GREETING WAVE (Enthusiastic & Warm) ─────
        // ⚠️ COMMENTED OUT: Now using VRMA wave animation from Mixamo
        /*
        const WAVE_REST = 1.2;       
        const WAVE_RAISED = -0.7;     // Raised higher for enthusiasm
        const WAVE_ELBOW_BEND = -1.1; // Elbow bent more naturally for a high wave
        
        if (isWaving) {
            const wt = elapsed - waveStartTime;
            const rArm = currentVrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
            const rForearm = currentVrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
            const rHand = currentVrm.humanoid?.getNormalizedBoneNode('rightHand');
            const rShoulder = currentVrm.humanoid?.getNormalizedBoneNode('rightShoulder');
            const chest = currentVrm.humanoid?.getRawBoneNode('chest');
            const head = currentVrm.humanoid?.getRawBoneNode('head');

            if (!rArm || !rForearm) {
                console.warn('⚠️ Arm bones not found!');
                isWaving = false;
            } else {
                const tRaise = 0.35;  // Fast, energetic raise
                const tWave = 2.4;    // Longer wave time for more excitement
                const tLower = 2.9;   // Total duration

                if (wt < tRaise) {
                    // Phase 1: Raise arm (Overshoot / BackOut Easing for springy feel)
                    let p = wt / tRaise;
                    const s = 1.70158;
                    const ep = --p * p * ((s + 1) * p + s) + 1; // backOut easing
                    
                    if (rShoulder) rShoulder.rotation.z = lerp(0, -0.25, ep); // Shoulder pop up
                    rArm.rotation.z = lerp(WAVE_REST, WAVE_RAISED, ep);
                    rArm.rotation.y = lerp(0, -0.4, ep); // Sweep arm slightly forward
                    rArm.rotation.x = lerp(0, 0.5, ep);  // Twist arm outward so palm faces FRONT
                    
                    rForearm.rotation.x = lerp(0, WAVE_ELBOW_BEND, ep);
                    rForearm.rotation.y = 0; 
                    rForearm.rotation.z = 0; 
                    
                    if (rHand) {
                        rHand.rotation.z = lerp(0, 0.2, ep); // Hand flips up backwards due to inertia
                    }
                    if (chest) {
                        chest.rotation.z = lerp(0, 0.05, ep); // Body leans into the wave
                        chest.rotation.y = lerp(0, -0.05, ep);
                    }
                    if (head) {
                        head.rotation.z = lerp(0, 0.1, ep); // Friendly head tilt
                        head.rotation.y = lerp(0, -0.05, ep);
                    }
                    
                    currentMood = 'happy';
                    moodTransition = 1;
                } 
                else if (wt < tWave) {
                    // Phase 2: Full Arm Sweeping Wave
                    if (rShoulder) rShoulder.rotation.z = -0.25;
                    
                    const waveTime = wt - tRaise;
                    const waveSpeed = 16; // Moderate speed for full arm sweep (~2.5 Hz)
                    const fade = Math.min(1, (tWave - wt) * 2); 
                    
                    const waveMotion = Math.sin(waveTime * waveSpeed) * fade; 
                    
                    // Main movement: Upper arm swings front/back horizontally!
                    rArm.rotation.z = WAVE_RAISED + waveMotion * 0.1;   // Tiny flap up/down
                    rArm.rotation.y = -0.4 + waveMotion * 0.35;         // BROAD SWEEP horizontal
                    rArm.rotation.x = 0.5;                              // Maintain palm facing OUT
                    
                    // Forearm stays mostly locked (like a real full-arm wave), tiny bit of spring
                    rForearm.rotation.x = WAVE_ELBOW_BEND + Math.abs(waveMotion) * 0.05; 
                    rForearm.rotation.z = waveMotion * 0.1; // Just a tiny follow-through (NO floppy elbow)
                    rForearm.rotation.y = 0; 
                    
                    if (chest) {
                        chest.rotation.z = 0.05 + waveMotion * 0.02; 
                        chest.rotation.y = -0.05 + waveMotion * 0.02; // Torso twists with the wave sweep
                    }
                    
                    if (head) {
                        head.rotation.z = 0.1 + waveMotion * 0.02;
                        head.rotation.y = -0.05 + waveMotion * 0.01;
                    }
                    
                    if (rHand) {
                        rHand.rotation.z = -waveMotion * 0.15; // Firm wrist, slighly lags full arm
                        rHand.rotation.x = Math.abs(waveMotion) * 0.1;
                    }
                } 
                else if (wt < tLower) {
                    // Phase 3: Lower arm smoothly (Ease In-Out Sine)
                    const p = (wt - tWave) / (tLower - tWave);
                    const ep = -(Math.cos(Math.PI * p) - 1) / 2; // smoothstep
                    
                    if (rShoulder) rShoulder.rotation.z = lerp(-0.25, 0, ep);
                    
                    // Return from base wave pos
                    rArm.rotation.z = lerp(WAVE_RAISED, WAVE_REST, ep);
                    rArm.rotation.y = lerp(-0.4, 0, ep);
                    rArm.rotation.x = lerp(0.5, 0, ep);
                    
                    rForearm.rotation.x = lerp(WAVE_ELBOW_BEND, 0, ep);
                    rForearm.rotation.z = lerp(rForearm.rotation.z, 0, ep);
                    rForearm.rotation.y = 0;
                    
                    if (chest) {
                        chest.rotation.z = lerp(0.05, 0, ep);
                        chest.rotation.y = lerp(-0.05, 0, ep);
                    }
                    
                    if (head) {
                        head.rotation.z = lerp(0.1, 0, ep);
                        head.rotation.y = lerp(-0.05, 0, ep);
                    }
                    
                    if (rHand) {
                        rHand.rotation.z = lerp(rHand.rotation.z, 0, ep);
                        rHand.rotation.x = lerp(rHand.rotation.x, 0, ep);
                    }
                    
                    moodTransition = Math.max(0, 1 - ep);
                } 
                else {
                    // Reset everything to exactly 0 to avoid drift
                    if (rShoulder) rShoulder.rotation.z = 0;
                    rArm.rotation.z = WAVE_REST;
                    rArm.rotation.y = 0;
                    rArm.rotation.x = 0;
                    rForearm.rotation.x = 0;
                    rForearm.rotation.z = 0;
                    rForearm.rotation.y = 0;
                    if (chest) {
                        chest.rotation.z = 0;
                        chest.rotation.y = 0;
                    }
                    if (head) {
                        head.rotation.z = 0;
                        head.rotation.y = 0;
                    }
                    if (rHand) {
                        rHand.rotation.z = 0;
                        rHand.rotation.x = 0;
                    }
                    isWaving = false;
                    currentMood = 'neutral';
                    console.log('✅ Full Arm wave complete');
                }
            }
        }
        */ // End of commented out wave animation

        // ───── UPDATE PARTICLES ─────
        const positions = particles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 1] += delta * particleSpeeds[i] * 0.2;
            if (positions[i * 3 + 1] > 4) {
                positions[i * 3 + 1] = 0;
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y = elapsed * 0.05;

        // ───── UPDATE GLOW RING & SHADOW ─────
        const ringPulse = Math.sin(elapsed * 2) * 0.1 + 0.3;
        glowRing.material.opacity = ringPulse;
        glowRing.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.05);
        
        // Update shadow position to follow avatar
        avatarShadow.position.x = currentVrm.scene.position.x;
        const shadowScale = 1 - (currentVrm.scene.position.y * 0.1);
        avatarShadow.scale.setScalar(shadowScale);

        currentVrm.update(delta);
    }

    renderer.render(scene, camera);
}

animate();

// --- Handle Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
