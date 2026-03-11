// ExplosionCubes.js
import * as THREE from 'three';

export class ExplosionCubes {
    /**
     * options:
     *  - scene: THREE.Scene (required)
     *  - count: number of cubes (default 80)
     *  - center: THREE.Vector3 (default 0,0,0)
     *  - rotation: THREE.Euler (default 0,0,0) — rotation applied to direction vectors
     *  - radius: initial spawn radius from center (default 0.1)
     *  - minSpeed, maxSpeed: outward speed range (default 2..6)
     *  - minY, maxY: vertical stray range for initial direction (default -0.4..0.4)
     *  - cubeSize: default 0.12
     *  - lifetime: seconds before cube is removed/faded (default 4)
     *  - color: integer hex or THREE.Color (default 0xffaa33)
     */
    constructor(options = {}) {
        if (!options.scene) throw new Error('ExplosionCubes requires a THREE.Scene in options.scene');

        this.scene = options.scene;
        this.count = options.count ?? 80;
        this.center = (options.center ?? new THREE.Vector3(0, 0, 0)).clone();
        this.rotation = (options.rotation ?? new THREE.Euler(0, 0, 0)).clone();
        this.radius = options.radius ?? 0.1;
        this.minSpeed = options.minSpeed ?? 2;
        this.maxSpeed = options.maxSpeed ?? 6;
        this.minY = options.minY ?? -0.4;
        this.maxY = options.maxY ?? 0.4;
        this.minScale = options.minScale ?? 0.5;
        this.maxScale = options.maxScale ?? 1.5;
        this.lifetime = options.lifetime ?? 4.0;
        this.color = options.color ?? 0xffaa33;
        this.fade = options.fade ?? true; // fade out over lifetime


        this.texture = options.texture ?? null;

        const textureLoader = new THREE.TextureLoader();
        this.map = this.texture ? textureLoader.load(this.texture) : null;



        // internal storage
        this.cubes = [];
        this.velocities = []; // THREE.Vector3 per cube (world space)
        this.age = 0;
        this.active = false;

        // precomputed quaternion for rotation (apply to direction)
        this.quaternion = new THREE.Quaternion().setFromEuler(this.rotation);

        // geometry + material shared
        this.geometry = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize);
        this.material = new THREE.MeshStandardMaterial({
            color: this.map ? 0xffffff : this.color, // keep texture colors 
            map: this.map,
            roughness: 0.8,
            metalness: 0.0,
            transparent: this.fade || !!this.map,
            opacity: 1.0,
        });

        // create meshes (but placed at center and invisible until triggered)
        for (let i = 0; i < this.count; ++i) {
            const m = new THREE.Mesh(this.geometry, this.material.clone());
            m.position.copy(this.center);
            const s = THREE.MathUtils.lerp(
                this.minScale,
                this.maxScale,
                Math.random()
            );

            m.scale.set(s, s, s);
            // console.log(m.position);
            m.userData.age = 0;
            m.visible = false;
            this.scene.add(m);
            this.cubes.push(m);
            this.velocities.push(new THREE.Vector3(0, 0, 0));
        }
    }

    /** set the explosion center (can be changed before or after trigger) */
    setCenter(v3) {
        this.center.copy(v3);
        // update positions of cubes if they are not active (or you want to move them)
        for (const c of this.cubes) {
            if (!this.active) c.position.copy(this.center);
        }
    }

    /** set rotation (THREE.Euler) that orients the explosion directions */
    setRotation(euler) {
        this.rotation.copy(euler);
        this.quaternion.setFromEuler(this.rotation);
        // if not active, velocities will be computed with new quaternion during trigger
    }

    /** prepare velocities and start the explosion */
    trigger({
        force = 1.0, // global multiplier for speeds
        jitterRadius = 0.02, // initial random offset radius
    } = {}) {
        this.age = 0;
        this.active = true;

        for (let i = 0; i < this.count; ++i) {
            const mesh = this.cubes[i];

            // initial position: near center with small random jitter
            const jitterAngle = Math.random() * Math.PI * 2;
            const jitterR = this.radius * 0.5 * Math.random() + jitterRadius * Math.random();
            const px = this.center.x + Math.cos(jitterAngle) * jitterR;
            const pz = this.center.z + Math.sin(jitterAngle) * jitterR;
            const py = this.center.y + (Math.random() - 0.5) * jitterRadius * 2;

            mesh.position.set(px, py, pz);
            mesh.userData.age = 0;
            mesh.visible = true;
            mesh.material.opacity = 1.0;
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            // pick an outward angle on XZ plane
            const angle = Math.random() * Math.PI * 2;
            const dir = new THREE.Vector3(Math.cos(angle), // x
                THREE.MathUtils.lerp(this.minY, this.maxY, Math.random()), // y stray
                Math.sin(angle) // z
            );
            dir.normalize();

            // rotate direction by user-given rotation (so explosion can be oriented)
            dir.applyQuaternion(this.quaternion);

            // random speed
            const speed = THREE.MathUtils.lerp(this.minSpeed, this.maxSpeed, Math.random()) * force;

            // store velocity in world space — moving positions in world coords
            this.velocities[i].copy(dir).multiplyScalar(speed);
        }
    }

    /** stop and hide cubes (reset position to center) */
    reset() {
        this.active = false;
        this.age = 0;
        for (let i = 0; i < this.count; ++i) {
            const mesh = this.cubes[i];
            mesh.position.copy(this.center);
            mesh.visible = false;
            mesh.userData.age = 0;
            mesh.material.opacity = 1.0;
            this.velocities[i].set(0, 0, 0);
        }
    }

    /**
     * update must be called every frame from your render loop.
     * delta is seconds (float)
     */
    update(delta) {
        if (!this.active) return;

        this.age += delta;

        for (let i = 0; i < this.count; ++i) {
            const m = this.cubes[i];
            if (!m.visible) continue;

            // position update: velocities are in world-space; we move world positions
            m.position.x += this.velocities[i].x * delta;
            m.position.y += this.velocities[i].y * delta;
            m.position.z += this.velocities[i].z * delta;

            // spin the cubes as they fly
            m.rotation.x += 2.0 * delta * (0.5 + Math.random());
            m.rotation.y += 2.5 * delta * (0.5 + Math.random());

            // aging / fading
            m.userData.age += delta;
            if (this.fade) {
                const t = m.userData.age / this.lifetime;
                m.material.opacity = Math.max(0, 1 - t);
            }

            // optional gravity-ish effect (small pull down)
            // this.velocities[i].y -= 0.98 * delta * 0.25;
        }

        // if past lifetime, optionally hide/reset automatically
        if (this.age > this.lifetime) {
            // default behavior: hide them but keep in scene (you can reuse)
            for (const m of this.cubes) {
                m.visible = false;
            }
            this.active = false;
        }
    }

    /** clean up meshes and geometry (call if you want to remove permanently) */
    dispose() {
        for (const m of this.cubes) {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                else m.material.dispose();
            }
        }
        this.cubes.length = 0;
        this.velocities.length = 0;
        if (this.geometry) this.geometry.dispose();
    }
}