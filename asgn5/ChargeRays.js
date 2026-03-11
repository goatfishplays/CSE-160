// ChargeRays.js
import * as THREE from 'three';

export class ChargeRays {
    /**
     * options:
     *  - scene: THREE.Scene (required)
     *  - count: number of rays (default 48)
     *  - center: THREE.Vector3 (start ring/shell center) (default 0,0,0)
     *  - target: THREE.Vector3 (converge point) (default same as center)
     *  - radius: start radius from center (default 6)
     *  - spawnShape: 'ring' | 'cone' | 'sphere'  (default 'ring')
     *  - coneAngle: cone half-angle in degrees (only for 'cone', default 30)
     *  - length, baseWidth, tipWidth, color, speedRange, lifetime, loop — same as before
     *  - minScaleX: minimum width scale at tip (default 0.12)
     *  - minScaleY: minimum length scale at tip (default 0.25)
     *  - maxOpacity: peak opacity when bright (default 0.9)
     */
    constructor(opts = {}) {
        this.scene = opts.scene;
        if (!this.scene) throw new Error('ChargeRays: scene required');

        this.count = opts.count ?? 48;
        this.center = (opts.center ?? new THREE.Vector3()).clone();
        this.target = (opts.target ?? this.center).clone();
        this.radius = opts.radius ?? 6;
        this.spawnShape = opts.spawnShape ?? 'ring';
        this.coneAngle = (opts.coneAngle ?? 30) * Math.PI / 180; // radians
        this.length = opts.length ?? 6;
        this.baseWidth = opts.baseWidth ?? 1.2;
        this.tipWidth = opts.tipWidth ?? 0.06;
        this.color = new THREE.Color(opts.color ?? 0x00f2ff);
        this.speedRange = opts.speedRange ?? [0.9, 2.2];
        this.lifetime = opts.lifetime ?? 1.4;
        this.loop = (opts.loop ?? true);
        this.jitter = opts.jitter ?? 0.05; // radial jitter
        this.minScaleX = opts.minScaleX ?? 0; // width at tip (smaller -> thinner)
        this.minScaleY = opts.minScaleY ?? 0; // length compression at tip
        this.maxOpacity = opts.maxOpacity ?? 1; // how bright at peak
        this._allDone = false;

        this.beams = [];

        this._makeGeometry();
        this._makeBeams();
    }

    _makeGeometry() {
        const base = this.baseWidth;
        const tip = this.tipWidth;
        const h = this.length;

        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            -base / 2, 0, 0,
            base / 2, 0, 0,
            -tip / 2, h, 0,
            tip / 2, h, 0
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const indices = new Uint16Array([0, 2, 1, 2, 3, 1]);
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();
        this.geometry = geometry;
    }

