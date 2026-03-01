class Model {

    constructor(filePath) {
        this.type = 'Model';
        this.color = [0.0, 1.0, 1.0, 1.0];
        this.shaderInfo;
        this.matrix = new Matrix4();
        this.lit = true;
        this.loaded = false;
        this.buffer;


        this.getFileContent(filePath).then(() => {
            this.vertexBuffer = gl.createBuffer();
            this.normalBuffer = gl.createBuffer();

            if (!this.vertexBuffer || !this.normalBuffer) {
                console.log("Failed to create buffers for", this.filePath);
                return;
            }
        }
        );

    }
    async getFileContent(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Couldn't load file "${filePath}"`);

            const fileContent = await response.text();
            this.getModel(fileContent);
        } catch (e) {
            throw new Error(`Something went wrong when loading ${filePath}. Error: ${e}`);
        }
    }

    async getModel(fileContent) {
        const lines = fileContent.split("\n");
        const allVertices = [];
        const allNormals = [];

        const unpackedVerts = [];
        const unpackedNormals = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const tokens = line.split(" ");

            if (tokens[0] == 'v') {
                allVertices.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
            }
            else if (tokens[0] == 'vn') {
                allNormals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
            }
            else if (tokens[0] == 'f') {
                for (const face of [tokens[1], tokens[2], tokens[3]]) {
                    const indices = face.split("//");
                    const vertexIndex = (parseInt(indices[0]) - 1) * 3;
                    const normalIndex = (parseInt(indices[1]) - 1) * 3;

                    unpackedVerts.push(
                        allVertices[vertexIndex],
                        allVertices[vertexIndex + 1],
                        allVertices[vertexIndex + 2],
                    );

                    unpackedNormals.push(
                        allNormals[normalIndex],
                        allNormals[normalIndex + 1],
                        allNormals[normalIndex + 2],
                    );
                }
            }
        }

        this.shaderInfo = {
            verts: new Float32Array(unpackedVerts),
            normals: new Float32Array(unpackedNormals)
        };
        this.loaded = true;
    }

    render() {
        if (!this.loaded) return;

        gl.useProgram(defaultProgram);

        var rgba = this.color;
        gl.uniform1f(u_NormVis, normVis);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        let normMat = new Matrix4(u_ModelMatrix);
        normMat.invert();
        normMat.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, this.matrix.elements);
        gl.uniform1f(u_texColorWeight, 0.0);
        gl.uniform1f(u_Lit, this.lit ? 0.0 : 1.0);

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);


        // create a buffer object target
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        // write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, this.shaderInfo.verts, gl.DYNAMIC_DRAW);

        // Assing the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);
        // Assing the buffer object to a_Position variable
        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_TexCoord);

        // create a buffer object target
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);

        // write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, this.shaderInfo.normals, gl.DYNAMIC_DRAW);

        // Assing the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        // Enable the assignment to a_Position variable 
        gl.enableVertexAttribArray(a_Normal);


        gl.drawArrays(gl.TRIANGLES, 0, this.shaderInfo.verts.length / 3);


    }
}