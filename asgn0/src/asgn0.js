const SCALE = 20;
let canvas;
let ctx;

// DrawRectangle.js
function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('example'); // id must match with canvas id
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    // Get the rendering context for 2D CG
    ctx = canvas.getContext('2d'); // because supports 2d or 3d must get a context that has methods for which


    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
    // Sets color
    ctx.strokeStyle = color;
    // Generate path from 0,0 to v
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.lineTo(canvas.width / 2 + v.elements[0] * SCALE, canvas.height / 2 + -v.elements[1] * SCALE); // need flip y axis
    // Actually put on screen
    ctx.stroke();

    let v1 = new Vector3([2.25, 2.25, 0]);
}

function handleDrawEvent() {
    // clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // read vals of text boxes into v1
    let v1 = new Vector3([document.getElementById('v1_x').value, document.getElementById('v1_y').value, 0]);

    // draw the vector
    drawVector(v1, "red");

    // read vals of text boxes into v2
    let v2 = new Vector3([document.getElementById('v2_x').value, document.getElementById('v2_y').value, 0]);

    // draw the vector
    drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
    // clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // read vals of text boxes into v1
    let v1 = new Vector3([document.getElementById('v1_x').value, document.getElementById('v1_y').value, 0]);

    // draw the vector
    drawVector(v1, "red");

    // read vals of text boxes into v2
    let v2 = new Vector3([document.getElementById('v2_x').value, document.getElementById('v2_y').value, 0]);

    // draw the vector
    drawVector(v2, "blue");

    let v3 = new Vector3([0, 0, 0]);
    v3.set(v1);
    let v4 = new Vector3([0, 0, 0]);
    v4.set(v2);
    let s = document.getElementById('scalar').value;

    switch (document.getElementById("opSelection").value) {
        case "add":
            v3.add(v2);
            drawVector(v3, "green");
            break;
        case "sub":
            v3.sub(v2);
            drawVector(v3, "green");
            break;
        case "mul":
            v3.mul(s);
            drawVector(v3, "green");
            v4.mul(s);
            drawVector(v4, "green");
            break;
        case "div":
            v3.div(s);
            drawVector(v3, "green");
            v4.div(s);
            drawVector(v4, "green");
            break;
        case "mag":
            console.log("Magnitude v1:", v1.magnitude());
            console.log("Magnitude v2:", v2.magnitude());
            break;
        case "norm":
            v3.normalize();
            drawVector(v3, "green");
            v4.normalize();
            drawVector(v4, "green");
            break;
        case "ang":
            console.log("Angle:", Math.acos(Vector3.dot(v1, v2) / (v1.magnitude() * v2.magnitude())) * 180 / Math.PI);
            break;
        case "area":
            console.log("Area of the triangle:", Vector3.cross(v1, v2).magnitude() / 2);
            break;

    }
}
