class Diag {
    constructor() {
        this.type = 'Diag';
        // this.position = [0, 0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.width = 400;
    }

    // update(dt) {
    //     this.position[0] += this.velocity[0] * dt;
    //     this.position[1] += this.velocity[1] * dt;
    // }

    containsPoint(x, y) {
        // console.log(x);
        if ((y < x + 0.25 && y > x - 0.25)
            ||
            (y < - x + 0.25 && y > - x - 0.25)) {
            return true;
        }
        return false;
    }

    render() {
        // var xy = this.position;
        var rgba = this.color;


        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        drawFan([
            LEFT_BOUND - 1.05 - .25, BOTTOM_BOUND - 1.05,
            LEFT_BOUND + 2.05 - .25, BOTTOM_BOUND + 2.05,
            LEFT_BOUND + 2.05 + .25, BOTTOM_BOUND + 2.05,
            LEFT_BOUND - 1.05 + .25, BOTTOM_BOUND - 1.05,
        ]);

        drawFan([
            RIGHT_BOUND + 1.05 - .25, BOTTOM_BOUND - 1.05,
            RIGHT_BOUND - 2.05 - .25, BOTTOM_BOUND + 2.05,
            RIGHT_BOUND - 2.05 + .25, BOTTOM_BOUND + 2.05,
            RIGHT_BOUND + 1.05 + .25, BOTTOM_BOUND - 1.05,
        ])

    }
}
