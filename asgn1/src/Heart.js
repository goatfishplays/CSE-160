
class Heart {
    constructor() {
        this.type = 'heart';
        this.position = [0.0, 0.0, 0.0];
        this.velocity = [0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 20.0;
    }

    update(dt) {
        if (keys["ArrowLeft"]) this.position[0] -= 1 * dt;
        if (keys["ArrowRight"]) this.position[0] += 1 * dt;
        if (keys["ArrowUp"]) this.position[1] += 1 * dt;
        if (keys["ArrowDown"]) this.position[1] -= 1 * dt;
        console.log(this.position);
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;

        // // Pass the position of a point to a_Position variable
        // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        // Pass size of point to u_Size var
        gl.uniform1f(u_Size, size)

        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Draw
        var d = this.size / 200.0;
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