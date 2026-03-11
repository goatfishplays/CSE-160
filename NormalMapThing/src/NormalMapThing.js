// ColoredPoint.js (c) 2012 matsuda

// NOTES FOR CLASS
// Think normals would do better as a lab than part of the assignment
// Because I only used planes the TBN wasn't too much of a problem 
// but for other things we need to automatically generate the tangent and bitangent
// this would likely need to be taught*

// Vertex shader program
var VSHADER_SOURCE =
  `attribute vec3 a_Position;
attribute vec2 a_NormalMapCoord;

attribute vec3 a_Normal;
attribute vec3 a_Tangent;
attribute vec3 a_Bitangent;

varying vec3 v_Position;
varying vec2 v_NormalMapCoord;
varying mat3 v_TBN;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

void main() {

  vec4 worldPos = u_ModelMatrix * vec4(a_Position, 1.0);
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;

  v_Position = worldPos.xyz;
  v_NormalMapCoord = a_NormalMapCoord;

  vec3 T = normalize((u_ModelMatrix * vec4(a_Tangent,0.0)).xyz);
  vec3 B = normalize((u_ModelMatrix * vec4(a_Bitangent,0.0)).xyz);
  vec3 N = normalize((u_ModelMatrix * vec4(a_Normal,0.0)).xyz);

  v_TBN = mat3(T,B,N);
}
    `;

// Fragment shader program
var FSHADER_SOURCE =
  ` 
  precision mediump float;
  uniform vec4 u_FragColor;  

  uniform float u_NormVis;
  varying vec3 v_Position;
  varying vec2 v_NormalMapCoord; 
  // uniform mat4 u_NormalMatrix;    

  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  uniform vec3 u_CameraPos;
  
  float ambCoeff = 0.5;
  vec3 ambColor = vec3(1.0, 1.0, 1.0);
  float diffCoeff = 1.0;
  float specCoeff = 0.75;
  float specPow = 32.0;
varying mat3 v_TBN;

  uniform sampler2D u_Sampler;
   
  uniform float u_Lit;  
  uniform float u_LightOn;
  void main() { 
    // vec3 normalNormal = normalize(u_NormalMatrix * vec4(texture2D(u_Sampler, v_NormalMapCoord).xyz * 2.0 - 1.0, 0.0)).xyz;
    // normalNormal = vec3(normalNormal.x, normalNormal.z, normalNormal.y);
    vec3 texNormal = texture2D(u_Sampler, v_NormalMapCoord).xyz;
    texNormal = texNormal * 2.0 - 1.0;

    vec3 normalNormal = normalize(v_TBN * texNormal);

    vec3 lightDir = normalize(u_LightPos - v_Position); 
    vec3 camDir = normalize(u_CameraPos - v_Position);
    vec3 specTemp = normalize(camDir + lightDir);
    
    float diffuse = diffCoeff * max(dot(lightDir, normalNormal), 0.0);
    float specular = specCoeff * pow(max(dot(specTemp, normalNormal), 0.0), specPow); 

    vec4 lighting = vec4(u_LightColor, 1.0) * u_LightOn * (diffuse + specular);
    
    vec4 ambLight = vec4(ambColor, 1.0) * ambCoeff;

    vec4 totLight = (1.0-u_Lit) * (lighting + ambLight) + (u_Lit) * vec4(1.0, 1.0, 1.0, 1.0);

    vec4 color = (1.0 - u_NormVis) * (totLight) * (u_FragColor)
                  +(u_NormVis) *  (u_Lit * u_FragColor + (1.0-u_Lit) * texture2D(u_Sampler, v_NormalMapCoord)); 
    color.a = 1.0; 
    gl_FragColor = color;  
  }
    `;

var defaultProgram;


const MAP_WIDTH = 32;
const MAP_DEPTH = 32;
const MAP_HEIGHT = 32;

// Global Variables
let canvas;
let gl;
let camera;
let u_ProjectionMatrix;
let u_ViewMatrix;

let a_Normal;
let a_Tangent;
let a_Bitangent;


let a_Position;
let u_ModelMatrix;
let u_NormalMatrix;
let u_Lit;
let u_LightOn;
// let u_GlobalRotation;
let u_FragColor;

let u_Sampler;
let a_NormalMapCoord;

let u_LightColor;
let u_LightPos;
let u_CameraPos;

