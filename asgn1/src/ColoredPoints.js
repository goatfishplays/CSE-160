// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }
    `;

// Fragment shader program
var FSHADER_SOURCE =
  `precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;



const SQUARE = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

const DRAW = 0;
const PICTURE = 1;
const AWESOME = 2;

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

// UI Globals
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]
let g_selectedSize = 40.0;
let g_selectedShape = SQUARE;
let g_circleSegments = 50;
let g_mode = AWESOME;

const keys = {}

// State Globals
var g_shapesList = [];


function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }


}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_FragColor
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

function addActionsForHtmlUI() {
  // Button Events
  document.getElementById("drawMode").onclick = drawMode;
  document.getElementById("pictureMode").onclick = pictureMode;
  document.getElementById("awesomeMode").onclick = awesomeMode;

  document.getElementById("clearCanvas").onclick = function () { g_shapesList = []; renderAllShapes(g_shapesList); };

  document.getElementById("squaresButton").onclick = function () { g_selectedShape = SQUARE };
  document.getElementById("trianglesButton").onclick = function () { g_selectedShape = TRIANGLE };
  document.getElementById("circlesButton").onclick = function () { g_selectedShape = CIRCLE };


  // Color Slider Events
  document.getElementById("redSlider").addEventListener('mouseup', function () { g_selectedColor[0] = this.value / 255 });
  document.getElementById("greenSlider").addEventListener('mouseup', function () { g_selectedColor[1] = this.value / 255 });
  document.getElementById("blueSlider").addEventListener('mouseup', function () { g_selectedColor[2] = this.value / 255 });

  // Size Slider Events
  document.getElementById("sizeSlider").addEventListener('mouseup', function () { g_selectedSize = this.value });
  document.getElementById("circleSegSlider").addEventListener('mouseup', function () { g_circleSegments = this.value });
}

function main() {
  addActionsForHtmlUI();

  setupWebGL();

  connectVariablesToGLSL();


  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = handleClicks;
  canvas.onmousemove = (ev) => { if (ev.buttons == 1) handleClicks(ev) };

  window.addEventListener("keydown", e => {
    keys[e.key] = true;
  });

  window.addEventListener("keyup", e => {
    keys[e.key] = false;
  });


  switch (g_mode) {
    case DRAW:
      drawMode();
      break;
    case PICTURE:
      pictureMode();
      break;
    case AWESOME:
      awesomeMode();
      break;
  }
}

function handleClicks(ev) {
  if (g_mode == DRAW) {
    let [x, y] = convertCoordinatesEventToGL(ev);

    let shape;
    switch (g_selectedShape) {
      case SQUARE:
        shape = new Point()
        break;
      case TRIANGLE:
        shape = new Triangle()
        break;
      case CIRCLE:
        shape = new Circle()
        shape.segments = g_circleSegments;
        break;
    }
    shape.position = [x, y];
    shape.color = g_selectedColor.slice();
    shape.size = g_selectedSize;
    g_shapesList.push(shape);

    renderAllShapes(g_shapesList);
  }
}

// Extract the event click and return it to WebGL coordinates
function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return ([x, y]);
}

