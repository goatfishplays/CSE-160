const cube_size = (1) / 2;

class Cube {
    static buffer;

    constructor() {
        this.type = 'Cube';
        this.color = [1.0, 0.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.lit = true;
        this.top = new Plane();
        this.bottom = new Plane();
        this.front = new Plane();
        this.back = new Plane();
        this.left = new Plane();
        this.right = new Plane();
        // this.matrix.rotate(45, 1, 0, 0)

        // create a buffer object
        if (!Cube.buffer) {
            Cube.buffer = gl.createBuffer()
            if (!Cube.buffer) {
                console.log("Failed to create the buffer object");
                return -1;
            }
        }

    }

    generateCube() {
        // TOP: Already on XZ, just move up
        this.top.matrix = new Matrix4(this.matrix);
        this.top.matrix.translate(0, 0.5, 0);

        // BOTTOM: Already on XZ, move down and flip to face outward
        this.bottom.matrix = new Matrix4(this.matrix);
        this.bottom.matrix.translate(0, -0.5, 0);
        this.bottom.matrix.rotate(180, 1, 0, 0);

        // FRONT: Rotate around X to stand up, move forward on Z
        this.front.matrix = new Matrix4(this.matrix);
        this.front.matrix.translate(0, 0, 0.5);
        this.front.matrix.rotate(90, 1, 0, 0);

        // BACK: Rotate around X to stand up, move backward on Z
        this.back.matrix = new Matrix4(this.matrix);
        this.back.matrix.translate(0, 0, -0.5);
        this.back.matrix.rotate(-90, 1, 0, 0);

        // LEFT: Rotate around Z to stand up, move left on X
        this.left.matrix = new Matrix4(this.matrix);
        this.left.matrix.translate(-0.5, 0, 0);
        this.left.matrix.rotate(90, 0, 0, 1);

        // RIGHT: Rotate around Z to stand up, move right on X
        this.right.matrix = new Matrix4(this.matrix);
        this.right.matrix.translate(0.5, 0, 0);
        this.right.matrix.rotate(-90, 0, 0, 1);
    }

    render() {
        gl.useProgram(defaultProgram);
        var lit = this.lit;
        var rgba = this.color;
        this.top.color = rgba;
        this.bottom.color = rgba;
        this.front.color = rgba;
        this.back.color = rgba;
        this.left.color = rgba;
        this.right.color = rgba;
        this.top.lit = lit;
        this.bottom.lit = lit;
        this.front.lit = lit;
        this.back.lit = lit;
        this.left.lit = lit;
        this.right.lit = lit;
        this.generateCube();


        this.top.render();
        this.bottom.render();
        this.front.render();
        this.back.render();
        this.left.render();
        this.right.render();
    }
}


