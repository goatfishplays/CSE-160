
class Point {
    constructor() {
        this.type = 'point';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 20.0;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;

        // turn off buffer to send attribute to prevent triangle from being mean to point
        gl.disableVertexAttribArray(a_Position);

        // use buffer to store point info
        // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([xy[0], xy[1]]), gl.DYNAMIC_DRAW)
        // Pass the position of a point to a_Position variable
        gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);

        // Pass size of point to u_Size var
        gl.uniform1f(u_Size, size)

        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Draw
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}