// Draw every shape that is supposed to be in the canvas
function renderAllShapes(shapes) {
  // check the time at start of function
  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = shapes.length;
  for (var i = 0; i < len; i++) {
    // console.log(shapes[i]);
    shapes[i].render();
  }

  // Check time at end of function and display
  var duration = performance.now() - startTime;
  sendTextToHTML("n_dots: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "performance")
}


function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function clearElems() {

  document.getElementById("draw").style.display = "none";
  document.getElementById("picture").style.display = "none";
  document.getElementById("awesome").style.display = "none";
}

function drawMode() {
  clearElems();
  document.getElementById("draw").style.display = "block";

  g_mode = DRAW;

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  renderAllShapes(g_shapesList);
}


function pictureMode() {
  clearElems();
  document.getElementById("picture").style.display = "block";

  g_mode = PICTURE;

  // Specify the color for clearing <canvas>
  gl.clearColor(0.5, 0.5, 0.75, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  let color1 = [0.2, 0.1, 0.05, 1.0];
  let color2 = [0.7, 0.5, 0.25, 1.0];
  let color3 = [0.2, 0.2, 0.75, 1.0];

  // Toes
  drawTriangleScaled(
    [
      4, 0,
      5, 0,
      4, 1,
    ],
    color1
  );
  drawTriangleScaled(
    [
      8, 0,
      9, 0,
      8, 1,
    ],
    color1
  );

  // Legs
  drawTriangleScaled(
    [
      3, 0,
      4, 0,
      4, 3
    ],
    color2
  );
  drawTriangleScaled(
    [
      3, 0,
      4, 3,
      3, 3,
    ],
    color2
  );
  drawTriangleScaled(
    [
      4, 2,
      5, 3,
      4, 3,
    ],
    color2
  );

  drawTriangleScaled(
    [
      7, 0,
      8, 0,
      8, 3
    ],
    color2
  );
  drawTriangleScaled(
    [
      7, 0,
      8, 3,
      7, 3,
    ],
    color2
  );
  drawTriangleScaled(
    [
      8, 2,
      9, 3,
      8, 3,
    ],
    color2
  );

  // body
  drawTriangleScaled(
    [
      9, 3,
      11, 7,
      9, 7,
    ],
    color2
  );
  drawTriangleScaled(
    [
      9, 7,
      7, 3,
      9, 3,
    ],
    color2
  );
  drawTriangleScaled(
    [
      7, 3,
      9, 7,
      7, 7,
    ],
    color2
  );
  drawTriangleScaled(
    [
      7, 3,
      7, 7,
      3, 7,
    ],
    color2
  );
  drawTriangleScaled(
    [
      5, 3,
      9, 7,
      5, 7,
    ],
    color2
  );
  drawTriangleScaled(
    [
      5, 3,
      5, 7,
      3, 3,
    ],
    color2
  );
  drawTriangleScaled(
    [
      3, 3,
      5, 7,
      3, 7,
    ],
    color2
  );
  drawTriangleScaled(
    [
      3, 3,
      3, 7,
      1, 7,
    ],
    color2
  );

  // top thing

  drawTriangleScaled(
    [
      0, 6,
      1, 6,
      1, 8,
    ],
    color3
  );
  drawTriangleScaled(
    [
      1, 8,
      9, 7,
      9, 8,
    ],
    color3
  );
  drawTriangleScaled(
    [
      1, 8,
      1, 7,
      9, 7,
    ],
    color3
  );
  drawTriangleScaled(
    [
      3, 7,
      4, 5,
      5, 7,
    ],
    color3
  );
  drawTriangleScaled(
    [
      7, 7,
      8, 5,
      9, 7,
    ],
    color3
  );

  // head
  drawTriangleScaled(
    [
      9, 7,
      11, 11,
      9, 11,
    ],
    color2
  );
  drawTriangleScaled(
    [
      9, 7,
      11, 7,
      10, 9,
    ],
    color2
  );
  drawTriangleScaled(
    [
      10, 9,
      12, 9,
      11, 11,
    ],
    color2
  );
  drawTriangleScaled(
    [
      9, 11,
      10, 11,
      9.5, 12,
    ],
    color2
  );

  drawTriangleScaled(
    [
      11, 9,
      12, 9,
      11.5, 10,
    ],
    color1
  );
  drawTriangleScaled(
    [
      10, 10,
      10.5, 10,
      10, 10.5,
    ],
    color1
  );
  drawTriangleScaled(
    [
      9.25, 11,
      9.75, 11,
      9.5, 11.5,
    ],
    color1
  );

  drawTriangleScaled(
    [
      9.5, 7,
      10, 7,
      10, 8,
    ],
    color1
  );

}



let lastTime;
let accumulator;
let heart;
let gameShapes;
const STEP = 1 / 30;
const RED = [1, 0, 0, 1];

function awesomeMode() {
  clearElems();
  document.getElementById("awesome").style.display = "block";

  g_mode = AWESOME;

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);


  gameShapes = [];
  heart = new Heart();
  heart.color = RED;

  gameShapes.push(heart);

  lastTime = performance.now();
  accumulator = 0;
  requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
  let delta = (now - lastTime) / 1000;
  lastTime = now;
  accumulator += delta;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
  }

  renderAllShapes(gameShapes);
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  for (let shape of gameShapes) {
    shape.update(dt);
  }
}