// State Globals 
var g_globalAngleY = 0;
var g_globalAngleX = 0;
let shapes = [];
var normVis = 0.0;
const keys = {};
let g_lightPos = [16, 10, 16];
let g_lightColor = [1.0, 1.0, 1.0];

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
  defaultProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  if (!defaultProgram) {
    console.log('Failed to intialize shaders.');
    return;
  }
  gl.useProgram(defaultProgram);


  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(defaultProgram, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }
  a_NormalMapCoord = gl.getAttribLocation(defaultProgram, 'a_NormalMapCoord');
  if (a_NormalMapCoord < 0) {
    console.log('Failed to get the storage location of a_NormalMapCoord');
    return;
  }

  a_Normal = gl.getAttribLocation(defaultProgram, 'a_Normal');
  a_Tangent = gl.getAttribLocation(defaultProgram, 'a_Tangent');
  a_Bitangent = gl.getAttribLocation(defaultProgram, 'a_Bitangent');



  u_ModelMatrix = gl.getUniformLocation(defaultProgram, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }


  u_ProjectionMatrix = gl.getUniformLocation(defaultProgram, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }
  u_ViewMatrix = gl.getUniformLocation(defaultProgram, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }



  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(defaultProgram, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_NormVis = gl.getUniformLocation(defaultProgram, 'u_NormVis');
  if (!u_NormVis) {
    console.log('Failed to get the storage location of u_NormVis');
    return;
  }
  // u_NormalMatrix = gl.getUniformLocation(defaultProgram, 'u_NormalMatrix');
  // if (!u_NormalMatrix) {
  //   console.log('Failed to get the storage location of u_NormalMatrix');
  //   return;
  // }



  u_Lit = gl.getUniformLocation(defaultProgram, 'u_Lit');
  if (!u_Lit) {
    console.log('Failed to get the storage location of u_Lit');
    return;
  }
  u_LightOn = gl.getUniformLocation(defaultProgram, 'u_LightOn');
  if (!u_LightOn) {
    console.log('Failed to get the storage location of u_LightOn');
    return;
  }

  // u_GlobalRotation = gl.getUniformLocation(defaultProgram, 'u_GlobalRotation');
  // if (!u_GlobalRotation) {
  //   console.log('Failed to get the storage location of u_GlobalRotateMatrix');
  //   return;
  // }



  u_Sampler = gl.getUniformLocation(defaultProgram, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return;
  }
  // a_TexCoord = gl.getAttribLocation(defaultProgram, 'a_TexCoord');
  // if (!a_TexCoord) {
  //   console.log('Failed to get the storage location of a_TexCoord');
  //   return;
  // }
  // u_texColorWeight = gl.getUniformLocation(defaultProgram, 'u_texColorWeight');
  // if (!u_texColorWeight) {
  //   console.log('Failed to get the storage location of u_texColorWeight');
  //   return;
  // }


  u_LightPos = gl.getUniformLocation(defaultProgram, 'u_LightPos');
  if (!u_LightPos) {
    console.log('Failed to get the storage location of u_LightPos');
    return;
  }
  u_LightColor = gl.getUniformLocation(defaultProgram, 'u_LightColor');
  if (!u_LightColor) {
    console.log('Failed to get the storage location of u_LightColor');
    return;
  }
  u_CameraPos = gl.getUniformLocation(defaultProgram, 'u_CameraPos');
  if (!u_CameraPos) {
    console.log('Failed to get the storage location of u_CameraPos');
    return;
  }

}

let g_lightX = 0;
let g_lightY = 0;
let g_lightZ = 0;
let g_lightXOn = true;
let g_lightYOn = true;
let g_lightZOn = true;
let g_lightingOn = true;

let g_planePos = [MAP_WIDTH / 2, 2, MAP_DEPTH / 2];
let g_planeRot = [0, 0, 0];

function addActionsForHtmlUI() {
  // Button Events 
  document.getElementById("NormVisOnButton").onclick = function () { normVis = 1.0; };
  document.getElementById("NormVisOffButton").onclick = function () { normVis = 0.0; }

  document.getElementById("LightingOnButton").onclick = function () { g_lightingOn = true; };
  document.getElementById("LightingOffButton").onclick = function () { g_lightingOn = false; }



  document.getElementById("lightXSlider").addEventListener('mousemove', function () { g_lightX = MAP_WIDTH * this.value / this.max; });
  document.getElementById("lightXOnButton").onclick = function () { g_lightXOn = true; };
  document.getElementById("lightXOffButton").onclick = function () { g_lightXOn = false; };

  document.getElementById("lightYSlider").addEventListener('mousemove', function () { g_lightY = MAP_HEIGHT * this.value / this.max; });
  document.getElementById("lightYOnButton").onclick = function () { g_lightYOn = true; };
  document.getElementById("lightYOffButton").onclick = function () { g_lightYOn = false; };

  document.getElementById("lightZSlider").addEventListener('mousemove', function () { g_lightZ = MAP_DEPTH * this.value / this.max; });
  document.getElementById("lightZOnButton").onclick = function () { g_lightZOn = true; };
  document.getElementById("lightZOffButton").onclick = function () { g_lightZOn = false; };

  document.getElementById("lightRSlider").addEventListener('mousemove', function () { g_lightColor[0] = this.value / this.max; });

  document.getElementById("lightGSlider").addEventListener('mousemove', function () { g_lightColor[1] = this.value / this.max; });

  document.getElementById("lightBSlider").addEventListener('mousemove', function () { g_lightColor[2] = this.value / this.max; });

  document.getElementById("posXSlider").addEventListener('mousemove', function () { g_planePos[0] = MAP_WIDTH * this.value / this.max; });
  document.getElementById("posYSlider").addEventListener('mousemove', function () { g_planePos[1] = MAP_HEIGHT * this.value / this.max; });
  document.getElementById("posZSlider").addEventListener('mousemove', function () { g_planePos[2] = MAP_DEPTH * this.value / this.max; });
  document.getElementById("rotXSlider").addEventListener('mousemove', function () { g_planeRot[0] = this.value; });
  document.getElementById("rotYSlider").addEventListener('mousemove', function () { g_planeRot[1] = this.value; });
  document.getElementById("rotZSlider").addEventListener('mousemove', function () { g_planeRot[2] = this.value; });
}

