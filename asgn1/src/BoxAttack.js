class BoxAttack {
    constructor() {
        this.type = 'BoxAttack';
        this.position = [0, 0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.length = 400;
        this.width = 100;
    }

    // update(dt) {
    //     this.position[0] += this.velocity[0] * dt;
    //     this.position[1] += this.velocity[1] * dt;
    // }

    containsPoint(x, y) {
        // console.log(x);
        if (this.position[0] - this.width / 2 / SCALING_FACTOR <= x && this.position[0] + this.width / 2 / SCALING_FACTOR >= x) {
            if (this.position[1] - (this.length) / 2 / SCALING_FACTOR <= y && this.position[1] + (this.length) / 2 / SCALING_FACTOR >= y) {
                return true;
            }
        }
        return false;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;

        // // Pass the position of a point to a_Position variable
        // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        // Pass size of point to u_Size var
        // gl.uniform1f(u_Size, size)

        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Draw
        var halfWidth = this.width / 2 / SCALING_FACTOR;
        var halfLen = this.length / 2 / SCALING_FACTOR;
        drawTriangle([
            xy[0] + halfWidth, -halfLen + xy[1],
            xy[0] + halfWidth, halfLen + xy[1],
            xy[0] - halfWidth, halfLen + xy[1],
        ]);
        drawTriangle([
            xy[0] - halfWidth, -halfLen + xy[1],
            xy[0] + halfWidth, -halfLen + xy[1],
            xy[0] - halfWidth, halfLen + xy[1]
        ]);

    }
}
