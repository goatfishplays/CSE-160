class Sphere {

    static buffer;
    // static program;
    // static a_Position;
    // static u_ModelMatrix;
    // static u_ViewMatrix;
    // static u_ProjectionMatrix;
    // static u_NormVis;


    constructor(n_vert = 10, n_ring = 10) {
        this.type = 'Sphere';
        this.color = [1.0, 0.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.shaderInfo;
        // this.matrix.rotate(45, 1, 0, 0)

        // if (!Sphere.program) {
        //     this.generateProgram();
        // }

        this.generateShaderInfo(n_vert, n_ring);

        // create a buffer object
        if (!Sphere.buffer) {
            Sphere.buffer = gl.createBuffer()
            if (!Sphere.buffer) {
                console.log("Failed to create the buffer object");
                return -1;
            }
        }

    }

    // generateProgram() {
    //     let vertexShader = `
    //         attribute vec3 a_Position;
    //         varying vec3 v_Normal;

    //         uniform mat4 u_ModelMatrix; 

    //         uniform mat4 u_ProjectionMatrix;
    //         uniform mat4 u_ViewMatrix;

    //         void main() {
    //             gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(a_Position, 1.0);

    //             v_Normal = a_Position/2.0 + 0.5;
    //         }
    //     `;
    //     let fragmentShader = `
    //         precision mediump float;
    //         uniform vec4 u_FragColor; 

    //         uniform float u_NormVis;
    //         varying vec3 v_Normal;
    //         void main() {
    //             gl_FragColor = (1.0 - u_NormVis) * (u_FragColor)
    //                         +(u_NormVis) *  vec4(v_Normal, 1.0); 
    //         }
    //     `;

    //     Sphere.program = createProgram(gl, vertexShader, fragmentShader);
    //     if (!Sphere.program) console.error("Could not compile shaders for ", this);

    //     Sphere.a_Position = gl.getAttribLocation(Sphere.program, "a_Position");
    //     Sphere.u_ModelMatrix = gl.getUniformLocation(Sphere.program, "u_ModelMatrix");
    //     Sphere.u_ViewMatrix = gl.getUniformLocation(Sphere.program, "u_ViewMatrix");
    //     Sphere.u_ProjectionMatrix = gl.getUniformLocation(Sphere.program, "u_ProjectionMatrix");
    //     Sphere.u_NormVis = gl.getUniformLocation(Sphere.program, 'u_NormVis');
    // }

    generateShaderInfo(n_vert, n_ring) {
        if (n_vert < 3) {
            console.log("Cannot make a sphere with less than 3 vertical");
        }
        if (n_ring < 3) {
            console.log("Cannot make a sphere with less than 3 ring");
        }

        let verts = []
        for (let i = 0; i < n_vert; i++) {
            let vertPos = -1 + 2 * i / (n_vert - 1);
            let subRad = Math.sqrt(1 - vertPos * vertPos);
            let layer = []
            for (let j = 0; j < n_ring; j++) {
                // let ang = 2 * Math.PI / 180 * j / n_ring;
                let ang = 2 * Math.PI * j / n_ring;
                layer.push([subRad * Math.sin(ang), vertPos, subRad * Math.cos(ang)]);
            }
            verts.push(layer);
        }

        let vertForDraw = [];
        for (let i = 0; i < n_vert - 1; i++) {
            for (let j = 0; j < n_ring - 1; j++) {
                vertForDraw.push(...verts[i][j], 0, 0, ...verts[i][j]);
                vertForDraw.push(...verts[i + 1][j + 1], 0, 0, ...verts[i + 1][j + 1]);
                vertForDraw.push(...verts[i + 1][j], 0, 0, ...verts[i + 1][j]);

                vertForDraw.push(...verts[i][j], 0, 0, ...verts[i][j]);
                vertForDraw.push(...verts[i][j + 1], 0, 0, ...verts[i][j + 1]);
                vertForDraw.push(...verts[i + 1][j + 1], 0, 0, ...verts[i + 1][j + 1]);
            }
            vertForDraw.push(...verts[i][n_ring - 1], 0, 0, ...verts[i][n_ring - 1]);
            vertForDraw.push(...verts[i + 1][0], 0, 0, ...verts[i + 1][0]);
            vertForDraw.push(...verts[i + 1][n_ring - 1], 0, 0, ...verts[i + 1][n_ring - 1]);

            vertForDraw.push(...verts[i][n_ring - 1], 0, 0, ...verts[i][n_ring - 1]);
            vertForDraw.push(...verts[i][0], 0, 0, ...verts[i][0]);
            vertForDraw.push(...verts[i + 1][0], 0, 0, ...verts[i + 1][0]);
        }

        console.log(vertForDraw);

        this.shaderInfo = new Float32Array(
            vertForDraw
        )
    }

    render() {
        var rgba = this.color;

        gl.useProgram(defaultProgram);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform1f(u_NormVis, normVis);

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniform1f(u_Lit, 0.0);
        gl.uniform1f(u_texColorWeight, 0.0);

        // create a buffer object target
        gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.buffer);

        // write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, this.shaderInfo, gl.DYNAMIC_DRAW);

        // Assing the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);

        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(a_TexCoord);

        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(a_Normal);

        gl.drawArrays(gl.TRIANGLES, 0, this.shaderInfo.length / 8);


    }
}


// function drawCube(M, color = [1, 1, 1, 1]) {
//     var cube = new Cube();
//     cube.color = color;
//     cube.matrix = M;
//     cube.render();
// }

