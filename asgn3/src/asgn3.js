// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord; 
  uniform mat4 u_ModelMatrix; 
  // uniform mat4 u_GlobalRotation;
  
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_ViewMatrix;

  varying vec2 v_TexCoord;
  void main() {
    // gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotation * u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_TexCoord = a_TexCoord;
  }
    `;

// Fragment shader program
var FSHADER_SOURCE =
  ` 
  precision mediump float;
  uniform vec4 u_FragColor; 

  uniform sampler2D u_Sampler;
  varying vec2 v_TexCoord;
  uniform float u_texColorWeight;
  void main() {
    gl_FragColor = u_texColorWeight * texture2D(u_Sampler, v_TexCoord) + (1.0-u_texColorWeight) * u_FragColor;
  }
    `;


const MAP_WIDTH = 32;
const MAP_DEPTH = 32;
const MAP_HEIGHT = 64;

// Global Variables
let canvas;
let gl;
let camera;
let u_ProjectionMatrix;
let u_ViewMatrix;

let a_Position;
let u_ModelMatrix;
// let u_GlobalRotation;
let u_FragColor;

let u_Sampler;
let a_TexCoord;
let u_texColorWeight;


// State Globals 
var g_globalAngleY = 0;
var g_globalAngleX = 0;
let shapes = [];
const keys = {};

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

  // u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  // if (!u_GlobalRotation) {
  //   console.log('Failed to get the storage location of u_GlobalRotateMatrix');
  //   return;
  // }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }


  u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return;
  }
  a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (!a_TexCoord) {
    console.log('Failed to get the storage location of a_TexCoord');
    return;
  }
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  if (!u_texColorWeight) {
    console.log('Failed to get the storage location of u_texColorWeight');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

}

function addActionsForHtmlUI() {
  // Button Events
  // bleh
}

function main() {

  addActionsForHtmlUI();

  setupWebGL();


  camera = new Camera();


  canvas.onmousemove = (ev) => { handleMouseMove(ev) };
  // canvas.onmousedown = (ev) => {
  //   if (ev.shiftKey && !g_extraAnimating) {
  //     g_extraAnimating = true;
  //     g_extraStartTime = performance.now();
  //     extraStage_i = 0;
  //   }
  // }; 
  canvas.onmousedown = (ev) => {
    handleClick(ev);
  };
  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });


  window.addEventListener("keydown", e => {
    switch (e.key) {
      case 'q':
        if (!keys['q'])
          camera.panLeft();
        break;
      case 'e':
        if (!keys['e'])
          camera.panRight();
        break;
    }
    keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });


  connectVariablesToGLSL();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Load Textures 
  initTextures();
  // generate shapes and stuff
  initScene();


  // renderAllShapes();
  requestAnimationFrame(tick);
}


let cubeTypes = [null,]
let map = []
const wholeTexture = [
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],]
function initScene() {

  let cube0 = new Cube();
  cube0.texColorWeight = 1;
  cube0.generateCube(...wholeTexture);
  cubeTypes.push(cube0);

  let cube2 = new Cube();
  cube2.texColorWeight = 1;
  cube2.generateCube(
    [0.5, 0.5, 1, 1],
    [0.5, 0.5, 1, 1],
    [0.5, 0.5, 1, 1],
    [0.5, 0.5, 1, 1],
    [0, 0.5, 0.5, 1],
    [0.5, 0.5, 1, 1],
  );
  cubeTypes.push(cube2);

  let cube3 = new Cube();
  cube3.texColorWeight = 1;
  cube3.generateCube(
    [0, 0, 0.5, 0.5],
    [0, 0, 0.5, 0.5],
    [0, 0, 0.5, 0.5],
    [0, 0, 0.5, 0.5],
    [0, 0, 0.5, 0.5],
    [0, 0, 0.5, 0.5],
  );
  cubeTypes.push(cube3);

  let cube4 = new Cube();
  cube4.texColorWeight = 1;
  cube4.generateCube(
    [0.5, 0, 1, 0.5],
    [0.5, 0, 1, 0.5],
    [0.5, 0, 1, 0.5],
    [0.5, 0, 1, 0.5],
    [0.5, 0, 1, 0.5],
    [0.5, 0, 1, 0.5],
  );
  cubeTypes.push(cube4);

  for (let i = 0; i < MAP_WIDTH; i++) {
    map.push([]);
    for (let j = 0; j < MAP_DEPTH; j++) {
      map[i].push([])
      let buildingHeight = Math.random() > 0.7 ? Math.random() * 5 : 0;
      for (let k = 0; k < MAP_HEIGHT; k++) {
        // TODO YOU ARE HERE, MAKE YOUR GRID BETTER BY HAVING TRUE 3D GRID WITH IND = BLOCK TYPE
        map[i][j].push(k < buildingHeight ? 2 : 0);
        // map[i].push(Math.abs(i - j))
      }
    }
  }
  console.log(map);




  let ground = new Cube();
  ground.generateCube(...wholeTexture);
  ground.color = [0.375, 0.375, 0.375, 1.0];
  ground.texColorWeight = 0
  ground.matrix.translate(MAP_WIDTH / 2 - 0.5, -0.55, MAP_DEPTH / 2 - 0.5);
  ground.matrix.scale(MAP_WIDTH, 0.1, MAP_DEPTH);
  shapes.push(ground);

  let skyBox = new Cube();
  skyBox.generateCube(...wholeTexture);
  skyBox.color = [0.5, 0.5, 1, 1.0];
  skyBox.texColorWeight = 0
  skyBox.matrix.scale(1000, 1000, 1000);
  // skyBox.matrix.translate(0, 0, 0);
  shapes.push(skyBox);
}

function initTextures() {
  var texture = gl.createTexture();

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // // grab pointer to shader uniform var
  // const uTexture0 = gl.getUniformLocation(gl.program, "uTexture0");
  // if (uTexture0 < 0) {
  //   console.warn("Could not get uniform location");
  // }

  const img = new Image();

  img.onload = () => {
    console.log("loaded texture");
    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      img
    );
    gl.uniform1i(u_Sampler, 0);
  };
  img.crossOrigin = "anonymous";
  img.src = '../tiles.png';
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


function handleClick(ev) {
  // console.log(x, y, z);
  // if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT || z < 0 || z >= MAP_DEPTH) {
  //   console.log("Out of bounds");
  //   return;
  // }
  // console.log(x);
  if (ev.buttons == 1) {
    // console.log(getBlockLoc());
    let [x, y, z] = getBlockLoc(0);
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && z >= 0 && z < MAP_DEPTH) {
      if (map[x][z][y] == 4 || map[x][z][y] == 3) {
        map[x][z][y] = 0;
      }
    }
    [x, y, z] = getBlockLoc(1);
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && z >= 0 && z < MAP_DEPTH) {
      if (map[x][z][y] == 4 || map[x][z][y] == 3) {
        map[x][z][y] = 0;
      }
    }
    [x, y, z] = getBlockLoc(2);
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && z >= 0 && z < MAP_DEPTH) {
      if (map[x][z][y] == 4 || map[x][z][y] == 3) {
        map[x][z][y] = 0;
      }
    }
    [x, y, z] = getBlockLoc(3);
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && z >= 0 && z < MAP_DEPTH) {
      if (map[x][z][y] == 4 || map[x][z][y] == 3) {
        map[x][z][y] = 0;
      }
    }
  }
  if (ev.buttons == 2) {
    let [x, y, z] = getBlockLoc();
    // console.log(getBlockLoc());
    attemptPlaceBarrier(x, y, z);
    attemptPlaceBarrier(x + 1, y, z);
    attemptPlaceBarrier(x - 1, y, z);
    attemptPlaceBarrier(x, y, z + 1);
    attemptPlaceBarrier(x + 1, y, z + 1);
    attemptPlaceBarrier(x - 1, y, z + 1);
    attemptPlaceBarrier(x, y, z - 1);
    attemptPlaceBarrier(x + 1, y, z - 1);
    attemptPlaceBarrier(x - 1, y, z - 1);
  }
}

function attemptPlaceBarrier(x, y, z) {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT || z < 0 || z >= MAP_DEPTH) {
    // console.log("Out of bounds");
    return;
  }
  if (map[x][z][y] == 4) {
    map[x][z][y] = 0;
  }
  else if (map[x][z][y] == 0) {
    map[x][z][y] = 3;
  }
}

function getBlockLoc(mul = 3) {
  let f = camera.getForward();
  f.mul(mul);
  f.add(camera.eye);
  let x = Math.round(f.elements[0]);
  let y = Math.round(f.elements[1]);
  let z = Math.round(f.elements[2]);
  return [x, y, z];
}

function handleMouseMove(ev) {
  // let [x, y] = convertCoordinatesEventToGL(ev);
  // if (ev.buttons == 1) {
  //   // g_globalAngleX += (y - last_y) * 100;
  //   // g_globalAngleY -= (x - last_x) * 100;
  // }

  // camera.xRot((y - last_y) * 0.001);
  camera.zRot((ev.movementX) * -0.5);
  camera.xRot((ev.movementY) * -0.5);
  // console.log(x - last_x);

  // last_y = y;
  // last_x = x;

}

// Draw every shape that is supposed to be in the canvas
function renderScene() {

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // // Pass tyhe matrix to u_ModelMatrix attribute
  // var globalRotMat = new Matrix4();
  // globalRotMat.rotate(parseInt(g_globalAngleX), 1, 0, 0).rotate(parseInt(g_globalAngleY), 0, 1, 0);
  // // console.log(45 + g_globalAngle);
  // gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);


  // camera
  camera.ccube.matrix.setTranslate(...camera.at.elements);
  camera.ccube.matrix.scale(0.01, 0.01, 0.01);
  // console.log(camera.at.elements)
  camera.ccube.render();


  for (var shape of shapes) {
    // console.log(shape);
    shape.render();
  }


  for (let i = 0; i < MAP_WIDTH; i++) {
    for (let j = 0; j < MAP_DEPTH; j++) {
      for (let k = 0; k < MAP_HEIGHT; k++) {
        if (map[i][j][k] == 0) {
          continue;
        }
        cube = cubeTypes[map[i][j][k]];
        cube.matrix.setTranslate(i, k, j);
        // shapes.push(cube);
        cube.render();
      }
    }
  }
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

  if (update() == -1) {
    resetGame();
  }

  renderScene();

  // Check time at end of function and display
  var duration = performance.now() - startTime;
  // console.log("e:", performance.now());
  sendTextToHTML("ms: " + duration.toFixed(3) + " | fps: " + Math.floor(10000 / duration) / 10, "performance");
  sendTextToHTML(" Time: " + g_seconds.toPrecision(3), "time");

  requestAnimationFrame(tick);
}

var g_lastUpdate = performance.now();
var g_meteorSpawn = 5;
var g_meteorFall = 180;

function update() {
  delta = performance.now() - g_lastUpdate;

  g_meteorSpawn -= delta;
  g_meteorFall -= delta;
  if (g_meteorSpawn <= 0) {
    g_meteorSpawn = 1750 + Math.random() * 1000;
    map[Math.round(Math.random() * (MAP_WIDTH - 1))][Math.round(Math.random() * (MAP_DEPTH - 1))][MAP_HEIGHT - 1] = 4;
  }


  var meteorFallQueued = false;
  if (g_meteorFall <= 0) {
    g_meteorFall = 360;
    meteorFallQueued = true;
  }

  for (let i = 0; i < MAP_WIDTH; i++) {
    for (let j = 0; j < MAP_DEPTH; j++) {
      for (let k = 0; k < MAP_HEIGHT; k++) {
        if (meteorFallQueued && map[i][j][k] == 4) {
          map[i][j][k] = 0;
          if (k - 1 <= 0 || map[i][j][k - 1] == 2) {
            return -1;
          }
          if (map[i][j][k - 1] == 3) {
            map[i][j][k - 1] = 0;
          }
          else {
            map[i][j][k - 1] = 4;
          }
        }
      }
    }
  }


  // console.log(delta)
  if (keys['w']) {
    camera.moveForward(delta * camera.fspeed);
    // console.log("w");
  }
  if (keys['s']) {
    camera.moveForward(-delta * camera.bspeed);
  }
  if (keys['a']) {
    camera.moveLeft(-delta * camera.sspeed);
  }
  if (keys['d']) {
    camera.moveLeft(delta * camera.sspeed);
  }
  if (keys[' ']) {
    camera.moveUp(delta * camera.uspeed);
  }

  camera.calculateViewProjection();

  g_lastUpdate = performance.now();
}


function resetGame() {
  g_startTime = performance.now() / 1000.0;
  g_meteorSpawn = 5;
  g_meteorFall = 180;
  camera = new Camera();
  map = [];
  for (let i = 0; i < MAP_WIDTH; i++) {
    map.push([]);
    for (let j = 0; j < MAP_DEPTH; j++) {
      map[i].push([])
      let buildingHeight = Math.random() > 0.7 ? Math.random() * 5 : 0;
      for (let k = 0; k < MAP_HEIGHT; k++) {
        // TODO YOU ARE HERE, MAKE YOUR GRID BETTER BY HAVING TRUE 3D GRID WITH IND = BLOCK TYPE
        map[i][j].push(k < buildingHeight ? 2 : 0);
        // map[i].push(Math.abs(i - j))
      }
    }
  }
}