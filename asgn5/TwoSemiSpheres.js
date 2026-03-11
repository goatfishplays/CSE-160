// TwoSemiSpheresEnhanced.js
import * as THREE from 'three';

function pseudoNoise(x, y, z) {
    // deterministic-ish hash noise using sin(dot)
    const dot = x * 12.9898 + y * 78.233 + z * 37.719;
    const s = Math.sin(dot) * 43758.5453123;
    return s - Math.floor(s); // [0,1)
}
export class TwoSemiSpheres extends THREE.Group {
    constructor({
        radius = 0.5,
        segments = 48,
        separation = 0.1,
        material = null,
        capMaterial = null,
        maps = {},
        bumpiness = 0.04,
        cloud = { enabled: true, opacity: 0.55, rotationSpeed: 0.02 },
        textureLoader = null,
    } = {}) {
        super();

        this.radius = radius;
        this.separation = separation;
        this.bumpiness = bumpiness;
        this.maps = maps;
        this.cloudOpts = Object.assign({ enabled: true, opacity: 0.55, rotationSpeed: 0.02 }, cloud);
        this._segments = Math.max(16, Math.floor(segments));
        this.loader = textureLoader ?? new THREE.TextureLoader();

        const baseColor = 0xba5e30;
        const domeMat = material || new THREE.MeshStandardMaterial({
            color: baseColor,
            metalness: 0.05,
            roughness: 0.7,
        });

        const capMat = capMaterial || new THREE.MeshStandardMaterial({
            color: 0x00f2ff,
            side: THREE.DoubleSide,
        });

        this.baseDomeMat = domeMat;
        this.baseCapMat = capMat;

        const hemiGeom = new THREE.SphereGeometry(
            radius,
            this._segments,
            this._segments,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2
        );

        const capGeom = new THREE.CircleGeometry(radius, this._segments);

        if (this.bumpiness > 0) {
            this._applyVertexBump(hemiGeom, this.bumpiness * this.radius);
        }

        // right hemisphere meshes
        const rightDome = new THREE.Mesh(hemiGeom, domeMat);
        rightDome.rotation.z = Math.PI / 2;
        rightDome.castShadow = true;
        rightDome.receiveShadow = true;

        const rightCap = new THREE.Mesh(capGeom, capMat);
        rightCap.rotation.y = Math.PI / 2;

        // left hemisphere meshes
        const leftGeom = hemiGeom.clone();
        const leftDome = new THREE.Mesh(leftGeom, domeMat.clone());
        leftDome.rotation.z = Math.PI / 2;
        leftDome.rotation.y = Math.PI;

        const leftCap = new THREE.Mesh(capGeom.clone(), capMat.clone());
        leftCap.rotation.y = -Math.PI / 2;

        // *** STORE REFERENCES BEFORE calling setSeparation ***
        this._rightDome = rightDome;
        this._leftDome = leftDome;
        this._rightCap = rightCap;
        this._leftCap = leftCap;

        // create groups and add meshes
        this.rightGroup = new THREE.Group();
        this.rightGroup.add(this._rightDome, this._rightCap);

        this.leftGroup = new THREE.Group();
        this.leftGroup.add(this._leftDome, this._leftCap);

        this.add(this.leftGroup);
        this.add(this.rightGroup);

        // now it's safe to call setSeparation
        this.setSeparation(separation);

        // cloud layer (unchanged)
        this.cloudMesh = null;
        if (this.cloudOpts.enabled) {
            const cloudGeom = new THREE.SphereGeometry(radius * 1.02, this._segments, this._segments);
            const cloudMat = new THREE.MeshStandardMaterial({
                transparent: true,
                opacity: this.cloudOpts.opacity,
                depthWrite: false,
                side: THREE.DoubleSide,
                toneMapped: false,
            });
            this.cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
            this.cloudMesh.visible = false;
            this.add(this.cloudMesh);
        }

        // load maps (unchanged)
        this._loadMaps();
    }

    // safer setSeparation using stored refs and guards
    setSeparation(separation) {
        this.separation = separation;
        const half = separation / 2;

        // position groups (always safe)
        if (this.rightGroup) this.rightGroup.position.set(half, 0, 0);
        if (this.leftGroup) this.leftGroup.position.set(-half, 0, 0);

        // Only attempt to change cap materials if the mesh refs exist
        if (this._rightDome && this._leftDome && this._rightCap && this._leftCap) {
            if (Math.abs(separation) < 1e-4) {
                // share dome material on caps when fully closed
                this._rightCap.material = this._rightDome.material;
                this._leftCap.material = this._leftDome.material;
            } else {
                // restore cap materials to the baseCapMat clones (if we have base stored)
                // if baseCapMat is a single material, clone it so each cap has independent material
                if (this.baseCapMat) {
                    // ensure caps get their own instances
                    this._rightCap.material = this.baseCapMat.clone ? this.baseCapMat.clone() : this.baseCapMat;
                    this._leftCap.material = this.baseCapMat.clone ? this.baseCapMat.clone() : this.baseCapMat;
                }
            }
        }

        // move cloud layer (optional)
        if (this.cloudMesh) this.cloudMesh.position.set(0, 0, 0);
    }

