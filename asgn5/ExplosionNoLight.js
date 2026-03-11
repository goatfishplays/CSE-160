// ExplosionNoLight.js
import * as THREE from 'three';

export class ExplosionNoLight {
    /**
     * options:
     *  - scene: THREE.Scene (required)
     *  - count: number of cubes (default 100)
     *  - center: THREE.Vector3 (default 0,0,0)
     *  - rotation: THREE.Euler (default 0,0,0) — orients the explosion directions
     *  - radius: initial spawn jitter radius (default 0.05)
     *  - minSpeed, maxSpeed: outward speed range (default 2..7)
     *  - minY, maxY: vertical stray range for initial direction (default -0.4..0.4)
     *  - baseCubeSize: base geometry size (default 0.04)
     *  - minScale, maxScale: random scale multiplier range (default 0.5..2.0)
     *  - lifetime: seconds before hide (default 3.0)
     *  - colorA: THREE.Color or hex for white (default 0xffffff)
     *  - colorB: THREE.Color or hex for sky-blue (default 0x99ccff)
     *  - fade: boolean, fade out over lifetime (default true)
     *  - ring: options for ring pulse (object) or false to disable (default enabled)
     *      - color, lifetime, maxScale, thickness (inner/outer), segments
     */
    constructor(opts = {}) {
        if (!opts.scene) throw new Error('ExplosionNoLight requires options.scene (THREE.Scene)');

        this.scene = opts.scene;
        this.count = opts.count ?? 100;
        this.center = (opts.center ?? new THREE.Vector3(0, 0, 0)).clone();
        this.rotation = (opts.rotation ?? new THREE.Euler(0, 0, 0)).clone();
        this.radius = opts.radius ?? 0.05;
        this.minSpeed = opts.minSpeed ?? 2;
        this.maxSpeed = opts.maxSpeed ?? 7;
        this.minY = opts.minY ?? -0.35;
        this.maxY = opts.maxY ?? 0.5;
        this.baseCubeSize = opts.baseCubeSize ?? 0.04;
        this.minScale = opts.minScale ?? 0.6;
        this.maxScale = opts.maxScale ?? 1.8;
        this.lifetime = opts.lifetime ?? 3.0;
        this.fade = opts.fade ?? true;
        this.colorA = new THREE.Color(opts.colorA ?? 0xffffff); // white
        this.colorB = new THREE.Color(opts.colorB ?? 0x00f2ff); // sky-blue

        // ring defaults
        const defRing = {
            color: new THREE.Color(0x00f2ff),
            lifetime: 1.2,
            maxScale: 8.0,
            inner: 0.45,
            outer: 0.5,
            segments: 128
        };
        this.ringOpts = Object.assign({}, defRing, opts.ring ?? {});
        if (!(this.ringOpts.color instanceof THREE.Color)) {
            this.ringOpts.color = new THREE.Color(this.ringOpts.color);
        }

        // internals
        this.quaternion = new THREE.Quaternion().setFromEuler(this.rotation);
        this.geometry = new THREE.BoxGeometry(this.baseCubeSize, this.baseCubeSize, this.baseCubeSize);

        this.cubes = [];
        this.velocities = [];
        this.ages = new Array(this.count).fill(0);
        this.active = false;
        this.age = 0;

        // create meshes (MeshBasicMaterial ignores lights)
        for (let i = 0; i < this.count; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: this.fade,
                opacity: 1.0,
                depthWrite: true,
            });
            // Add additive feel optionally by using additive blending for a glow effect (commented)
            // mat.blending = THREE.AdditiveBlending;

