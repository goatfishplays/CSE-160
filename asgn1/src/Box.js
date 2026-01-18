class Box {
    constructor() {
        this.type = 'box';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.vertices = [
            BOTTOM_BOUND, LEFT_BOUND,
            BOTTOM_BOUND, RIGHT_BOUND,
            TOP_BOUND, RIGHT_BOUND,
            TOP_BOUND, LEFT_BOUND
        ];
    }

    render() {
        // bounds box
        drawLineLoop(this.vertices, this.color);
    }
}



function drawLineLoop(vertices, rgba) {
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

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

    gl.drawArrays(gl.LINE_LOOP, 0, n / 2);
}