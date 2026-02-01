// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }
    `;

// Fragment shader program
var FSHADER_SOURCE =
  `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
    `;



// Global Variables
let canvas;
let gl;
let a_Position;
let u_ModelMatrix;
let uGlobalRotation;
let u_FragColor;

// State Globals
var g_globalAngleY = 0;
var g_globalAngleX = 0;
var g_t1_on = true;
var g_t2_on = true;
var g_t3_on = true;
var g_t1_rot = 0;
var g_t2_rot = 0;
var g_t3_rot = 0;
var g_tL1_rot = 0;
var g_tL2_rot = 0;
var g_tL3_rot = 0;
var g_tR1_rot = 0;
var g_tR2_rot = 0;
var g_tR3_rot = 0;

var g_head_rot = 0;
var g_body_rot = 0;
var g_FL0_rot = 0;
var g_FL1_rot = 0;
var g_FL2_rot = 0;
var g_FR0_rot = 0;
var g_FR1_rot = 0;
var g_FR2_rot = 0;
var g_BL0_rot = 0;
var g_BL1_rot = 0;
var g_BL2_rot = 0;
var g_BR0_rot = 0;
var g_BR1_rot = 0;
var g_BR2_rot = 0;

var g_M0_rot = 0;
var g_M1_rot = 0;
var g_M2_rot = 0;
var g_L0_rot = 0;
var g_L1_rot = 0;
var g_L2_rot = 0;
var g_R0_rot = 0;
var g_R1_rot = 0;
var g_R2_rot = 0;


var g_taur_z = 0;
var g_taur_y = 0;
var g_taur_scale = 1;

var g_pb_rot = 0;
var g_pb_rot_other = 0;
var g_pb_open = 0;
var g_pb_x = 0;
var g_pb_y = 0;
var g_pb_z = 0;

var g_animationOn = true;

var g_capturing = false;

// Colors
const CAPTURE_COLOR = [0.8, 0.2, 0.2, 1.0];

let MAIN_BODY_COLOR = () => g_capturing ? CAPTURE_COLOR : [0.8, 0.6, 0.3, 1.0]
let ACCENT_BODY_COLOR = () => g_capturing ? CAPTURE_COLOR : [0.42, 0.375, 0.35, 1.0]
let HORN_COLOR = () => g_capturing ? CAPTURE_COLOR : [0.6, 0.65, 0.75, 1.0]
let HOOVE_COLOR = () => g_capturing ? CAPTURE_COLOR : [0.35, 0.4, 0.5, 1.0]
let EYE_COLOR = () => g_capturing ? CAPTURE_COLOR : [1, 1, 1, 1.0]
let PUPIL_COLOR = () => g_capturing ? CAPTURE_COLOR : [0, 0, 0, 1]


// shift click vars
let g_extraAnimating = false;
let g_extraStartTime = 0;

let g_cap_y = 0;
let g_cap_z = -4;
let g_cap_s_y = 0;
let g_cap_s_z = 0;
let g_cap_rot = 90;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST); // Tells open GL that depth will control what is in front
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

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  uGlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  if (!uGlobalRotation) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

}

function addActionsForHtmlUI() {
  // Button Events
  document.getElementById("animationOnButton").onclick = function () { g_animationOn = true; };
  document.getElementById("animationOffButton").onclick = function () { g_animationOn = false; };
  // document.getElementById("circlesButton").onclick = function () { g_selectedShape = CIRCLE };


  // Color Slider Events
  document.getElementById("cameraAngleSlider").addEventListener('mousemove', function () { g_globalAngleY = this.value; renderScene(); });

  document.getElementById("tail1Slider").addEventListener('mousemove', function () { g_t1_rot = -this.value; renderScene(); });
  document.getElementById("t1OnButton").onclick = function () { g_t1_on = true; };
  document.getElementById("t1OffButton").onclick = function () { g_t1_on = false; };

  document.getElementById("tail2Slider").addEventListener('mousemove', function () { g_t2_rot = -this.value; renderScene(); });
  document.getElementById("t2OnButton").onclick = function () { g_t2_on = true; };
  document.getElementById("t2OffButton").onclick = function () { g_t2_on = false; };

  document.getElementById("tail3Slider").addEventListener('mousemove', function () { g_t3_rot = -this.value; renderScene(); });
  document.getElementById("t3OnButton").onclick = function () { g_t3_on = true; };
  document.getElementById("t3OffButton").onclick = function () { g_t3_on = false; };
}

function main() {
  addActionsForHtmlUI();

  setupWebGL();
  canvas.onmousemove = (ev) => { handleClicks(ev) };
  canvas.onmousedown = (ev) => {
    if (ev.shiftKey && !g_extraAnimating) {
      g_extraAnimating = true;
      g_extraStartTime = performance.now();
      extraStage_i = 0;
    }
  };

  connectVariablesToGLSL();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // renderAllShapes();
  requestAnimationFrame(tick);
}

// // Extract the event click and return it to WebGL coordinates
function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return ([x, y]);
}

var last_x = 0;
var last_y = 0;
function handleClicks(ev) {
  let [x, y] = convertCoordinatesEventToGL(ev);
  if (ev.buttons == 1) {
    g_globalAngleX += (y - last_y) * 100;
    g_globalAngleY -= (x - last_x) * 100;
  }
  last_y = y;
  last_x = x;

}

// Draw every shape that is supposed to be in the canvas
function renderScene() {

  // Pass tyhe matrix to u_ModelMatrix attribute
  var globalRotMat = new Matrix4();
  globalRotMat.rotate(parseInt(g_globalAngleY) + 45, 0, 1, 0);
  globalRotMat.rotate(parseInt(g_globalAngleX), 1, 0, 0);
  // console.log(45 + g_globalAngle);
  gl.uniformMatrix4fv(uGlobalRotation, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // // Test draw triangle
  // drawTriangle3D([
  //   -1.0, 0.0, 0.0,
  //   -0.5, -1.0, 0.0,
  //   0.0, 0.0, 0.0,
  // ]);

  // Draw cube
  // var M = new Matrix4();
  // M.translate(-0.5, -0.5, -0.5);
  // M.scale(0.5, 0.5, 0.5);
  // drawCube(M);

  // var body = new Cube();
  // body.color = [1.0, 0.0, 0.0, 1.0];
  // body.matrix.translate(-.5, -0.5, 0.0);
  // body.matrix.scale(.5, 1, .5); // NOTE: WILL RIGHT MUTLIPLY TO MAINTAIN A STATE, AKA WHEN MULTIPLY WITH VECTOR LATER FUNCS APPLY FIRST
  // body.render();

  // // Draw cube
  // var leftArm = new Cube();
  // leftArm.color = [1.0, 1.0, 0.0, 1.0];
  // leftArm.matrix.translate(0.1, -.5, 0.0);
  // leftArm.matrix.rotate(-45, 0, 0, 1);
  // leftArm.matrix.rotate(g_yellowAngle, 0, 0, 1);
  // var yellowCoordinates = new Matrix4(leftArm.matrix); // usually want get pre-some transforms because squished space weirdness
  // leftArm.matrix.scale(.25, 0.4, 0.25);
  // leftArm.matrix.translate(0.3, 0.0, 0.0);
  // leftArm.render();



  // // updateAnimationAngles()
  // // console.log(g_orangle)

  // var leftFore = new Cube();
  // leftFore.color = [1.0, 0.5, 0.0, 1.0];
  // leftFore.matrix = yellowCoordinates;
  // leftFore.matrix.translate(0.0, 0.4, 0.0);
  // leftFore.matrix.rotate(15 + g_orangle, 0, 0, 1);
  // leftFore.matrix.scale(.25, 0.7, 0.5);
  // leftFore.render();

  // TAUROS
  // Main body
  let allO = new Matrix4();
  allO.scale(0.18, 0.18, 0.18);
  allO.translate(0, 0, -0.5);

  let bodyOrigin = new Matrix4(allO);
  bodyOrigin.translate(0, g_taur_y, g_taur_z);
  bodyOrigin.scale(g_taur_scale, g_taur_scale, g_taur_scale);
  bodyOrigin.rotate(g_body_rot, 0, 0, 1);
  let bodyM = new Matrix4(bodyOrigin);
  bodyM.scale(1.75, 2.33, 2.67);
  bodyM.rotate(4, 1, 0, 0);
  drawCube(bodyM, MAIN_BODY_COLOR());

  let backM = new Matrix4(bodyOrigin);
  backM.translate(0, 0, 1.5);
  backM.scale(1.5, 2, 3);
  drawCube(backM, MAIN_BODY_COLOR());

  let maneM = new Matrix4(bodyOrigin);
  maneM.translate(0, 0, -1.1);
  maneM.scale(2, 2.6, 0.8);
  drawCube(maneM, ACCENT_BODY_COLOR());

  let maneBottomM = new Matrix4(bodyOrigin);
  maneBottomM.translate(0, -1.2, -0.9);
  maneBottomM.scale(1.4, 0.6, 1);
  drawCube(maneBottomM, ACCENT_BODY_COLOR());

  // Head
  let headOrigin = new Matrix4(bodyOrigin);
  headOrigin.translate(0, 0.65, -1.6)
  headOrigin.rotate(g_head_rot, 1, 0, 0);

  let headM = new Matrix4(headOrigin);
  headM.translate(0, 0, -.4);
  headM.scale(0.9, 0.85, 1);
  drawCube(headM, MAIN_BODY_COLOR());

  let eyeL = new Matrix4(headOrigin);
  eyeL.translate(0.4, 0.1, -.7);
  eyeL.scale(0.15, 0.1, 0.2);
  drawCube(eyeL, EYE_COLOR());
  let pupilL = new Matrix4(headOrigin);
  pupilL.translate(0.4, 0.125, -.75);
  pupilL.scale(0.175, 0.05, 0.05);
  drawCube(pupilL, PUPIL_COLOR());

  let eyeR = new Matrix4(headOrigin);
  eyeR.translate(-0.4, 0.1, -.7);
  eyeR.scale(0.15, 0.1, 0.2);
  drawCube(eyeR, EYE_COLOR());
  let pupilR = new Matrix4(headOrigin);
  pupilR.translate(-0.4, 0.125, -.75);
  pupilR.scale(0.175, 0.05, 0.05);
  drawCube(pupilR, PUPIL_COLOR());

  let snoutM = new Matrix4(headOrigin);
  snoutM.translate(0, -0.1, -1);
  snoutM.scale(0.64, 0.55, 0.625);
  drawCube(snoutM, MAIN_BODY_COLOR());

  let noseM = new Matrix4(headOrigin);
  noseM.translate(0, -0.15, -1.2);
  noseM.scale(0.38, 0.3, 0.35);
  drawCube(noseM, ACCENT_BODY_COLOR());

  let hornLeft0M = new Matrix4(headOrigin);
  hornLeft0M.translate(0.4, 0.15, -0.2);
  hornLeft0M.scale(0.28, 0.28, 0.28);
  drawCube(hornLeft0M, HORN_COLOR());

  let hornLeft1M = new Matrix4(headOrigin);
  hornLeft1M.translate(0.7, 0.15, -0.2);
  hornLeft1M.scale(0.54, 0.2, 0.2);
  drawCube(hornLeft1M, HORN_COLOR());

  let hornLeft2M = new Matrix4(headOrigin);
  hornLeft2M.translate(1.05, .25, -0.2);
  hornLeft2M.rotate(45, 0, 0, 1);
  hornLeft2M.scale(0.45, 0.18, 0.18);
  drawCube(hornLeft2M, HORN_COLOR());

  let hornLeft3M = new Matrix4(headOrigin);
  hornLeft3M.translate(1.2, .55, -0.2);
  // hornLeft3M.rotate(15, 0, 0, 1);
  hornLeft3M.scale(0.18, 0.4, 0.18);
  drawPyramid(hornLeft3M, HORN_COLOR());


  let hornRight0M = new Matrix4(headOrigin);
  hornRight0M.translate(-0.4, 0.15, -0.2);
  hornRight0M.scale(0.28, 0.28, 0.28);
  drawCube(hornRight0M, HORN_COLOR());

  let hornRight1M = new Matrix4(headOrigin);
  hornRight1M.translate(-0.7, 0.15, -0.2);
  hornRight1M.scale(0.54, 0.2, 0.2);
  drawCube(hornRight1M, HORN_COLOR());

  let hornRight2M = new Matrix4(headOrigin);
  hornRight2M.translate(-1.05, .25, -0.2);
  hornRight2M.rotate(-45, 0, 0, 1);
  hornRight2M.scale(0.45, 0.18, 0.18);
  drawCube(hornRight2M, HORN_COLOR());

  let hornRight3M = new Matrix4(headOrigin);
  hornRight3M.translate(-1.2, .55, -0.2);
  // hornRight3M.rotate(15, 0, 0, 1);
  hornRight3M.scale(0.18, 0.4, 0.18);
  drawPyramid(hornRight3M, HORN_COLOR());

  let bump0M = new Matrix4(headOrigin);
  bump0M.translate(0, .45, -0.3);
  bump0M.scale(0.08, 0.02, 0.08);
  drawPyramid(bump0M, HORN_COLOR());

  let bump1M = new Matrix4(headOrigin);
  bump1M.translate(0, .45, -0.6);
  bump1M.scale(0.12, 0.02, 0.12);
  drawPyramid(bump1M, HORN_COLOR());

  let bump2M = new Matrix4(headOrigin);
  bump2M.translate(0, .3, -.91);
  bump2M.rotate(-90, 1, 0, 0)
  bump2M.scale(0.18, 0.02, 0.18);
  drawPyramid(bump2M, HORN_COLOR());


  // back left leg
  let legBL0O = new Matrix4(bodyOrigin);
  legBL0O.translate(0.8, -0.23, 2.7);
  legBL0O.rotate(g_BL0_rot, 1, 0, 0);

  let legBL0M = new Matrix4(legBL0O);
  legBL0M.scale(0.5, 1, 1.6);
  drawCube(legBL0M, MAIN_BODY_COLOR());

  let legBL1O = new Matrix4(legBL0O);
  legBL1O.translate(0, -0.3, -0.9);
  legBL1O.rotate(g_BL1_rot, 1, 0, 0);

  let legBL1M = new Matrix4(legBL1O);
  // legBL1M.translate(0, -0.1, -0.2);
  legBL1M.scale(0.37, 0.7, 1.5);
  drawCube(legBL1M, MAIN_BODY_COLOR())

  let legBL2O = new Matrix4(legBL1O);
  legBL2O.translate(0, 0., -0.8);
  legBL2O.rotate(g_BL2_rot, 1, 0, 0);

  let legBL2M = new Matrix4(legBL2O);
  legBL2M.translate(0, 0, -0.1);
  legBL2M.scale(0.19, 0.375, 1);
  drawCube(legBL2M, MAIN_BODY_COLOR())

  let legBL3M = new Matrix4(legBL2O);
  legBL3M.translate(0, 0, -0.7);
  legBL3M.scale(0.4, 0.5, 0.3);
  drawCube(legBL3M, HOOVE_COLOR())

  // Front left leg
  let legFL0O = new Matrix4(bodyOrigin);
  legFL0O.translate(0.8, -0.05, -0.2);
  legFL0O.rotate(g_FL0_rot, 1, 0, 0);

  let legFL0M = new Matrix4(legFL0O);
  legFL0M.scale(0.5, 1.1, 1.7);
  drawCube(legFL0M, MAIN_BODY_COLOR());

  let legFL1O = new Matrix4(legFL0O);
  legFL1O.translate(0, 0.1, -1);
  legFL1O.rotate(g_FL1_rot, 1, 0, 0);

  let legFL1M = new Matrix4(legFL1O);
  // legFL1M.translate(0, -0.1, -0.2);
  legFL1M.scale(0.35, 0.75, 1.3);
  drawCube(legFL1M, MAIN_BODY_COLOR())

  let legFL2O = new Matrix4(legFL1O);
  legFL2O.translate(0, -0.1, -0.8);
  legFL2O.rotate(g_FL2_rot, 1, 0, 0);

  let legFL2M = new Matrix4(legFL2O);
  legFL2M.translate(0, 0, -0.2);
  legFL2M.scale(0.18, 0.375, 1.33);
  drawCube(legFL2M, MAIN_BODY_COLOR())

  let legFL3M = new Matrix4(legFL2O);
  legFL3M.translate(0, 0, -0.8);
  legFL3M.scale(0.4, 0.5, 0.3);
  drawCube(legFL3M, HOOVE_COLOR())




  // back right leg
  let legBR0O = new Matrix4(bodyOrigin);
  legBR0O.translate(-0.8, -0.23, 2.7);
  legBR0O.rotate(g_BR0_rot, 1, 0, 0);

  let legBR0M = new Matrix4(legBR0O);
  legBR0M.scale(0.5, 1, 1.6);
  drawCube(legBR0M, MAIN_BODY_COLOR());

  let legBR1O = new Matrix4(legBR0O);
  legBR1O.translate(0, -0.3, -0.9);
  legBR1O.rotate(g_BR1_rot, 1, 0, 0);

  let legBR1M = new Matrix4(legBR1O);
  // legBR1M.translate(0, -0.1, -0.2);
  legBR1M.scale(0.37, 0.7, 1.5);
  drawCube(legBR1M, MAIN_BODY_COLOR())

  let legBR2O = new Matrix4(legBR1O);
  legBR2O.translate(0, 0., -0.8);
  legBR2O.rotate(g_BR2_rot, 1, 0, 0);

  let legBR2M = new Matrix4(legBR2O);
  legBR2M.translate(0, 0, -0.1);
  legBR2M.scale(0.19, 0.375, 1);
  drawCube(legBR2M, MAIN_BODY_COLOR())

  let legBR3M = new Matrix4(legBR2O);
  legBR3M.translate(0, 0, -0.7);
  legBR3M.scale(0.4, 0.5, 0.3);
  drawCube(legBR3M, HOOVE_COLOR())


  // Front right leg
  let legFR0O = new Matrix4(bodyOrigin);
  legFR0O.translate(-0.8, -0.05, -0.2);
  legFR0O.rotate(g_FR0_rot, 1, 0, 0);

  let legFR0M = new Matrix4(legFR0O);
  legFR0M.scale(0.5, 1.1, 1.7);
  drawCube(legFR0M, MAIN_BODY_COLOR());

  let legFR1O = new Matrix4(legFR0O);
  legFR1O.translate(0, 0.1, -1);
  legFR1O.rotate(g_FR1_rot, 1, 0, 0);

  let legFR1M = new Matrix4(legFR1O);
  // legFR1M.translate(0, -0.1, -0.2);
  legFR1M.scale(0.35, 0.75, 1.3);
  drawCube(legFR1M, MAIN_BODY_COLOR())

  let legFR2O = new Matrix4(legFR1O);
  legFR2O.translate(0, -0.1, -0.8);
  legFR2O.rotate(g_FR2_rot, 1, 0, 0);

  let legFR2M = new Matrix4(legFR2O);
  legFR2M.translate(0, 0, -0.2);
  legFR2M.scale(0.18, 0.375, 1.33);
  drawCube(legFR2M, MAIN_BODY_COLOR())

  let legFR3M = new Matrix4(legFR2O);
  legFR3M.translate(0, 0, -0.8);
  legFR3M.scale(0.4, 0.5, 0.3);
  drawCube(legFR3M, HOOVE_COLOR())

  // tails
  let tailOrigin = new Matrix4(bodyOrigin);
  tailOrigin.translate(0, 0.5, 2.7);

  // tail middle
  let tailM0O = new Matrix4(tailOrigin);
  tailM0O.translate(0, 0, 0.3);
  tailM0O.rotate(g_t1_rot, 1, 0, 0);
  let tailM0M = new Matrix4(tailM0O);
  tailM0M.translate(0, 0, 0.5);
  tailM0M.scale(0.1, 0.1, 1);
  drawCube(tailM0M, ACCENT_BODY_COLOR());

  let tailM1O = new Matrix4(tailM0O);
  tailM1O.translate(0, 0, 0.95);
  tailM1O.rotate(g_t2_rot, 1, 0, 0);
  let tailM1M = new Matrix4(tailM1O);
  tailM1M.translate(0, 0, 0.5);
  tailM1M.scale(0.1, 0.1, 1);
  drawCube(tailM1M, ACCENT_BODY_COLOR());

  let tailM2O = new Matrix4(tailM1O);
  tailM2O.translate(0, 0, 0.95);
  tailM2O.rotate(g_t3_rot, 1, 0, 0);
  let tailM2M = new Matrix4(tailM2O);
  tailM2M.translate(0, 0, 0.5);
  tailM2M.scale(0.1, 0.1, 1);
  drawCube(tailM2M, ACCENT_BODY_COLOR());
  let tailM3M = new Matrix4(tailM2O);
  tailM3M.translate(0, 0, 1);
  tailM3M.scale(0.3, 0.3, .4);
  drawCube(tailM3M, HOOVE_COLOR());
  let tailM4M = new Matrix4(tailM2O);
  tailM4M.translate(0, 0, 1.3);
  tailM4M.scale(0.25, 0.25, .5);
  tailM4M.rotate(90, 1, 0, 0);
  drawPyramid(tailM4M, HOOVE_COLOR());

  // tail left
  let tailL0O = new Matrix4(tailOrigin);
  tailL0O.translate(0, 0, 0.3);
  tailL0O.rotate(-45, 0, 0, 1);
  tailL0O.rotate(g_tL1_rot, 1, 0, 0);
  let tailL0M = new Matrix4(tailL0O);
  tailL0M.translate(0, 0, 0.5);
  tailL0M.scale(0.1, 0.1, 1);
  drawCube(tailL0M, ACCENT_BODY_COLOR());

  let tailL1O = new Matrix4(tailL0O);
  tailL1O.translate(0, 0, 0.95);
  tailL1O.rotate(g_tL2_rot, 1, 0, 0);
  let tailL1M = new Matrix4(tailL1O);
  tailL1M.translate(0, 0, 0.5);
  tailL1M.scale(0.1, 0.1, 1);
  drawCube(tailL1M, ACCENT_BODY_COLOR());

  let tailL2O = new Matrix4(tailL1O);
  tailL2O.translate(0, 0, 0.95);
  tailL2O.rotate(g_tL3_rot, 1, 0, 0);
  let tailL2M = new Matrix4(tailL2O);
  tailL2M.translate(0, 0, 0.5);
  tailL2M.scale(0.1, 0.1, 1);
  drawCube(tailL2M, ACCENT_BODY_COLOR());
  let tailL3M = new Matrix4(tailL2O);
  tailL3M.translate(0, 0, 1);
  tailL3M.scale(0.3, 0.3, .4);
  drawCube(tailL3M, HOOVE_COLOR());
  let tailL4M = new Matrix4(tailL2O);
  tailL4M.translate(0, 0, 1.3);
  tailL4M.scale(0.25, 0.25, .5);
  tailL4M.rotate(90, 1, 0, 0);
  drawPyramid(tailL4M, HOOVE_COLOR());

  // tail right
  let tailR0O = new Matrix4(tailOrigin);
  tailR0O.translate(0, 0, 0.3);
  tailR0O.rotate(45, 0, 0, 1);
  tailR0O.rotate(g_tR1_rot, 1, 0, 0);
  let tailR0M = new Matrix4(tailR0O);
  tailR0M.translate(0, 0, 0.5);
  tailR0M.scale(0.1, 0.1, 1);
  drawCube(tailR0M, ACCENT_BODY_COLOR());

  let tailR1O = new Matrix4(tailR0O);
  tailR1O.translate(0, 0, 0.95);
  tailR1O.rotate(g_tR2_rot, 1, 0, 0);
  let tailR1M = new Matrix4(tailR1O);
  tailR1M.translate(0, 0, 0.5);
  tailR1M.scale(0.1, 0.1, 1);
  drawCube(tailR1M, ACCENT_BODY_COLOR());

  let tailR2O = new Matrix4(tailR1O);
  tailR2O.translate(0, 0, 0.95);
  tailR2O.rotate(g_tR3_rot, 1, 0, 0);
  let tailR2M = new Matrix4(tailR2O);
  tailR2M.translate(0, 0, 0.5);
  tailR2M.scale(0.1, 0.1, 1);
  drawCube(tailR2M, ACCENT_BODY_COLOR());
  let tailR3M = new Matrix4(tailR2O);
  tailR3M.translate(0, 0, 1);
  tailR3M.scale(0.3, 0.3, .4);
  drawCube(tailR3M, HOOVE_COLOR());
  let tailR4M = new Matrix4(tailR2O);
  tailR4M.translate(0, 0, 1.3);
  tailR4M.scale(0.25, 0.25, .5);
  tailR4M.rotate(90, 1, 0, 0);
  drawPyramid(tailR4M, HOOVE_COLOR());

  // pokeball
  let pbO = new Matrix4(allO);
  pbO.translate(g_pb_x, g_pb_y, g_pb_z);
  // pbO.rotate(180, 1, 0, 0);
  pbO.rotate(90, 0, 1, 0);
  pbO.rotate(g_pb_rot, 0, 0, 1);
  pbO.rotate(g_pb_rot_other, 1, 0, 0);

  let pbR = new Matrix4(pbO);
  pbR.translate(0, 0, 0);
  pbR.scale(0.4, 0.4, 0.4);
  drawCube(pbR, CAPTURE_COLOR);


  let pbTO = new Matrix4(pbO);
  pbTO.translate(.25, 0, 0);
  pbTO.rotate(g_pb_open, 0, 0, 1);


  let pbRM = new Matrix4(pbTO);
  pbRM.translate(-0.25, .125, 0);
  pbRM.scale(0.5, 0.25, 0.5);
  drawCube(pbRM, [0.2, 0.5, 0.2, 1]);
  let pbBM = new Matrix4(pbTO);
  pbBM.translate(-0.5, 0, 0);
  pbBM.scale(0.1, 0.2, 0.2);
  drawCube(pbBM, [0.3, 0.3, 0.3, 1]);

  let pbRT = new Matrix4(pbTO);
  pbRT.translate(-0.25, 0, 0);
  pbRT.scale(0.4, 0.3, 0.4);
  drawCube(pbRT, CAPTURE_COLOR);

  let pbWM = new Matrix4(pbO);
  pbWM.translate(0, -0.125, 0);
  pbWM.scale(0.5, 0.25, 0.5);
  drawCube(pbWM, [0.7, 0.7, 0.7, 1]);


  let pbCap = new Matrix4(allO);
  pbCap.translate(0, g_cap_y, g_cap_z);
  pbCap.rotate(g_cap_rot, 1, 0, 0);
  pbCap.scale(g_cap_s_z, g_cap_s_y, g_cap_s_z);
  drawPyramid(pbCap, CAPTURE_COLOR);
}


function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

var g_startTime = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 - g_startTime;

function tick() {
  // check the time at start of function
  var startTime = performance.now();
  // console.log("s:", performance.now());
  g_seconds = performance.now() / 1000.0 - g_startTime;

  updateAnimation();

  renderScene();

  // Check time at end of function and display
  var duration = performance.now() - startTime;
  // console.log("e:", performance.now());
  sendTextToHTML("ms: " + duration.toFixed(3) + " | fps: " + Math.floor(10000 / duration) / 10, "performance");
  sendTextToHTML(" Time: " + g_seconds.toPrecision(3), "time");

  requestAnimationFrame(tick);
}


let extraStage_i = 0;
let comp = 0;
let extraStage = [
  [150, () => {
    g_pb_x = 0;
    g_pb_y = 0;
    g_pb_z = -5;
    g_pb_rot = 0;
    console.log("piss");
  }],
  [700, () => {
    g_pb_z = -5 + 2.5 * comp;
    console.log("piss");
  }],
  [900, () => {
    console.log("piss");
    g_pb_z = -2.5 - 1 * comp;
    g_pb_y = 2 * comp;
  }],
  [1200, () => {
    console.log("piss");
    g_pb_open = -45 * comp;
    g_pb_z = -3.5
    g_pb_y = 2;
    g_pb_rot = 45;
    g_capturing = true;
  }],
  [2500, () => {
    console.log("piss");
    g_cap_rot = -60;
    g_cap_s_z = 1.2 - 1.2 * comp;
    g_cap_s_y = 5 - 5 * comp;
    g_cap_z = g_pb_z + 1.9 - 1.9 * comp;
    g_cap_y = g_pb_y - 1 + 1 * comp;

    g_taur_scale = 1 - 1 * comp;
    g_taur_z = g_pb_z * comp;
    g_taur_y = g_pb_y * comp;
  }],
  [2750, () => {
    console.log("piss");
    g_pb_open = -45 + 45 * comp;
    g_pb_rot = -45 + 45 * comp;
    g_pb_y = 2 - 4 * comp;
  }],
  [4000, () => {
    console.log("piss");
    g_pb_rot_other = 45 * Math.sin(comp * 8 * Math.PI);
  }],
  [5000, () => {
    console.log("piss");
  }],
  [6000, () => {
    console.log("piss");
    g_pb_rot_other = 45 * Math.sin(comp * 8 * Math.PI);
  }],
  [7000, () => {
    console.log("piss");
  }],
  [7500, () => {
    console.log("piss");
    g_pb_rot_other = 45 * Math.sin(comp * 4 * Math.PI);
  }],
  [8000, () => {
    console.log("piss");
    g_pb_open = -45 * comp;
    g_pb_rot = -30 * comp;
  }],
  [8500, () => {
    console.log("piss");
    g_cap_rot = 60;
    g_cap_s_z = 1.2 * comp;
    g_cap_s_y = -5 * comp;
    g_cap_z = g_pb_z + 1.9 * comp;
    g_cap_y = g_pb_y + 0.1 + 1.1 * comp;

    g_taur_scale = 1 * comp;
    g_taur_z = g_pb_z * (1 - comp);
    g_taur_y = g_pb_y * (1 - comp);
  }],
  [11000, () => {
    console.log("piss");
    console.log("piss"); 0
    g_cap_s_z = 0;
    g_cap_s_y = 0;
    g_cap_z = 0;
    g_cap_y = 0;
    g_capturing = false;
    g_pb_z = -3.5 + 14 * comp;
  }],
  [12000, () => {
    console.log("piss");
    g_extraAnimating = false
    g_pb_open = 0;
  }],


  [9999999999999, () => {
  }],
]

function updateAnimation() {
  var g_orangle = 45 * Math.sin(5 * g_seconds);
  var g_orangle2 = 45 * Math.sin(5 * (g_seconds + 0.2));

  // g_pb_rot = g_seconds * 720;

  if (g_extraAnimating) {
    let time = performance.now() - g_extraStartTime;
    if (extraStage_i > 0) {
      let t0 = extraStage[extraStage_i - 1][0];
      let t1 = extraStage[extraStage_i][0];
      comp = (Math.min(time, t1) - t0) / (t1 - t0);
    }
    console.log(time);
    extraStage[extraStage_i][1]();
    while (time > extraStage[extraStage_i][0]) {
      extraStage[extraStage_i][1]();
      extraStage_i += 1;
    }
  }

  if (!g_capturing) {
    // Draw cube
    if (g_animationOn) {

      g_body_rot = .25 * -g_orangle;
      g_head_rot = -45 + .6 * g_orangle / 2;

      g_BL0_rot = -90 + g_orangle2 / 1.5;
      g_BL1_rot = -45 + g_orangle2 / 1.2;
      g_BL2_rot = 25 - g_orangle2 / 1.5;
      g_FL0_rot = -90 - g_orangle2 / 2;
      g_FL1_rot = 15 - g_orangle2 / 2;
      g_FL2_rot = -15 - g_orangle2 / 3;

      g_BR0_rot = -90 + g_orangle / 1.5;
      g_BR1_rot = -45 + g_orangle / 1.2;
      g_BR2_rot = 25 - g_orangle / 1.5;
      g_FR0_rot = -90 - g_orangle / 2;
      g_FR1_rot = 15 - g_orangle / 2;
      g_FR2_rot = -15 - g_orangle / 3;


      g_tL1_rot = -35 + g_orangle;
      g_tL2_rot = -60 + g_orangle / 1.75;
      g_tL3_rot = 60 + -g_orangle / 1.25;

      g_tR1_rot = -35 + g_orangle;
      g_tR2_rot = -60 + g_orangle / 1.75;
      g_tR3_rot = 60 + -g_orangle / 1.25;
    }

    if (g_t1_on) {
      g_t1_rot = -35 + g_orangle;
    }

    if (g_t2_on) {
      g_t2_rot = -60 + g_orangle / 1.75;
    }

    if (g_t3_on) {
      g_t3_rot = 60 + -g_orangle / 1.25;
    }

    g_pb_rot = g_seconds * 720;
  }



}