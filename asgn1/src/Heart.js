const SPEED = 1;
const JUMPSPEED = 1;
const GRAVITY = 1.75;

const MAX_JUMP_HEIGHT = -.05

const BOTTOM_BOUND = -.5;
const TOP_BOUND = .5;
const LEFT_BOUND = -.5;
const RIGHT_BOUND = .5;


class Heart {
    constructor() {
        this.type = 'heart';
        this.position = [0.0, 0.0, 0.0];
        this.velocity = [0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 20.0;
        // this.jumpTime = 0;
        this.jumping = false;
        this.jumpReleased = false;
        this.grounded = false;
    }

    update(dt) {
        // Red mode
        if (this.color[2] < 0.5) {
            this.velocity = [0.0, 0.0];

            if (keys["ArrowLeft"]) this.velocity[0] = -SPEED;
            if (keys["ArrowRight"]) this.velocity[0] = SPEED;
            if (keys["ArrowUp"]) this.velocity[1] = SPEED;
            if (keys["ArrowDown"]) this.velocity[1] = -SPEED;
        }
        // Blue mode
        else {
            this.velocity[0] = 0.0;
            this.velocity[1] -= GRAVITY * dt;


            if (keys["ArrowLeft"]) this.velocity[0] = -SPEED;
            if (keys["ArrowRight"]) this.velocity[0] = SPEED;

            // jumping
            if (this.grounded && this.jumpReleased) {
                if (keys["ArrowUp"]) {
                    this.velocity[1] = JUMPSPEED;
                    this.jumping = true;
                    this.jumpReleased = false;
                    this.grounded = false;
                }
            }
            else if (this.jumping) {
                if (keys["ArrowUp"] && this.position[1] < MAX_JUMP_HEIGHT) {
                    this.velocity[1] = JUMPSPEED;
                }
                else {
                    this.velocity[1] /= 2;
                    this.jumping = false;
                }
            }
            if (!keys["ArrowUp"]) {
                this.jumpReleased = true;
            }

        }

        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;
        if (this.position[1] < BOTTOM_BOUND + this.size / (2 * SCALING_FACTOR)) {
            this.position[1] = BOTTOM_BOUND + this.size / (2 * SCALING_FACTOR);
            this.velocity[1] = 0;
            // this.jumpTime = 0;
            this.grounded = true;
        }
        if (this.position[1] > TOP_BOUND - this.size / (2 * SCALING_FACTOR)) {
            this.position[1] = TOP_BOUND - this.size / (2 * SCALING_FACTOR);
        }
        if (this.position[0] < LEFT_BOUND + this.size / (2 * SCALING_FACTOR)) {
            this.position[0] = LEFT_BOUND + this.size / (2 * SCALING_FACTOR);
        }
        if (this.position[0] > RIGHT_BOUND - this.size / (2 * SCALING_FACTOR)) {
            this.position[0] = RIGHT_BOUND - this.size / (2 * SCALING_FACTOR);
        }
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;

        // // Pass the position of a point to a_Position variable
        // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        // Pass size of point to u_Size var
        // gl.uniform1f(u_Size, size)

        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Draw
        var d = this.size / SCALING_FACTOR;
        drawTriangle([
            xy[0] - d / 2, xy[1],
            xy[0] + d / 2, xy[1],
            xy[0], xy[1] - d / 2
        ]);
        drawTriangle([
            xy[0] - d / 2, xy[1],
            xy[0] + d / 2, xy[1],
            xy[0] - d / 2, xy[1] + d / 2
        ]);
        drawTriangle([
            xy[0] + d / 2, xy[1],
            xy[0] - d / 2, xy[1],
            xy[0] + d / 2, xy[1] + d / 2
        ]);
    }
}