    _applyVertexBump(geometry, maxDisp) {
        const pos = geometry.attributes.position;
        const norm = geometry.attributes.normal;
        const v = new THREE.Vector3();
        const n = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            n.fromBufferAttribute(norm, i);

            const N = pseudoNoise(v.x * 10, v.y * 10, v.z * 10);
            const disp = (N - 0.5) * maxDisp;
            v.addScaledVector(n, disp);

            pos.setXYZ(i, v.x, v.y, v.z);
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    _setTextureColorSpace(tex) {
        // prefer sRGB for color maps
        if (!tex) return;
        if ('colorSpace' in tex) { // r125+ uses colorSpace
            tex.colorSpace = THREE.SRGBColorSpace;
        } else {
            tex.encoding = THREE.sRGBEncoding;
        }
    }

    _loadMaps() {
        // maps = { colorMap, normalMap, roughnessMap, aoMap, cloudMap } (strings)
        const mapNames = this.maps;
        const tasks = [];

        for (const key of ['colorMap', 'normalMap', 'roughnessMap', 'aoMap', 'cloudMap']) {
            if (mapNames && mapNames[key]) {
                tasks.push(
                    new Promise((resolve) => {
                        this.loader.load(mapNames[key], (tex) => {
                            this._setTextureColorSpace(tex);
                            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                            resolve({ key, tex });
                        }, undefined, () => resolve({ key, tex: null }));
                    })
                );
            }
        }

        if (tasks.length === 0) {
            // no external maps — fallback to subtle procedurals
            this._applyProceduralColor();
            return;
        }

        Promise.all(tasks).then((results) => {
            const mapObj = {};
            for (const r of results) mapObj[r.key] = r.tex;

            // apply to materials if loaded
            if (mapObj.colorMap) {
                this._rightDome.material.map = mapObj.colorMap;
                this._leftDome.material.map = mapObj.colorMap.clone();
                this._rightDome.material.needsUpdate = true;
                this._leftDome.material.needsUpdate = true;
            } else {
                this._applyProceduralColor();
            }

            if (mapObj.normalMap) {
                this._rightDome.material.normalMap = mapObj.normalMap;
                this._leftDome.material.normalMap = mapObj.normalMap.clone();
            }

            if (mapObj.roughnessMap) {
                this._rightDome.material.roughnessMap = mapObj.roughnessMap;
                this._leftDome.material.roughnessMap = mapObj.roughnessMap.clone();
            }

            if (mapObj.aoMap) {
                this._rightDome.material.aoMap = mapObj.aoMap;
                this._leftDome.material.aoMap = mapObj.aoMap.clone();
            }

            if (mapObj.cloudMap && this.cloudMesh) {
                this.cloudMesh.material.map = mapObj.cloudMap;
                this.cloudMesh.material.transparent = true;
                this.cloudMesh.material.opacity = this.cloudOpts.opacity;
                this.cloudMesh.visible = true;
            } else if (this.cloudMesh) {
                // fallback: procedural cloud canvas
                this._applyProceduralCloud();
            }

            // finalize materials
            for (const m of [this._rightDome.material, this._leftDome.material]) {
                m.needsUpdate = true;
                // better response to env
                m.envMapIntensity = m.envMapIntensity ?? 0.6;
            }
        }).catch((e) => {
            console.warn('map load failed', e);
            this._applyProceduralColor();
            if (this.cloudMesh) this._applyProceduralCloud();
        });
    }

    _applyProceduralColor() {
        // draw a small canvas with banded color + noise and apply as texture
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');

        // base radial gradient (dark edges, lighter center)
        const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
        grd.addColorStop(0, '#c86d3b');
        grd.addColorStop(0.6, '#9d4b2a');
        grd.addColorStop(1, '#641f10');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);

        // add grainy noise
        const img = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = (Math.random() - 0.5) * 18; // -9..9
            img.data[i] = Math.min(255, Math.max(0, img.data[i] + v));
            img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + v));
            img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + v));
        }
        ctx.putImageData(img, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        this._setTextureColorSpace(tex);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);

        this._rightDome.material.map = tex;
        this._leftDome.material.map = tex.clone();
        this._rightDome.material.needsUpdate = true;
        this._leftDome.material.needsUpdate = true;

        // also create a subtle normal map from canvas using a simple filter (cheap)
        // for now, leave normalMap null — the vertex bump gives tactile detail
    }

    _applyProceduralCloud() {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(255,255,255,0)';
        ctx.fillRect(0, 0, size, size);

        // paint some semi-random cloud shapes
        for (let i = 0; i < 40; i++) {
            ctx.beginPath();
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = size * (0.03 + Math.random() * 0.12);
            ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.25})`;
            ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.7), 0, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
        this.cloudMesh.material.map = tex;
        this.cloudMesh.material.needsUpdate = true;
        this.cloudMesh.visible = true;
    }

    update(delta) {
        // if cloud layer exists, rotate slowly for parallax
        if (this.cloudMesh && this.cloudOpts.enabled) {
            this.cloudMesh.rotation.y += (this.cloudOpts.rotationSpeed || 0.02) * delta * 60; // scaled to feel good
        }
    }

    dispose() {
        // clean up geometry/materials/textures
        const meshes = [this._rightDome, this._leftDome, this._rightCap, this._leftCap, this.cloudMesh];
        for (const m of meshes) {
            if (!m) continue;
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) {
                    m.material.forEach(mat => mat.dispose());
                } else {
                    if (m.material.map) m.material.map.dispose();
                    m.material.dispose();
                }
            }
        }
    }
}