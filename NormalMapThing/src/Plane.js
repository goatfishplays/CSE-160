class Plane {
    static buffer;

    constructor() {
        this.type = 'Plane';
        this.color = [1.0, 0.0, 1.0, 1.0];
        this.shaderInfo;
        this.matrix = new Matrix4();
        this.lit = true;
        // this.matrix.rotate(45, 1, 0, 0)

        // create a buffer object
        if (!Plane.buffer) {
            Plane.buffer = gl.createBuffer()
            if (!Plane.buffer) {
                console.log("Failed to create the buffer object");
                return -1;
            }
        }
        this.generateVerts();

    }

    generateVerts() {

        this.shaderInfo = new Float32Array([

            // position      uv      normal      tangent     bitangent
            -0.5, 0, -0.5, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
            0.5, 0, 0.5, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1,
            -0.5, 0, 0.5, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1,

            -0.5, 0, -0.5, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
            0.5, 0, 0.5, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1,
            0.5, 0, -0.5, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,

        ]);
    }

    render() {
        gl.useProgram(defaultProgram);

        var rgba = this.color;
        gl.uniform1f(u_NormVis, normVis);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        let normMat = new Matrix4(u_ModelMatrix);
        normMat.invert();
        normMat.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normMat.elements);
        gl.uniform1f(u_Lit, this.lit ? 0.0 : 1.0);

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);


        // create a buffer object target
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);

        // write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, this.shaderInfo, gl.DYNAMIC_DRAW);

        // // Assing the buffer object to a_Position variable
        // gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
        // // Enable the assignment to a_Position variable
        // gl.enableVertexAttribArray(a_Position);

        // // gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        // // gl.enableVertexAttribArray(a_TexCoord);

        // gl.vertexAttribPointer(a_NormalMapCoord, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        // gl.enableVertexAttribArray(a_NormalMapCoord);

        const stride = 14 * Float32Array.BYTES_PER_ELEMENT;

        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.vertexAttribPointer(a_NormalMapCoord, 2, gl.FLOAT, false, stride, 3 * 4);
        gl.enableVertexAttribArray(a_NormalMapCoord);

        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, stride, 5 * 4);
        gl.enableVertexAttribArray(a_Normal);

        gl.vertexAttribPointer(a_Tangent, 3, gl.FLOAT, false, stride, 8 * 4);
        gl.enableVertexAttribArray(a_Tangent);

        gl.vertexAttribPointer(a_Bitangent, 3, gl.FLOAT, false, stride, 11 * 4);
        gl.enableVertexAttribArray(a_Bitangent);

        gl.drawArrays(gl.TRIANGLES, 0, 3 * 2);


    }
}