    _makeBeams() {
        this.root = new THREE.Group();
        this.root.position.copy(this.center);
        this.scene.add(this.root);

        this.baseMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,       // must be transparent for fade
            opacity: 0.0,
            depthWrite: false,       // additive glow look
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });

        // precompute axis for cone/ring (axis points from center -> target)
        this._axis = new THREE.Vector3().subVectors(this.target, this.center);
        if (this._axis.lengthSq() < 1e-6) this._axis.set(0, 1, 0);
        this._axis.normalize();

        for (let i = 0; i < this.count; i++) {
            const mat = this.baseMat.clone();
            const c = this.color.clone();
            c.offsetHSL((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.05, 0);
            mat.color.copy(c);

            const mesh = new THREE.Mesh(this.geometry, mat);
            mesh.frustumCulled = false;
            mesh.renderOrder = 1;
            this.root.add(mesh);

            // pick initial spawn location according to spawnShape
            const startPos = this._sampleStartPosition(i);
            const endPos = this._sampleEndPosition();

            // quaternion so +Y (geometry forward) points toward endPos
            const upVec = new THREE.Vector3(0, 1, 0);
            const dirToTarget = new THREE.Vector3().subVectors(endPos, startPos).normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(upVec, dirToTarget);
            // tiny random twist for variety
            const twist = (Math.random() - 0.5) * 0.6;
            const twistQ = new THREE.Quaternion().setFromAxisAngle(dirToTarget, twist);
            q.premultiply(twistQ);
            mesh.quaternion.copy(q);

            // continuous random phase 0..1
            const phase = Math.random();
            const speed = THREE.MathUtils.lerp(this.speedRange[0], this.speedRange[1], Math.random());

            this.beams.push({
                mesh,
                startPos,
                endPos,
                speed,
                phase,
                done: false,
                angleIdx: i,
            });

            mesh.position.copy(startPos);
            mesh.visible = true;
        }
    }

    // helper: sample a start position according to the selected shape
    _sampleStartPosition(idx = 0) {
        const center = this.center;
        const axis = this._axis;
        if (this.spawnShape === 'sphere') {
            // uniform spherical direction
            const dir = randomUnitVector();
            const r = this.radius * (1 + (Math.random() - 0.5) * this.jitter);
            return new THREE.Vector3().copy(center).addScaledVector(dir, r);
        } else if (this.spawnShape === 'cone') {
            // sample direction inside cone around axis
            const dir = randomDirectionInCone(axis, this.coneAngle);
            const r = this.radius * (1 + (Math.random() - 0.5) * this.jitter);
            return new THREE.Vector3().copy(center).addScaledVector(dir, r);
        } else {
            // 'ring' or fallback — place around the plane perpendicular to axis
            // build orthonormal basis (u,v) perpendicular to axis
            const { u, v } = orthonormalBasis(axis);
            const angle = (idx / this.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
            const rad = this.radius * (1 + (Math.random() - 0.5) * this.jitter);
            const pos = new THREE.Vector3().copy(center)
                .addScaledVector(u, Math.cos(angle) * rad)
                .addScaledVector(v, Math.sin(angle) * rad);
            // add slight random tilt off the plane
            pos.addScaledVector(axis, (Math.random() - 0.5) * 0.15 * this.radius / 8);
            return pos;
        }
    }

    // small variation for end position to avoid z-fighting
    _sampleEndPosition() {
        const endOffset = new THREE.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08);
        return new THREE.Vector3().copy(this.target).add(endOffset);
    }

    // change spawn shape at runtime
    setSpawnShape(shape, coneAngleDegrees = null) {
        if (!['ring', 'cone', 'sphere'].includes(shape)) throw new Error('invalid spawnShape');
        this.spawnShape = shape;
        if (coneAngleDegrees != null) {
            this.coneAngle = coneAngleDegrees * Math.PI / 180;
        }
        // recompute axis and re-sample startPos for beams
        this._axis = new THREE.Vector3().subVectors(this.target, this.center);
        if (this._axis.lengthSq() < 1e-6) this._axis.set(0, 1, 0);
        this._axis.normalize();

        for (let i = 0; i < this.beams.length; i++) {
            const b = this.beams[i];
            b.startPos.copy(this._sampleStartPosition(i));
            // update mesh position so it doesn't jump too violently (place at start of its phase)
            const eased = easeOutCubic(b.phase);
            b.mesh.position.lerpVectors(b.startPos, b.endPos, eased);
        }
    }

    // start/stop looping
    setLooping(loop) { this.loop = !!loop; }
    stopReappearing() { this.loop = false; }
    isCharged() { return (!this.loop && this._allDone); }

    reset() {
        this._allDone = false;
        for (const b of this.beams) {
            b.done = false;
            b.phase = Math.random();
            b.mesh.visible = true;
        }
    }

    // optional external burst nudges phases forward (not required)
    trigger({ force = 1.0 } = {}) {
        for (const b of this.beams) {
            b.phase = Math.max(0, b.phase - 0.15 * force);
            b.done = false;
            b.mesh.visible = true;
        }
        this._allDone = false;
    }

    setCenter(v3) {
        this.center.copy(v3);
        this.root.position.copy(v3);
        // update axis and start positions
        this._axis = new THREE.Vector3().subVectors(this.target, this.center);
        if (this._axis.lengthSq() < 1e-6) this._axis.set(0, 1, 0);
        this._axis.normalize();

        for (let i = 0; i < this.beams.length; i++) {
            const b = this.beams[i];
            b.startPos.copy(this._sampleStartPosition(i));
            const eased = easeOutCubic(b.phase);
            b.mesh.position.lerpVectors(b.startPos, b.endPos, eased);
        }
    }

    setTarget(v3) {
        this.target.copy(v3);
        // update axis and end positions
        this._axis = new THREE.Vector3().subVectors(this.target, this.center);
        if (this._axis.lengthSq() < 1e-6) this._axis.set(0, 1, 0);
        this._axis.normalize();

        for (const b of this.beams) {
            b.endPos.copy(this._sampleEndPosition());
        }
    }

    // call every frame with delta seconds
    update(delta) {
        let anyActive = false;
        for (const b of this.beams) {
            if (b.done) continue;

            b.phase += delta * b.speed / this.lifetime;

            if (b.phase >= 1.0) {
                if (this.loop) {
                    b.phase -= 1.0;
                    // when wrapping, resample new startPos (so spawn looks continuous)
                    b.startPos.copy(this._sampleStartPosition(b.angleIdx));
                    b.endPos.copy(this._sampleEndPosition());
                } else {
                    b.phase = 1.0;
                    b.done = true;
                }
            }

            const eased = easeOutCubic(Math.min(1, b.phase));
            const pos = new THREE.Vector3().lerpVectors(b.startPos, b.endPos, eased);
            b.mesh.position.copy(pos);

            // re-orient +Y toward endPos
            const dirNow = new THREE.Vector3().subVectors(b.endPos, pos).normalize();
            if (dirNow.lengthSq() > 0.000001) {
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNow);
                const twist = Math.sin((b.phase + b.angleIdx) * 8.0) * 0.06;
                const twistQ = new THREE.Quaternion().setFromAxisAngle(dirNow, twist);
                q.premultiply(twistQ);
                b.mesh.quaternion.copy(q);
            }

            // scaling: shrink more strongly as they approach the center (using eased progress)
            const sx = THREE.MathUtils.lerp(1.0, this.minScaleX, eased);
            const sy = THREE.MathUtils.lerp(1.0, this.minScaleY, eased);
            b.mesh.scale.set(sx * (1 + Math.sin(b.angleIdx * 7) * 0.02), sy, 1);

            // opacity: fade in -> peak -> fade out (not opaque)
            const peak = 0.35;
            let opacity = 1;
            // if (eased < peak) {
            //     opacity = THREE.MathUtils.mapLinear(eased, 0, peak, 0.0, this.maxOpacity);
            // } else {
            //     opacity = THREE.MathUtils.mapLinear(eased, peak, 1.0, this.maxOpacity, 0.0);
            // }
            const flick = 0.12 * Math.sin((b.phase + b.angleIdx) * 18.0);
            b.mesh.material.opacity = Math.max(0, opacity + flick);

            if (b.done && b.mesh.material.opacity <= 0.01) {
                b.mesh.visible = false;
            } else {
                b.mesh.visible = true;
                anyActive = true;
            }
        }

        if (!anyActive && !this.loop) this._allDone = true;
    }

    dispose() {
        for (const b of this.beams) {
            b.mesh.material?.dispose();
            this.root.remove(b.mesh);
        }
        this.geometry?.dispose();
        this.baseMat?.dispose();
        this.scene.remove(this.root);
    }
}