            const m = new THREE.Mesh(this.geometry, mat);
            m.position.copy(this.center);
            m.visible = false;
            m.userData = { age: 0, baseOpacity: 1.0 };
            this.scene.add(m);
            this.cubes.push(m);
            this.velocities.push(new THREE.Vector3());
        }

        // Ring: create but hidden until trigger
        this.ringMesh = null;
        this.ringAge = 0;
        this.ringActive = false;
        this._makeRing();
    }

    _makeRing() {
        // small unit ring that we will scale
        const r = this.ringOpts;
        // create a ring with small radii and scale it up later
        const geom = new THREE.RingGeometry(r.inner, r.outer, r.segments);
        const mat = new THREE.MeshBasicMaterial({
            color: r.color.clone(),
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            depthWrite: false,          // so it doesn't occlude
            blending: THREE.AdditiveBlending, // glow-like
        });
        this.ringMesh = new THREE.Mesh(geom, mat);
        this.ringMesh.visible = false;
        // orient the ring in XZ plane by rotating around X (so ring expands horizontally)
        this.ringMesh.rotation.x = -Math.PI / 2;
        // apply explosion rotation to ring's quaternion base so ring respects setRotation
        this.ringMesh.quaternion.multiplyQuaternions(this.quaternion, this.ringMesh.quaternion);
        this.scene.add(this.ringMesh);
    }

    setCenter(v3) {
        this.center.copy(v3);
        if (!this.active) {
            for (const c of this.cubes) c.position.copy(this.center);
            if (this.ringMesh) this.ringMesh.position.copy(this.center);
        }
    }

    setRotation(euler) {
        this.rotation.copy(euler);
        this.quaternion.setFromEuler(this.rotation);
        // update ring orientation immediately
        if (this.ringMesh) {
            // reset ring base rotation (xz plane) and then apply quaternion
            this.ringMesh.rotation.x = -Math.PI / 2;
            this.ringMesh.quaternion.setFromEuler(this.ringMesh.rotation);
            this.ringMesh.quaternion.multiplyQuaternions(this.quaternion, this.ringMesh.quaternion);
        }
    }

    /** trigger the explosion; options: force multiplier and jitterRadius */
    trigger({ force = 1.0, jitterRadius = 0.02 } = {}) {
        this.age = 0;
        this.active = true;
        this.ringActive = !!this.ringMesh;
        this.ringAge = 0;

        for (let i = 0; i < this.count; i++) {
            const mesh = this.cubes[i];

            // random jitter start around center
            const jitterAngle = Math.random() * Math.PI * 2;
            const jitterR = (Math.random() * 0.5 + 0.25) * this.radius + jitterRadius * Math.random();
            const px = this.center.x + Math.cos(jitterAngle) * jitterR;
            const pz = this.center.z + Math.sin(jitterAngle) * jitterR;
            const py = this.center.y + THREE.MathUtils.randFloatSpread(this.radius * 0.5);

            mesh.position.set(px, py, pz);
            mesh.userData.age = 0;
            mesh.visible = true;
            mesh.material.opacity = mesh.userData.baseOpacity = 1.0;

            // random rotation
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            // random scale between minScale..maxScale (uniform)
            const s = THREE.MathUtils.randFloat(this.minScale, this.maxScale);
            mesh.scale.set(s, s, s);
            mesh.userData.scale = s;

            // color between colorA and colorB
            const t = Math.random();
            const c = new THREE.Color();
            c.copy(this.colorA).lerp(this.colorB, t);
            mesh.material.color.copy(c);

            // velocity: pick an angle on XZ plane and random Y within range
            const angle = Math.random() * Math.PI * 2;
            const dir = new THREE.Vector3(Math.cos(angle), THREE.MathUtils.lerp(this.minY, this.maxY, Math.random()), Math.sin(angle));
            dir.normalize();
            // rotate direction by explosion quaternion
            dir.applyQuaternion(this.quaternion);

            const speed = THREE.MathUtils.randFloat(this.minSpeed, this.maxSpeed) * force;
            this.velocities[i].copy(dir).multiplyScalar(speed);
        }

        // ring init
        if (this.ringMesh) {
            this.ringMesh.position.copy(this.center);
            this.ringMesh.scale.set(0.0001, 0.0001, 0.0001);
            this.ringMesh.material.opacity = 1.0;
            this.ringMesh.visible = true;
            // reapply rotation quaternion (in case setRotation called earlier)
            this.ringMesh.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
            this.ringMesh.quaternion.multiplyQuaternions(this.quaternion, this.ringMesh.quaternion);
        }
    }

    /** reset and hide */
    reset() {
        this.active = false;
        this.age = 0;
        for (let i = 0; i < this.count; i++) {
            const m = this.cubes[i];
            m.visible = false;
            m.position.copy(this.center);
            m.userData.age = 0;
            this.velocities[i].set(0, 0, 0);
            if (m.material) m.material.opacity = 1.0;
        }
        if (this.ringMesh) {
            this.ringMesh.visible = false;
            this.ringAge = 0;
            this.ringActive = false;
        }
    }

    /** update each frame; delta in seconds */
    update(delta) {
        if (!this.active) return;

        this.age += delta;

        for (let i = 0; i < this.count; i++) {
            const m = this.cubes[i];
            if (!m.visible) continue;

            // simple motion
            m.position.x += this.velocities[i].x * delta;
            m.position.y += this.velocities[i].y * delta;
            m.position.z += this.velocities[i].z * delta;

            // rotation — smaller cubes spin faster for nicer effect
            const spinFactor = 2.0 / (m.userData.scale ?? 1.0);
            m.rotation.x += delta * spinFactor * (0.5 + Math.random());
            m.rotation.y += delta * spinFactor * (0.7 + Math.random());

            // aging/fade
            m.userData.age += delta;
            if (this.fade) {
                const t = m.userData.age / this.lifetime;
                m.material.opacity = Math.max(0, 1 - t);
            }
        }

        // ring update
        if (this.ringActive && this.ringMesh) {
            this.ringAge += delta;
            const t = this.ringAge / this.ringOpts.lifetime;
            // scale from tiny to maxScale
            const s = THREE.MathUtils.lerp(0.02, this.ringOpts.maxScale, t);
            this.ringMesh.scale.set(s, s, s);
            // fade
            this.ringMesh.material.opacity = Math.max(0, 1 - t);
            if (this.ringAge >= this.ringOpts.lifetime) {
                this.ringMesh.visible = false;
                this.ringActive = false;
            }
        }

        if (this.age > this.lifetime) {
            // hide cubes but keep for reuse
            for (const m of this.cubes) m.visible = false;
            this.active = false;
        }
    }

    dispose() {
        for (const m of this.cubes) {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
        }
        this.cubes.length = 0;
        this.velocities.length = 0;
        if (this.ringMesh) {
            this.scene.remove(this.ringMesh);
            if (this.ringMesh.geometry) this.ringMesh.geometry.dispose();
            if (this.ringMesh.material) this.ringMesh.material.dispose();
            this.ringMesh = null;
        }
        if (this.geometry) this.geometry.dispose();
    }
}