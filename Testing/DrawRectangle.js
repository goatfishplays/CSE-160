// DrawRectangle.js
function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('example'); // id must match with canvas id
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    // Get the rendering context for 2D CG
    var ctx = canvas.getContext('2d'); // because supports 2d or 3d must get a context that has methods for which

    // Draw a blue rectangle
    ctx.fillStyle = 'rgba(0, 0, 255, 1.0)';
    ctx.fillRect(120, 10, 150, 150);
}