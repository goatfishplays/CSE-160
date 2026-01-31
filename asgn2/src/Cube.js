
class Cube {
    static buffer;

    constructor() {
        this.type = 'Cube';
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
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        drawTriangle3D([
            // 0.0, 0.0, 0.0,
            // 1.0, 1.0, 0.0,
            // 1.0, 0.0, 0.0

            0.5, -0.5, -0.5,
            0.5, 0.5, -0.5,
            -0.5, -0.5, -0.5,
        ]);
        drawTriangle3D([
            0.5, 0.5, -0.5,
            -0.5, -0.5, -0.5,
            -0.5, 0.5, -0.5,
        ]);

        // Draw Back
        gl.uniform4f(u_FragColor, rgba[0] * 0.55, rgba[1] * 0.55, rgba[2] * 0.55, rgba[3]);
        drawTriangle3D([
            0.5, -0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, -0.5, 0.5,
        ]);
        drawTriangle3D([
            0.5, 0.5, 0.5,
            -0.5, -0.5, 0.5,
            -0.5, 0.5, 0.5,
        ]);

        // Draw Top
        gl.uniform4f(u_FragColor, rgba[0] * 0.9, rgba[1] * 0.9, rgba[2] * 0.9, rgba[3]);
        drawTriangle3D([
            -0.5, 0.5, -0.5,
            0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5
        ]);
        drawTriangle3D([
            -0.5, 0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, -0.5,
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
        gl.uniform4f(u_FragColor, rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]);
        drawTriangle3D([
            0.5, -0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, -0.5, 0.5
        ]);
        drawTriangle3D([
            0.5, -0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, -0.5,
        ]);
        // Draw Left
        gl.uniform4f(u_FragColor, rgba[0] * 0.7, rgba[1] * 0.7, rgba[2] * 0.7, rgba[3]);
        drawTriangle3D([
            -0.5, -0.5, -0.5,
            -0.5, 0.5, 0.5,
            -0.5, -0.5, 0.5
        ]);
        drawTriangle3D([
            -0.5, -0.5, -0.5,
            -0.5, 0.5, 0.5,
            -0.5, 0.5, -0.5,
        ]);

    }
}


function drawCube(M, color = [1, 1, 1, 1]) {
    var cube = new Cube();
    cube.color = color;
    cube.matrix = M;
    cube.render();
}


function drawTriangle3D(vertices) {
    var n = 3;  // number of verts per shape

    // create a buffer object
    if (!Cube.buffer) {
        Cube.buffer = gl.createBuffer()
        if (!Cube.buffer) {
            console.log("Failed to create the buffer object");
            return -1;
        }
    }

    // create a buffer object target
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);

    // write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Assing the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}