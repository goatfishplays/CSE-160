import * as THREE from 'three';

export class StarField extends THREE.Group {
    /**
     * options:
     *  count: number of stars
     *  fieldSize: { x, y, z }  -- extents of placement box (centered at group's origin)
     *  minSize: smallest scale for a star (when sizeFactor == 0)
     *  maxSize: largest scale for a star (when sizeFactor == 1)
     *  speedRange: [minSpeed, maxSpeed] multiplier for per-star twinkle speed
     *  colors: array of hex or THREE.Color to pick/lerp between
     *  opacity: material opacity for stars (0..1)
     */
    constructor({
        count = 200,
        fieldSize = { x: 10, y: 6, z: 10 },
        minSize = 0.02,
        maxSize = 0.18,
        speedRange = [0.6, 2.0],
        colors = [0xffffff],
        opacity = 1.0,
    } = {}) {
        super(); // allows position/rotation/scale on the StarField

        this._params = { count, fieldSize, minSize, maxSize, speedRange, colors, opacity };
        this._stars = []; // array of { mesh, sizeFactor, growing, speed, targetSize, color }

        // Reusable diamond geometry (unit diamond in XY plane, centered)
        // diamond vertices: top (0,1,0), right (1,0,0), bottom (0,-1,0), left (-1,0,0)
        // two triangles: (0,1,2) and (2,3,0)
        const diamondGeom = new THREE.BufferGeometry();
        const positions = new Float32Array([
            0, 1, 0,   // 0
            1, 0, 0,   // 1
            0, -1, 0,  // 2
            -1, 0, 0,  // 3
        ]);
        const uvs = new Float32Array([
            0.5, 1.0,
            1.0, 0.5,
            0.5, 0.0,
            0.0, 0.5,
        ]);
        const indices = new Uint16Array([
            0, 1, 2,
            2, 3, 0,
        ]);
        diamondGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        diamondGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        diamondGeom.setIndex(new THREE.BufferAttribute(indices, 1));
        diamondGeom.computeVertexNormals();

        this._diamondGeom = diamondGeom;

        // create stars
        for (let i = 0; i < count; ++i) {
            const { mesh, meta } = this._createStar(minSize, maxSize, speedRange, colors, opacity);
            this.add(mesh);
            this._stars.push({ mesh, meta });
        }
    }

    _randBetween(a, b) { return a + Math.random() * (b - a); }

    _pickColor(colors) {
        // colors: array of hex or THREE.Color. Randomly lerp between two colors for richer variety.
        if (!Array.isArray(colors) || colors.length === 0) return new THREE.Color(0xffffff);
        if (colors.length === 1) return new THREE.Color(colors[0]);
        const a = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
        const b = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
        const t = Math.random();
        return a.lerp(b, t);
    }

    _randomPositionInField(fieldSize) {
        return new THREE.Vector3(
            this._randBetween(-fieldSize.x / 2, fieldSize.x / 2),
            this._randBetween(-fieldSize.y / 2, fieldSize.y / 2),
            this._randBetween(-fieldSize.z / 2, fieldSize.z / 2)
        );
    }

    _createStar(minSize, maxSize, speedRange, colors, opacity) {
        // choose color
        const color = this._pickColor(colors);

        // mesh material (unlit)
        const mat = new THREE.MeshBasicMaterial({
            color,
            side: THREE.DoubleSide,
            transparent: opacity < 1.0,
            opacity: opacity,
            depthWrite: false, // optional: helps blends
        });

        // reuse shared geometry
        const mesh = new THREE.Mesh(this._diamondGeom, mat);

        // random initial position
        const pos = this._randomPositionInField(this._params.fieldSize);
        mesh.position.copy(pos);

        // random orientation in plane (so diamond rotated randomly)
        mesh.rotation.z = Math.random() * Math.PI * 2;

        // initial size factor [0,1] (where 0 -> minSize, 1 -> maxSize)
        // randomize initial phase so not all twinkle in sync
        const sizeFactor = Math.random();
        const growing = Math.random() > 0.5;

        // per-star speed
        const speed = this._randBetween(speedRange[0], speedRange[1]) * (0.5 + Math.random());

        // compute initial scale
        const scale = THREE.MathUtils.lerp(minSize, maxSize, sizeFactor);
        mesh.scale.set(scale, scale, scale);

        // Allow fractional render order to avoid z-fighting (optional)
        mesh.renderOrder = Math.random();

        // metadata for animation
        const meta = {
            sizeFactor,
            growing,
            speed,
            minSize,
            maxSize,
            color,
        };

        return { mesh, meta };
    }

    /**
     * Update the twinkle animation.
     * @param {number} deltaSeconds - seconds since last frame
     * @param {THREE.Camera} camera - camera to billboard toward
     */
    update(deltaSeconds, camera) {
        if (!camera) {
            console.warn('StarField.update called without camera — billboarding skipped.');
        }

        const { minSize, maxSize, fieldSize } = this._params;

        for (const s of this._stars) {
            const { mesh, meta } = s;

            // animate sizeFactor (0..1)
            if (meta.growing) {
                meta.sizeFactor += meta.speed * deltaSeconds;
                if (meta.sizeFactor >= 1.0) {
                    meta.sizeFactor = 1.0;
                    meta.growing = false;
                }
            } else {
                meta.sizeFactor -= meta.speed * deltaSeconds;
                if (meta.sizeFactor <= 0.0) {
                    // upon reaching zero, teleport to new random position and start growing
                    const pos = this._randomPositionInField(fieldSize);
                    mesh.position.copy(pos);
                    meta.sizeFactor = 0.0;
                    meta.growing = true;

                    // optionally change color/random rotation for variety
                    const newColor = this._pickColor(this._params.colors);
                    mesh.material.color.copy(newColor);
                    mesh.rotation.z = Math.random() * Math.PI * 2;
                }
            }

            // easing for nicer visual (ease in/out)
            const eased = meta.sizeFactor * meta.sizeFactor * (3 - 2 * meta.sizeFactor); // smoothstep
            const size = THREE.MathUtils.lerp(minSize, maxSize, eased);
            mesh.scale.set(size, size, size);

            // billboard to camera: set world quaternion to camera's quaternion (so plane faces camera)
            if (camera) {
                // If your StarField group is transformed (rotated/scaled/translated),
                // we want stars to face the camera in world space. Copying camera quaternion
                // to the mesh does that because Mesh.quaternion is in local space; setting it
                // to camera.quaternion gives the correct world-facing orientation when the mesh
                // is not parented under weird scales. This is fine in normal use.
                mesh.quaternion.copy(camera.quaternion);
            }
        }
    }

    /**
     * Dispose geometries / materials
     */
    dispose() {
        // dispose shared geometry
        if (this._diamondGeom) {
            this._diamondGeom.dispose();
            this._diamondGeom = null;
        }

        // dispose materials
        for (const s of this._stars) {
            if (s.mesh && s.mesh.material) {
                s.mesh.material.dispose();
            }
            if (s.mesh && s.mesh.geometry && s.mesh.geometry !== this._diamondGeom) {
                s.mesh.geometry.dispose();
            }
        }

        // remove children
        this._stars.forEach(s => { if (s.mesh) this.remove(s.mesh); });
        this._stars = [];
    }
}