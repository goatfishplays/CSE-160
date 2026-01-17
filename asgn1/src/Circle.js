
class Circle {
    constructor() {
        this.type = 'triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 20.0;
        this.segments = 100;
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
        var d = this.size / 200.0 / 2; // / 2 so diam = sqare len
        let verts = [xy[0], xy[1]]
        for (let i = 0; i <= this.segments; i++) {
            verts.push(xy[0] + d * Math.cos(2 * Math.PI / this.segments * i));
            verts.push(xy[1] + d * Math.sin(2 * Math.PI / this.segments * i));
        }
        drawFan(verts);
    }
}

function drawFan(vertices) {
    var n = vertices.length;  // number of verts per shape

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

    gl.drawArrays(gl.TRIANGLE_FAN, 0, n / 2);
}