function main() {

  addActionsForHtmlUI();

  setupWebGL();


  camera = new Camera();


  canvas.onmousemove = (ev) => { handleMouseMove(ev) };
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
let pointLight; let plane;
const wholeTexture = [
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 1, 1],]

function initScene() {

  let cube0 = new Cube();
  cube0.generateCube(...wholeTexture);
  cubeTypes.push(cube0);

  resetGame();




  plane = new Plane();
  plane.color = [0.375, 0.375, 0.375, 1.0];
  // plane.matrix.translate(MAP_WIDTH / 2 - 0.5, -0.55, MAP_DEPTH / 2 - 0.5);
  plane.matrix.scale(5, 5, 5);
  shapes.push(plane);


  let ground = new Cube();
  ground.generateCube(...wholeTexture);
  ground.color = [0.375, 0.5, 0.375, 1.0];
  ground.matrix.translate(MAP_WIDTH / 2 - 0.5, -0.55, MAP_DEPTH / 2 - 0.5);
  ground.matrix.scale(MAP_WIDTH, 0.1, MAP_DEPTH);

  shapes.push(ground);

  let skyBox = new Cube();
  skyBox.generateCube(...wholeTexture);
  skyBox.color = [0.5, 0.5, 1.0, 1.0];
  skyBox.matrix.scale(1000, 1000, 1000);
  skyBox.lit = false;
  // skyBox.matrix.translate(0, 0, 0);
  shapes.push(skyBox);

  pointLight = new Cube();
  pointLight.generateCube(...wholeTexture);
  pointLight.color = [1, 1, 1, 1.0];
  pointLight.matrix.setTranslate(...g_lightPos);
  pointLight.matrix.scale(0.25, 0.25, 0.25);
  pointLight.lit = false;
  // skyBox.matrix.translate(0, 0, 0);
  shapes.push(pointLight);
}

function initTextures() {
  var texture = gl.createTexture();

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // // grab pointer to shader uniform var
  // const uTexture0 = gl.getUniformLocation(defaultProgram, "uTexture0");
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
  img.src = '../defaultNormalMap.png';
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
  if (ev.buttons == 1) {
  }
  if (ev.buttons == 2) {
  }
}


function handleMouseMove(ev) {
  // let [x, y] = convertCoordinatesEventToGL(ev);
  // if (ev.buttons == 1) {
  //   // g_globalAngleX += (y - last_y) * 100;
  //   // g_globalAngleY -= (x - last_x) * 100;
  // }
  if (document.pointerLockElement !== canvas) {
    return;
  }

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


  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniform3f(u_LightColor, ...(g_lightingOn ? g_lightColor : [1.0, 1.0, 1.0]));
  gl.uniform3f(u_LightPos, ...g_lightPos);
  gl.uniform3f(u_CameraPos, ...camera.eye.elements);
  gl.uniform1f(u_LightOn, g_lightingOn ? 1.0 : 0.0);




  for (var shape of shapes) {
    // console.log(shape);
    shape.render();
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

function update() {
  delta = performance.now() - g_lastUpdate;


  g_lightPos = [
    g_lightXOn ? MAP_WIDTH / 2 + 5 * Math.sin(performance.now() / 400) : g_lightX,
    g_lightYOn ? 10 + 2.5 * Math.cos(performance.now() / 400) : g_lightY,
    g_lightZOn ? MAP_DEPTH / 2 + 5 * Math.cos(performance.now() / 400) : g_lightZ
  ];
  pointLight.matrix.setTranslate(...g_lightPos);
  pointLight.matrix.scale(0.25, 0.25, 0.25);

  plane.matrix.setTranslate(...g_planePos);
  plane.matrix.rotate(g_planeRot[0], 1, 0, 0);
  plane.matrix.rotate(g_planeRot[1], 0, 1, 0);
  plane.matrix.rotate(g_planeRot[2], 0, 0, 1);
  plane.matrix.scale(10, 10, 10);





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
  camera = new Camera();
}