/* ----------------------
   Helper utility funcs
   ---------------------- */

// return orthonormal basis u,v perpendicular to axis (axis normalized)
function orthonormalBasis(axis) {
    const arbitrary = Math.abs(axis.y) < 0.999 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(axis, arbitrary).normalize();
    const v = new THREE.Vector3().crossVectors(axis, u).normalize();
    return { u, v };
}

// uniform random unit vector on sphere
function randomUnitVector() {
    const z = Math.random() * 2 - 1; // cos(theta)
    const phi = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return new THREE.Vector3(Math.cos(phi) * r, Math.sin(phi) * r, z);
}

// uniform direction inside a cone (axis must be unit, angle is half-angle in radians)
function randomDirectionInCone(axis, angle) {
    // sample cos(theta) uniformly between cos(angle) and 1
    const cosMax = Math.cos(angle);
    const cosTheta = THREE.MathUtils.lerp(cosMax, 1, Math.random());
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = Math.random() * Math.PI * 2;

    // build orthonormal basis perpendicular to axis
    const { u, v } = orthonormalBasis(axis);

    // dir = axis * cosTheta + (u * cos(phi) + v * sin(phi)) * sinTheta
    const dir = new THREE.Vector3().copy(axis).multiplyScalar(cosTheta)
        .addScaledVector(u, Math.cos(phi) * sinTheta)
        .addScaledVector(v, Math.sin(phi) * sinTheta)
        .normalize();

    return dir;
}

function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}