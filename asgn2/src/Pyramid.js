
class Pyramid {
    static buffer;

    constructor() {
        this.type = 'Pyramid';
        // this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        // this.size = 20.0;
        // this.segments = 100;
        this.matrix = new Matrix4();

    }

    render() {
        // var xy = this.position;
        var rgba = this.color;
        // var size = this.size;

        // // Pass the position of a point to a_Position variable
        // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        // Pass size of point to u_Size var
        // gl.uniform1f(u_Size, size)

        // Pass the color of a point to u_FragColor variable

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Draw Front
        gl.uniform4f(u_FragColor, 0.95 * rgba[0], 0.95 * rgba[1], 0.95 * rgba[2], rgba[3]);
        drawTriangle3D([
            // 0.0, 0.0, 0.0,
            // 1.0, 1.0, 0.0,
            // 1.0, 0.0, 0.0

            0.5, -0.5, -0.5,
            -0.5, -0.5, -0.5,
            0, 0.5, 0,
        ]);

        // Draw Back
        gl.uniform4f(u_FragColor, rgba[0] * 0.65, rgba[1] * 0.65, rgba[2] * 0.65, rgba[3]);
        drawTriangle3D([
            0.5, -0.5, 0.5,
            -0.5, -0.5, 0.5,
            0, 0.5, 0,
        ]);

        // Draw Bottom
        gl.uniform4f(u_FragColor, rgba[0] * 0.6, rgba[1] * 0.6, rgba[2] * 0.6, rgba[3]);
        drawTriangle3D([
            -0.5, -0.5, -0.5,
            0.5, -0.5, 0.5,
            -0.5, -0.5, 0.5
        ]);
        drawTriangle3D([
            -0.5, -0.5, -0.5,
            0.5, -0.5, 0.5,
            0.5, -0.5, -0.5,
        ]);

        // Draw Right
        gl.uniform4f(u_FragColor, rgba[0] * 0.85, rgba[1] * 0.85, rgba[2] * 0.85, rgba[3]);
        drawTriangle3D([
            0.5, -0.5, -0.5,
            0.5, -0.5, 0.5,
            0, 0.5, 0,
        ]);

        // Draw Left
        gl.uniform4f(u_FragColor, rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]);
        drawTriangle3D([
            -0.5, -0.5, -0.5,
            -0.5, -0.5, 0.5,
            0, 0.5, 0,
        ]);

    }
}


function drawPyramid(M, color = [1, 1, 1, 1]) {
    var pyr = new Pyramid();
    pyr.color = color;
    pyr.matrix = M;
    pyr.render();
}

