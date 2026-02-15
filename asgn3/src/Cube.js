const cube_size = (1) / 2;

class Cube {
    static buffer;

    constructor() {
        this.type = 'Cube';
        this.color = [1.0, 0.0, 1.0, 1.0];
        this.shaderInfo; // 6 sides, 2 tris per, 3 verts + 3 tex verts per, 
        this.texColorWeight = 0.5;
        this.matrix = new Matrix4();
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

    generateCube(frontBLTR, backBLTR, leftBLTR, rightBLTR, topBLTR, bottomBLTR) {

        this.shaderInfo = new Float32Array([
            // front
            0.5, -0.5, -0.5, frontBLTR[3], frontBLTR[0],
            0.5, 0.5, -0.5, frontBLTR[3], frontBLTR[2],
            -0.5, -0.5, -0.5, frontBLTR[1], frontBLTR[0],
            0.5, 0.5, -0.5, frontBLTR[3], frontBLTR[2],
            -0.5, 0.5, -0.5, frontBLTR[1], frontBLTR[2],
            -0.5, -0.5, -0.5, frontBLTR[1], frontBLTR[0],

            // back
            0.5, -0.5, 0.5, backBLTR[3], backBLTR[0],
            0.5, 0.5, 0.5, backBLTR[3], backBLTR[2],
            -0.5, -0.5, 0.5, backBLTR[1], backBLTR[0],
            0.5, 0.5, 0.5, backBLTR[3], backBLTR[2],
            -0.5, 0.5, 0.5, backBLTR[1], backBLTR[2],
            -0.5, -0.5, 0.5, backBLTR[1], backBLTR[0],

            // top
            -0.5, 0.5, -0.5, topBLTR[1], topBLTR[0],
            0.5, 0.5, 0.5, topBLTR[3], topBLTR[2],
            -0.5, 0.5, 0.5, topBLTR[1], topBLTR[2],
            -0.5, 0.5, -0.5, topBLTR[1], topBLTR[0],
            0.5, 0.5, 0.5, topBLTR[3], topBLTR[2],
            0.5, 0.5, -0.5, topBLTR[3], topBLTR[0],

            // bottom
            -0.5, -0.5, -0.5, bottomBLTR[1], bottomBLTR[0],
            0.5, -0.5, 0.5, bottomBLTR[3], bottomBLTR[2],
            -0.5, -0.5, 0.5, bottomBLTR[1], bottomBLTR[2],
            -0.5, -0.5, -0.5, bottomBLTR[1], bottomBLTR[0],
            0.5, -0.5, 0.5, bottomBLTR[3], bottomBLTR[2],
            0.5, -0.5, -0.5, bottomBLTR[3], bottomBLTR[0],

            // right
            // 0.5, -0.5, -0.5, rightBLTR[0], rightBLTR[1],
            // 0.5, 0.5, 0.5, rightBLTR[2], rightBLTR[3],
            // 0.5, -0.5, 0.5, rightBLTR[2], rightBLTR[1],
            // 0.5, -0.5, -0.5, rightBLTR[0], rightBLTR[1],
            // 0.5, 0.5, 0.5, rightBLTR[2], rightBLTR[3],
            // 0.5, 0.5, -0.5, rightBLTR[0], rightBLTR[3],
            0.5, 0.5, -0.5, rightBLTR[3], rightBLTR[0],
            0.5, 0.5, 0.5, rightBLTR[3], rightBLTR[2],
            0.5, -0.5, -0.5, rightBLTR[1], rightBLTR[0],
            0.5, 0.5, 0.5, rightBLTR[3], rightBLTR[2],
            0.5, -0.5, 0.5, rightBLTR[1], rightBLTR[2],
            0.5, -0.5, -0.5, rightBLTR[1], rightBLTR[0],

            // left
            // -0.5, -0.5, -0.5, leftBLTR[0], leftBLTR[1],
            // -0.5, 0.5, 0.5, leftBLTR[2], leftBLTR[3],
            // -0.5, -0.5, 0.5, leftBLTR[2], leftBLTR[1], 
            // -0.5, -0.5, -0.5, leftBLTR[0], leftBLTR[1],
            // -0.5, 0.5, 0.5, leftBLTR[2], leftBLTR[3],
            // -0.5, 0.5, -0.5, leftBLTR[0], leftBLTR[3],
            -0.5, 0.5, -0.5, leftBLTR[3], leftBLTR[0],
            -0.5, 0.5, 0.5, leftBLTR[3], leftBLTR[2],
            -0.5, -0.5, -0.5, leftBLTR[1], leftBLTR[0],
            -0.5, 0.5, 0.5, leftBLTR[3], leftBLTR[2],
            -0.5, -0.5, 0.5, leftBLTR[1], leftBLTR[2],
            -0.5, -0.5, -0.5, leftBLTR[1], leftBLTR[0],
        ])
    }

    render() {
        var rgba = this.color;

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform1f(u_texColorWeight, this.texColorWeight);

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);


        // create a buffer object target
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);

        // write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, this.shaderInfo, gl.DYNAMIC_DRAW);

        // Assing the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);

        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(a_TexCoord);

        gl.drawArrays(gl.TRIANGLES, 0, 6 * 3 * 2);


    }
}


// function drawCube(M, color = [1, 1, 1, 1]) {
//     var cube = new Cube();
//     cube.color = color;
//     cube.matrix = M;
//     cube.render();
// }

