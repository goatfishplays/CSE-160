import * as THREE from 'three';
import { TwoSemiSpheres } from './TwoSemiSpheres.js';
import { StarField } from './StarField.js';
import { ExplosionCubes } from './ExplosionCubes.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { ExplosionNoLight } from './ExplosionNoLight.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { ChargeRays } from './ChargeRays.js';


// THREE things
let renderer;
let scene;
let textureLoader;
let rt;                     // render target for desaturation
let fsQuad, fsScene, fsCamera; // fullscreen quad scene+camera
let chargeScene;            // separate scene that contains only charge.root
let sequenceRunning = false;
let desatActive = false;
let invertActive = false;
let invertTimer = 0;
let chargeFrozen = false;
let cleaverPlane = null;
let cleaverAnim = null;
let hemiSepAnim = null;
let savedRendererSize = { w: 0, h: 0 };

// Camera
const fov = 75;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 100;
let camera;
let controls;


// plannet
let hemi;
let hemiLight;
let explosion;
let lightExplosion;

let guyPose1;
let guyPose2;
let charge;

let guyLight;
let guyLight2;


let keylock = false;
let freeze = false;

function makeDesaturateMaterial() {
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: null },
            uDesaturate: { value: 1.0 }, // 1 -> full desat, 0 -> normal
            uInvert: { value: 0.0 },     // 1 -> invert, 0 -> normal
        },
        vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
        fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uDesaturate;
      uniform float uInvert;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        // convert to linear-like luminance for better result
        float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 gray = vec3(lum);
        vec3 mixed = mix(c.rgb, gray, uDesaturate);
        // invert if requested
        if (uInvert > 0.5) mixed = vec3(1.0) - mixed;
        gl_FragColor = vec4(mixed, c.a);
      }
    `,
        depthTest: false,
        depthWrite: false,
    });
    return mat;
}

function prepareCompositeHelpers() {
    const canvas = renderer.domElement;
    const dpr = renderer.getPixelRatio();

    if (rt) rt.dispose();
    // size in device pixels
    const w = Math.max(1, Math.floor((canvas.clientWidth || canvas.width) * dpr));
    const h = Math.max(1, Math.floor((canvas.clientHeight || canvas.height) * dpr));
    rt = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        encoding: renderer.outputEncoding,
    });
    rt.texture.generateMipmaps = false;

    savedRendererSize.w = canvas.clientWidth || canvas.width;
    savedRendererSize.h = canvas.clientHeight || canvas.height;

    // fullscreen scene for drawing the render target texture desaturated/inverted
    fsScene = new THREE.Scene();
    fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeom = new THREE.PlaneGeometry(2, 2);
    const fsMat = makeDesaturateMaterial();
    fsQuad = new THREE.Mesh(quadGeom, fsMat);
    fsQuad.frustumCulled = false;
    fsScene.add(fsQuad);
}



// stars
const starField = new StarField({
    count: 400,
    fieldSize: { x: 30, y: 12, z: 20 },
    minSize: 0.02,
    maxSize: 0.12,
    speedRange: [0.4, 1.6],
    colors: [0xffffff, 0xffe0a0, 0xa0c8ff, 0xffa0d4],
    opacity: 0.95,
});






function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const needResize =
        canvas.width !== width ||
        canvas.height !== height;

    if (needResize) {
        renderer.setSize(width, height, false);
    }

    return needResize;
}




// ---------- the main sequence function ----------
function startChargeSequence() {
    if (sequenceRunning) return;
    sequenceRunning = true;

    // ensure composite helpers exist and sized
    prepareCompositeHelpers();

    // 1) start charge rays streaming
    if (charge) {
        charge.reset();
        charge.setLooping(true);
    }

    // 2) enable scene desaturation (charge will be rendered separately)
    desatActive = true;

    // timeline / durations (tweak if you want)
    const invertDelay = 2.0; // seconds until the quick invert frame
    const invertDuration = 0.5; // 250ms invert
    const cleaverMoveDuration = 0.15;
    const cleaverHoldAfter = 0.05;
    const hemiSepDuration = 1.6;

    function resetEntireThing() {
        console.log("Resetting scene...");

        // 1. Reset Planet
        if (hemi) {
            hemi.setSeparation(0);
            // If your hemi class has a specific reset or internal state
            if (hemi.separation !== undefined) hemi.separation = 0;
        }

        // 2. Reset Poses & Lights
        swapToPose1();

        // 3. Reset Charge Rays
        if (charge) {
            charge.setLooping(false);
            if (charge.root) charge.root.visible = false;
            charge.reset();
        }
        chargeFrozen = false;

        // 4. Reset Post-processing flags
        desatActive = false;
        invertActive = false;
        invertTimer = 0;

        // 5. Ensure Cleaver is gone
        removeCleaverPlane();

        // 6. Reset Sequence Lock
        sequenceRunning = false;
    }


    // freeze charge only during the invert frame
    setTimeout(() => {
        // freeze charge and invert
        chargeFrozen = true;
        invertActive = true;
        invertTimer = invertDuration * 1000;



        // swap poses/lights to the impact pose right at the impact frame
        swapToPose2();
        // create an initial cleaver plane (frozen during invert)
        createCleaverPlane();
        // after invertDuration ms, unfreeze and start cleaver sweep animation
        setTimeout(() => {
            invertActive = false;

            // 1. Instead of unfreezing, hide the charge rays
            if (charge) {
                charge.root.visible = false; // Instantly hide the rays
                charge.setLooping(false);    // Stop any internal spawning
                chargeFrozen = true;         // Keep it frozen so it stops updating
            }
            // animate the cleaver moving from center toward guy light
            animateCleaverMove(cleaverMoveDuration * 1000, () => {
                // short hold then remove plane and continue
                setTimeout(() => {
                    removeCleaverPlane();
                    // restore color (disable desat)
                    chargeFrozen = false;
                    desatActive = false;
                    // trigger explosions
                    if (explosion) explosion.trigger({ force: 1.6, jitterRadius: 0.03 });
                    if (lightExplosion) lightExplosion.trigger({ force: 1.6, jitterRadius: 0.03 });
                    // start hemi separation// start hemi separation
                    startHemiSeparation(hemiSepDuration);

                    // Sequence logic ends after hemi sep anim completes
                    setTimeout(() => {
                        // Allow the 'B' key to work again

                        console.log("Sequence finished. Resetting in 10 seconds...");

                        // THE AUTO-RESET TIMER
                        setTimeout(() => {
                            // Only reset if a NEW sequence hasn't been started manually

                            resetEntireThing();
                        }, 5000); // 10 seconds

                    }, hemiSepDuration * 1000);
                }, cleaverHoldAfter * 1000);
            });
        }, invertDuration * 1000);
    }, invertDelay * 1000);
}

// ---------- helpers for cleaver plane ----------
function createCleaverPlane() {
    if (!hemi) return;

    const w = 40;
    const h = 40;
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00f2ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
    });

    const geom = new THREE.PlaneGeometry(w, h);

    // 1. Rotate the geometry so it faces the LOCAL X-axis
    // (This aligns the plane with the 'cut' surface of your hemispheres)
    geom.rotateY(Math.PI / 2);

    cleaverPlane = new THREE.Mesh(geom, mat);

    // 2. Copy the hemisphere's position and rotation exactly
    cleaverPlane.position.copy(hemi.position);
    cleaverPlane.quaternion.copy(hemi.quaternion);

    cleaverPlane.renderOrder = 100;
    cleaverPlane.material.depthWrite = false;

    scene.add(cleaverPlane);
}

function animateCleaverMove(durationMs, onComplete) {
    if (!cleaverPlane || !hemi) {
        if (onComplete) onComplete();
        return;
    }

    const start = cleaverPlane.position.clone();

    // Get the hemisphere's world X-direction (the separation axis)
    const separationDir = new THREE.Vector3(1, 0, 0).applyQuaternion(hemi.quaternion);

    const moveDistance = 5; // How far the "slice" travels
    const end = start.clone().addScaledVector(separationDir, moveDistance);

    const t0 = performance.now();
    const tick = (now) => {
        const elapsed = now - t0;
        const p = Math.min(1, elapsed / durationMs);
        const eased = easeOutCubic(p);

        // cleaverPlane.position.lerpVectors(start, end, eased);

        if (p < 1) {
            requestAnimationFrame(tick);
        } else if (onComplete) {
            onComplete();
        }
    };
    requestAnimationFrame(tick);
}


// ---------- hemisphere separation animation ----------
function startHemiSeparation(durationSeconds = 2.5) {
    // hemi.setSeparation expects values; we will animate from current to target then settle.
    const startSep = hemi ? hemi.separation ?? 0 : 0; // if hemi has property
    const targetSep = -1.2; // tweakable final separation
    const t0 = performance.now();
    const durationMs = durationSeconds * 1000;

    hemiSepAnim = {
        startSep,
        targetSep,
        t0,
        durationMs
    };
}

function removeCleaverPlane() {
    if (!cleaverPlane) return;
    scene.remove(cleaverPlane);
    cleaverPlane.geometry.dispose();
    cleaverPlane.material.dispose();
    cleaverPlane = null;
}

// swap visible poses and lights to pose2 (impact)
function swapToPose2() {
    if (typeof guyPose1 !== 'undefined' && guyPose1) guyPose1.visible = false;
    if (typeof guyPose2 !== 'undefined' && guyPose2) guyPose2.visible = true;

    // swap lights if available
    if (typeof guyLight !== 'undefined' && guyLight) guyLight.visible = false;
    if (typeof guyLight2 !== 'undefined' && guyLight2) guyLight2.visible = true;
}

// optional: swap back to pose1 (not used by default, but handy)
function swapToPose1() {
    if (typeof guyPose1 !== 'undefined' && guyPose1) guyPose1.visible = true;
    if (typeof guyPose2 !== 'undefined' && guyPose2) guyPose2.visible = false;

    if (typeof guyLight !== 'undefined' && guyLight) guyLight.visible = true;
    if (typeof guyLight2 !== 'undefined' && guyLight2) guyLight2.visible = false;
}

function main() {
    const canvas = document.querySelector('#c');
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.autoClear = false; // Add this line

    prepareCompositeHelpers();
    renderer.setClearColor(0x202030);
    // make sure we render at device pixel ratio (avoid pixelation on HiDPI screens)
    // clamp to 2 to avoid extremely large buffers on very high DPI displays.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    scene = new THREE.Scene();
    // camera
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    // camera.position.z = 2;
    // camera.lookAt(0, 0, 0);renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(-0.25, 1, 5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // ensure camera uses layers 0 and 1 (0 = main world, 1 = charge)
    camera.layers.enable(0);
    camera.layers.enable(1);
    // start rendering default layer 0
    camera.layers.set(0);

    // // --- Debug helper: add near top of main(), right after `scene = new THREE.Scene();` ---
    // (function addDebugHelpers() {
    //     // bright unlit sphere at origin so we can always see something
    //     const dbgGeo = new THREE.SphereGeometry(0.35, 24, 16);
    //     const dbgMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, toneMapped: false });
    //     const dbgMesh = new THREE.Mesh(dbgGeo, dbgMat);
    //     dbgMesh.name = 'DEBUG_SPHERE';
    //     dbgMesh.position.set(0, 0, 0);
    //     dbgMesh.layers.set(0); // ensure it's on main layer
    //     scene.add(dbgMesh);

    //     // small axis helper too
    //     const axis = new THREE.AxesHelper(1.2);
    //     axis.position.set(0, 0, 0);
    //     axis.layers.set(0);
    //     scene.add(axis);

    //     // quick keyboard toggle to show/hide skybox (press 'k')
    //     window.addEventListener('keydown', (ev) => {
    //         if (ev.key === 'k') {
    //             if (scene.background) {
    //                 console.log('Hiding skybox/background');
    //                 scene._savedBackground = scene.background;
    //                 scene.background = null;
    //             } else {
    //                 console.log('Restoring skybox/background');
    //                 scene.background = scene._savedBackground || null;
    //             }
    //         }
    //     });

    //     // every render we print a little diagnostic once (not spamming)
    //     let printed = false;
    //     const onceLog = () => {
    //         if (printed) return;
    //         printed = true;
    //         console.log('--- DEBUG INFO ---');
    //         console.log('camera.position', camera?.position ? camera.position.clone() : '<no camera>');
    //         console.log('hemi (if set):', typeof hemi === 'undefined' ? '<no hemi var>' : hemi);
    //         const meshCount = scene.children.filter(c => c.isMesh).length;
    //         console.log('scene.children count:', scene.children.length, 'mesh count:', meshCount);
    //         const dbg = scene.getObjectByName('DEBUG_SPHERE');
    //         console.log('DEBUG_SPHERE visible?', dbg ? dbg.visible : 'missing', 'layers.mask:', dbg ? dbg.layers.mask : 'n/a');
    //         console.log('------------------');
    //     };

    //     // attach to requestAnimationFrame loop by wrapping existing render request
    //     const oldReq = window.requestAnimationFrame;
    //     window.requestAnimationFrame = function wrapped(fn) {
    //         const wrappedFn = (t) => {
    //             onceLog();
    //             fn(t);
    //         };
    //         return oldReq.call(window, wrappedFn);
    //     };
    // })();

    // scene.add(new THREE.AxesHelper(5));



    // controls
    controls = new FlyControls(camera, renderer.domElement);

    controls.movementSpeed = 3;
    controls.rollSpeed = Math.PI / 6;
    controls.autoForward = false;
    controls.dragToLook = true;



    // plannet
    // create the semispheres and add to scene
    hemi = new TwoSemiSpheres({
        radius: 2,
        segments: 64,               // higher segments = smoother displacement + better normal shading
        separation: 0,
        bumpiness: 0.05,           // small bumps

        cloud: { enabled: true, opacity: 0.6, rotationSpeed: 0.01 },
    });
    hemi.rotation.z = -70 * Math.PI / 180;
    hemi.position.set(0, 0, -5);
    scene.add(hemi);

    explosion = new ExplosionCubes({
        scene,
        count: 120,
        center: hemi.position,
        rotation: hemi.rotation,
        minSpeed: 2,
        maxSpeed: 8,
        minY: -0.3,
        maxY: 0.3,
        minScale: 0.02,
        maxScale: 0.2,
        lifetime: 3.5,
        color: 0xba5e30,
        texture: "resources/images/RockThing.png"
    });
    explosion.setRotation(new THREE.Euler(0, 0, 20 * Math.PI / 180));

    lightExplosion = new ExplosionNoLight({
        scene,
        count: 140,
        center: hemi.position, // remember to call explosion.setCenter(hemi.position) if you want it linked
        rotation: explosion.rotation,
        minSpeed: 2,
        maxSpeed: 9,
        minY: -0.2,
        maxY: 0.2,
        baseCubeSize: 0.03,
        minScale: 0.5,
        maxScale: 1.8,
        lifetime: 3.0,
        colorA: 0xffffff,
        colorB: 0x00f2ff,
        ring: { color: 0x00f2ff, lifetime: 1.5, maxScale: 20.0 }
    });



    // console.log(hemi.position);
    // console.log(explosion.center);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'b') {
            // prevent double-trigger
            if (!sequenceRunning) {

                startChargeSequence();
            }
        }
        if (e.key === 'c') {
            if (charge) charge.trigger({ force: 1.6, jitter: 0.25 });
        }
    });

    // * Plannet(point) Light
    hemiLight = new THREE.PointLight(0xffffff, 10, 20);
    hemiLight.position.set(...hemi.position);

    scene.add(hemiLight);


    // stars
    scene.add(starField);


    // * Scene Light
    const color = 0xFFFFFF;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-6, 8, 4);
    scene.add(light);
    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    // amb.position.set(-6, 8, 4);
    scene.add(amb);

    // * Texture
    const loadManager = new THREE.LoadingManager();
    textureLoader = new THREE.TextureLoader(loadManager);

    const loader = new THREE.TextureLoader();
    const texture = loader.load(
        'resources/images/sky.png',
        () => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            scene.background = texture;
        });



    // force key objects to layer 0 so they show up in desaturated render
    if (hemi && hemi.root === undefined) hemi.layers.set(0); // hemi probably an Object3D already
    else if (hemi && hemi.root) hemi.root.layers.set(0);     // safe path if hemi wraps a root
    if (starField && starField.layers) starField.layers.set(0);
    if (explosion && explosion.root) explosion.root.layers.set(0);
    if (lightExplosion && lightExplosion.root) lightExplosion.root.layers.set(0);

    // lights: lights affect layers the object is on; lights don't need layer change
    // but guarantee the point lights are visible: 
    if (hemiLight) hemiLight.layers.enable(0);


    const mtlLoader = new MTLLoader(); const objLoader = new OBJLoader();
    mtlLoader.load('resources/models/lowPoly1.mtl', (mtl) => {
        mtl.preload();
        for (const material of Object.values(mtl.materials)) {
            material.side = THREE.DoubleSide;
        }
        objLoader.setMaterials(mtl);
        objLoader.load('resources/models/lowPoly1.obj', (root) => {
            guyPose1 = root;
            guyPose1.scale.set(0.1, 0.1, 0.1);
            guyPose1.rotation.y = Math.PI * 1.1;
            guyPose1.position.z = 4;
            guyPose1.position.x = .25;
            guyPose1.position.y = -.1;

            guyLight = new THREE.PointLight(0x00f2ff, 1, 2);
            guyLight.position.set(0.1, 0.3, 4);
            charge = new ChargeRays({
                scene,
                spawnShape: 'sphere',
                // coneAngle: 25,
                center: guyLight.position.clone(),
                target: guyLight.position.clone().add(new THREE.Vector3(-0.1, - 0.3, -4)),
                radius: 20,
                length: 10,
                baseWidth: 1.0,
                tipWidth: 0.01,
            });
            // instead of moveChargeOutOfScene(), do:
            if (charge && charge.root) {
                // put the charge on layer 1 so we can render it separately
                charge.root.layers.set(1);
                // ensure the rest of the scene (default) stays on layer 0
                console.log(charge.root.layers.mask);
            }
            scene.add(guyLight);
            if (guyLight) guyLight.layers.enable(0);
            scene.add(root);
        });
        objLoader.load('resources/models/lowPoly2.obj', (root) => {
            guyPose2 = root;
            guyPose2.scale.set(0.1, 0.1, 0.1);
            guyPose2.rotation.y = Math.PI * 1.1;
            guyPose2.position.z = 4;
            guyPose2.position.x = .25;
            guyPose2.position.y = -.1;
            guyPose2.visible = false;

            guyLight2 = new THREE.PointLight(0x00f2ff, 25, 10);
            guyLight2.position.set(.4, 0.75, 3);
            guyLight2.visible = false;
            if (guyLight2) guyLight2.layers.enable(0);
            scene.add(guyLight2);
            scene.add(root);
        });
    });






    requestAnimationFrame(render);


    console.log("hats");
}



let lastTime = 0;
function render(time) {
    time *= 0.001;  // seconds
    const delta = time - lastTime;
    lastTime = time;

    controls.update(delta);

    // update starField
    if (!chargeFrozen) {

        starField.update(delta, camera);
    }

    // update explosions
    explosion.update(delta);
    lightExplosion.update(delta);

    // update charge only when it's not frozen
    if (charge && !chargeFrozen) {
        charge.update(delta);
    }

    // update hemi separation animation (if active)
    if (hemiSepAnim && hemi) {
        const now = performance.now();
        const elapsed = now - hemiSepAnim.t0;
        const p = Math.min(1, elapsed / hemiSepAnim.durationMs);
        const eased = easeOutCubic(p);
        const sepVal = THREE.MathUtils.lerp(hemiSepAnim.startSep, hemiSepAnim.targetSep, eased);
        hemi.setSeparation(sepVal);
        if (p >= 1) {
            hemiSepAnim = null; // finished
        }
    }

    renderer.clear();
    // Store the background so we can toggle it
    const activeBackground = scene.background;
    if (desatActive) {
        // --- PASS 1: Main World to Render Target ---
        camera.layers.set(0);
        renderer.setRenderTarget(rt);
        renderer.clear();
        renderer.render(scene, camera); // Renders background + Layer 0

        // --- PASS 2: Desaturate Quad to Screen ---
        renderer.setRenderTarget(null);
        fsQuad.material.uniforms.tDiffuse.value = rt.texture;
        fsQuad.material.uniforms.uDesaturate.value = 1.0;
        fsQuad.material.uniforms.uInvert.value = invertActive ? 1.0 : 0.0;
        renderer.render(fsScene, fsCamera); // Renders the quad

        // --- PASS 3: Charge on top ---
        scene.background = null; // <--- IMPORTANT: Disable BG for this pass
        camera.layers.set(1);
        // Optional: renderer.clearDepth(); // If you want charge rays to always be on top
        renderer.render(scene, camera);
        scene.background = activeBackground; // Restore BG

    } else {
        // --- NORMAL RENDERING ---
        renderer.setRenderTarget(null);

        // Render Layer 0 (Main World + Background)
        camera.layers.set(0);
        renderer.render(scene, camera);

        // Render Layer 1 (Charge) without redrawing the background
        scene.background = null; // <--- IMPORTANT
        camera.layers.set(1);
        renderer.render(scene, camera);
        scene.background = activeBackground; // Restore BG
    }

    requestAnimationFrame(render);
}

// cubic easing out (used by animations)
function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

main();