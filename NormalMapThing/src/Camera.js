class Camera {
    constructor(eye = [16, 5, 16], at = [16, 5, 17]) {
        this.eye = new Vector3(eye);
        this.at = new Vector3(at);
        this.up = new Vector3([0, 1, 0]);
        this.camRot = [0, 0];
        this.fspeed = 0.025;
        this.bspeed = 0.023;
        this.sspeed = 0.024;
        this.uspeed = 0.024;
        this.ccube = new Cube();
        this.ccube.matrix.setScale(0.1, 0.1, 0.1);
        this.ccube.matrix.translate(...this.at.elements);
        this.ccube.color = [1, 0, 0, 1];
        this.ccube.texColorWeight = 0;
        this.ccube.generateCube(...wholeTexture);
        // shapes.push(this.ccube);
        this.rotSpeed = 5;
        this.viewMatrix = new Matrix4();
        this.projectionMatrix = new Matrix4();

        this.aspect = canvas.width / canvas.height;
        console.log(this.aspect);

        // window.addEventListener("resize", (e) => {
        //     this.aspect = canvas.width / canvas.height;

        //     this.calculateViewProjection();
        // });

        this.calculateViewProjection();
    }

    calculateViewProjection() {
        this.viewMatrix.setLookAt(
            ...this.eye.elements,
            ...this.at.elements,
            ...this.up.elements
        );

        this.projectionMatrix.setPerspective(
            60, // 90 FOV is the best FOV but the assignment comes first :(
            this.aspect,
            0.1,
            1000);
    }

    getForward() {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        return f;
    }

    moveUp(delta) {
        let f = this.up;
        f.normalize();
        f.mul(delta);

        this.eye.add(f);
        this.at.add(f);
    }
    moveForward(delta) {
        let f = this.getForward();
        f.normalize();
        f.mul(delta);

        this.eye.add(f);
        this.at.add(f);
    }
    moveBackward(delta) {
        let b = new Vector3();
        b.set(this.eye);
        b.sub(this.at);
        b.normalize();
        b.mul(delta);

        this.eye.add(b);
        this.at.add(b);
    }
    moveLeft(delta) {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        let s = Vector3.cross(f, this.up);
        s.normalize();
        s.mul(delta);

        this.eye.add(s);
        this.at.add(s);
    }
    moveRight(delta) {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        let s = Vector3.cross(this.up, f);
        s.normalize();
        s.mul(delta);

        this.eye.add(s);
        this.at.add(s);
    }

    zRot(amt) {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);

        let rotMat = new Matrix4();
        rotMat.setRotate(amt, ...this.up.elements);

        // console.log(this.up);
        // console.log(f);
        // console.log(rotMat);
        let f_prime = rotMat.multiplyVector3(f);
        // console.log(f_prime);
        f_prime.add(this.eye);
        this.at = f_prime;
        // console.log(this.eye);
        // console.log(this.at);
    }

    xRot(amt) {
        // console.log(amt, this.camRot[1]);
        let nv = this.camRot[1] + amt;
        if (nv > 89) {
            amt = 89 - this.camRot[1];
        }
        else if (nv < -89) {
            amt = -89 - this.camRot[1];
        }
        this.camRot[1] += amt;

        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        let s = Vector3.cross(f, this.up);

        let rotMat = new Matrix4();
        rotMat.setRotate(amt, ...s.elements);

        // console.log(this.up);
        // console.log(f);
        // console.log(rotMat);
        let s_prime = rotMat.multiplyVector3(f);
        // console.log(f_prime);
        s_prime.add(this.eye);
        this.at = s_prime;
        // console.log(this.eye);
        // console.log(this.at);
    }

    panLeft() {
        // console.log("pl")
        this.zRot(15);
    }
    panRight() {
        this.zRot(-15);
    }
}
