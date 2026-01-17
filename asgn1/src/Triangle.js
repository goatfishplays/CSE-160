
class Triangle {
    constructor() {
        this.type = 'triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 20.0;
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
            xy[0] - d / 2, xy[1] - d / 2,
            xy[0] + d / 2, xy[1] - d / 2,
            xy[0], xy[1] + d / 2
        ]);
    }
}

function drawTriangle(vertices) {
    var n = 3;  // number of verts per shape

    // create a buffer object
    var vertexBuffer = gl.createBuffer()
    if (!vertexBuffer) {
        console.log("Failed to create the buffer object");
        return -1;
    }

    // create a buffer object target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Assing the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}



function drawTriangleScaled(vertices, rgba) {

    for (let i = 0; i < vertices.length; i += 2) {
        vertices[i] -= 6;
        vertices[i] /= 6;
        vertices[i + 1] -= 6;
        vertices[i + 1] /= 6;
    }

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    var n = 3;  // number of verts per shape

    // create a buffer object
    var vertexBuffer = gl.createBuffer()
    if (!vertexBuffer) {
        console.log("Failed to create the buffer object");
        return -1;
    }

    // create a buffer object target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Assing the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}
