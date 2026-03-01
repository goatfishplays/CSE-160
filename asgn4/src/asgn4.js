// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  `
  attribute vec3 a_Position;
  varying vec3 v_Position;
  attribute vec3 a_Normal;
  varying vec3 v_Normal;

  attribute vec2 a_TexCoord; 
  uniform mat4 u_ModelMatrix; 
  uniform mat4 u_NormalMatrix; 
  // uniform mat4 u_GlobalRotation;
   
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_ViewMatrix;

  // varying float v_Lighting; 

  varying vec2 v_TexCoord;
  void main() {
    vec4 worldPos = u_ModelMatrix * vec4(a_Position, 1.0);
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_TexCoord = a_TexCoord; 
 
    v_Normal = (u_NormalMatrix * vec4(a_Normal, 0.0)).xyz;
    v_Position = worldPos.xyz;
    // v_Lighting = max(dot(normalize(u_LightPos - worldPos.xyz), normalize(v_Normal)), u_Lit);
  }
    `;

// Fragment shader program
var FSHADER_SOURCE =
  ` 
  precision mediump float;
  uniform vec4 u_FragColor;  

  uniform float u_NormVis;
  varying vec3 v_Position;
  varying vec3 v_Normal;
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  uniform vec3 u_LightPosSpot;
  uniform vec3 u_SpotTarg; 
  uniform vec3 u_SpotColor;
  uniform vec3 u_CameraPos;
  
  float ambCoeff = 0.25;
  vec3 ambColor = vec3(1.0, 1.0, 1.0);
  float diffCoeff = 1.0;
  float specCoeff = 0.75;
  float specPow = 32.0;
  float spotSize = 0.9;

  uniform sampler2D u_Sampler;
  varying vec2 v_TexCoord;
  uniform float u_texColorWeight;
   
  uniform float u_Lit;  
  uniform float u_LightOn;    
  uniform float u_SpotOn;   
  // varying float v_Lighting; 
  void main() { 
    vec3 normalNormal = normalize(v_Normal);
    vec3 lightDir = normalize(u_LightPos - v_Position);
    vec3 camDir = normalize(u_CameraPos - v_Position);
    vec3 specTemp = normalize(camDir + lightDir);
    
    
    float diffuse = diffCoeff * max(dot(lightDir, normalNormal), 0.0);
    float specular = specCoeff * pow(max(dot(specTemp, normalNormal), 0.0), specPow); 

    // vec4 lighting = vec4(u_LightColor, 1.0) * max((1.0 - u_Lit) * (diffuse + specular), u_Lit);
    vec4 lighting = vec4(u_LightColor, 1.0) * u_LightOn * (diffuse + specular);
    
    vec3 lightDirSpot = normalize(u_LightPosSpot - v_Position);
    vec3 lightDirSpotTarg = normalize(u_LightPosSpot - u_SpotTarg);
    vec3 specTempSpot = normalize(camDir + lightDirSpot);
    
    float diffuseSpot = diffCoeff * max(dot(lightDirSpot, normalNormal), 0.0);
    float specularSpot = specCoeff * pow(max(dot(specTempSpot, normalNormal), 0.0), specPow); 

    vec4 spotLight = vec4(u_SpotColor, 1.0) * float(dot(lightDirSpot, lightDirSpotTarg) > spotSize) * u_SpotOn * (diffuseSpot + specularSpot);
    
    vec4 ambLight = vec4(ambColor, 1.0) * ambCoeff;

    vec4 totLight = (1.0-u_Lit) * (lighting + spotLight + ambLight) + (u_Lit) * vec4(1.0, 1.0, 1.0, 1.0);

  vec4 color = (1.0 - u_NormVis) * (totLight) * (u_texColorWeight * texture2D(u_Sampler, v_TexCoord) + (1.0-u_texColorWeight) * u_FragColor)
                  +(u_NormVis) *  vec4(normalize(v_Normal)/2.0 + 0.5, 1.0);
    color.a = 1.0; 
    gl_FragColor = color;  
  }
    `;

var defaultProgram;


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
let u_NormalMatrix;
let u_Lit;
let u_LightOn;
let u_SpotOn;
// let u_GlobalRotation;
let u_FragColor;

let u_Sampler;
let a_TexCoord;
let u_texColorWeight;

let u_LightColor;
let u_LightPos;
let u_SpotColor;
let u_LightPosSpot;
let u_SpotTarg;
let u_CameraPos;

// State Globals 
var g_globalAngleY = 0;
var g_globalAngleX = 0;
let shapes = [];
var normVis = 0.0;
const keys = {};
let g_lightPos = [16, 10, 16];
let g_lightColor = [1.0, 1.0, 1.0];
let g_SpotPos = [16, 10, 16];
let g_SpotTarg = [16, 10, 16];
let g_SpotColor = [1.0, 1.0, 1.0];

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
  a_Normal = gl.getAttribLocation(defaultProgram, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(defaultProgram, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  u_NormalMatrix = gl.getUniformLocation(defaultProgram, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }
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
  u_SpotOn = gl.getUniformLocation(defaultProgram, 'u_SpotOn');
  if (!u_SpotOn) {
    console.log('Failed to get the storage location of u_SpotOn');
    return;
  }

  // u_GlobalRotation = gl.getUniformLocation(defaultProgram, 'u_GlobalRotation');
  // if (!u_GlobalRotation) {
  //   console.log('Failed to get the storage location of u_GlobalRotateMatrix');
  //   return;
  // }

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


  u_Sampler = gl.getUniformLocation(defaultProgram, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return;
  }
  a_TexCoord = gl.getAttribLocation(defaultProgram, 'a_TexCoord');
  if (!a_TexCoord) {
    console.log('Failed to get the storage location of a_TexCoord');
    return;
  }
  u_texColorWeight = gl.getUniformLocation(defaultProgram, 'u_texColorWeight');
  if (!u_texColorWeight) {
    console.log('Failed to get the storage location of u_texColorWeight');
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
  u_LightPosSpot = gl.getUniformLocation(defaultProgram, 'u_LightPosSpot');
  if (!u_LightPosSpot) {
    console.log('Failed to get the storage location of u_LightPosSpot');
    return;
  }
  u_SpotTarg = gl.getUniformLocation(defaultProgram, 'u_SpotTarg');
  if (!u_SpotTarg) {
    console.log('Failed to get the storage location of u_SpotTarg');
    return;
  }
  u_SpotColor = gl.getUniformLocation(defaultProgram, 'u_SpotColor');
  if (!u_SpotColor) {
    console.log('Failed to get the storage location of u_SpotColor');
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

let g_spotPosX = 0;
let g_spotPosY = 0;
let g_spotPosZ = 0;
let g_spotPosXOn = true;
let g_spotPosYOn = true;
let g_spotPosZOn = true;
let g_spotTargX = 0;
let g_spotTargY = 0;
let g_spotTargZ = 0;
let g_spotOn = true;
let g_spotColor = [1.0, 1.0, 1.0];
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



  document.getElementById("spotOnButton").onclick = function () { g_spotOn = true; };
  document.getElementById("spotOffButton").onclick = function () { g_spotOn = false; }

  document.getElementById("spotPosXSlider").addEventListener('mousemove', function () { g_spotPosX = MAP_WIDTH * this.value / this.max; });
  document.getElementById("spotPosXOnButton").onclick = function () { g_spotPosXOn = true; };
  document.getElementById("spotPosXOffButton").onclick = function () { g_spotPosXOn = false; };

  document.getElementById("spotPosYSlider").addEventListener('mousemove', function () { g_spotPosY = MAP_HEIGHT * this.value / this.max; });
  document.getElementById("spotPosYOnButton").onclick = function () { g_spotPosYOn = true; };
  document.getElementById("spotPosYOffButton").onclick = function () { g_spotPosYOn = false; };

  document.getElementById("spotPosZSlider").addEventListener('mousemove', function () { g_spotPosZ = MAP_DEPTH * this.value / this.max; });
  document.getElementById("spotPosZOnButton").onclick = function () { g_spotPosZOn = true; };
  document.getElementById("spotPosZOffButton").onclick = function () { g_spotPosZOn = false; };

  document.getElementById("spotTargXSlider").addEventListener('mousemove', function () { g_spotTargX = MAP_WIDTH * this.value / this.max; });
  // document.getElementById("spotTargXOnButton").onclick = function () { g_lightXOn = true; };
  // document.getElementById("spotTargXOffButton").onclick = function () { g_lightXOn = false; };

  document.getElementById("spotTargYSlider").addEventListener('mousemove', function () { g_spotTargY = MAP_HEIGHT * this.value / this.max; });
  // document.getElementById("spotTargYOnButton").onclick = function () { g_lightYOn = true; };
  // document.getElementById("spotTargYOffButton").onclick = function () { g_lightYOn = false; };

  document.getElementById("spotTargZSlider").addEventListener('mousemove', function () { g_spotTargZ = MAP_DEPTH * this.value / this.max; });
  // document.getElementById("spotTargZOnButton").onclick = function () { g_lightZOn = true; };
  // document.getElementById("spotTargZOffButton").onclick = function () { g_lightZOn = false; };

  document.getElementById("spotRSlider").addEventListener('mousemove', function () { g_spotColor[0] = this.value / this.max; });

  document.getElementById("spotGSlider").addEventListener('mousemove', function () { g_spotColor[1] = this.value / this.max; });

  document.getElementById("spotBSlider").addEventListener('mousemove', function () { g_spotColor[2] = this.value / this.max; });
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
let pointLight;
let spotLight;
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


  resetGame();
  // for (let i = 0; i < MAP_WIDTH; i++) {
  //   map.push([]);
  //   for (let j = 0; j < MAP_DEPTH; j++) {
  //     map[i].push([])
  //     let buildingHeight = Math.random() > 0.7 ? Math.random() * 5 : 0;
  //     for (let k = 0; k < MAP_HEIGHT; k++) {
  //       // TODO YOU ARE HERE, MAKE YOUR GRID BETTER BY HAVING TRUE 3D GRID WITH IND = BLOCK TYPE
  //       map[i][j].push(0);
  //       // map[i][j].push(k < buildingHeight ? 2 : 0);
  //       // map[i].push(Math.abs(i - j))
  //     }
  //   }
  // }
  // console.log(map);




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
  skyBox.lit = false;
  // skyBox.matrix.translate(0, 0, 0);
  shapes.push(skyBox);

  pointLight = new Cube();
  pointLight.generateCube(...wholeTexture);
  pointLight.color = [1, 1, 1, 1.0];
  pointLight.texColorWeight = 0
  pointLight.matrix.setTranslate(...g_lightPos);
  pointLight.matrix.scale(0.25, 0.25, 0.25);
  pointLight.lit = false;
  // skyBox.matrix.translate(0, 0, 0);
  shapes.push(pointLight);

  spotLight = new Cube();
  spotLight.generateCube(...wholeTexture);
  spotLight.color = [1.0, 1.0, 0.0, 1.0];
  spotLight.texColorWeight = 0
  spotLight.matrix.setTranslate(...g_lightPos);
  spotLight.matrix.scale(0.25, 0.25, 0.25);
  spotLight.lit = false;
  // skyBox.matrix.translate(0, 0, 0);
  shapes.push(spotLight);

  spotLightTarg = new Cube();
  spotLightTarg.generateCube(...wholeTexture);
  spotLightTarg.color = [1.0, 0.0, 0.0, 1.0];
  spotLightTarg.texColorWeight = 0
  spotLightTarg.matrix.setTranslate(...g_lightPos);
  spotLightTarg.matrix.scale(0.25, 0.25, 0.25);
  spotLightTarg.lit = false;
  // skyBox.matrix.translate(0, 0, 0);
  shapes.push(spotLightTarg);

  let sphere = new Sphere(16, 16);
  sphere.matrix.translate(5, 5, 5);
  sphere.matrix.scale(1, 1, 1);
  shapes.push(sphere);

  let benchy = new Model("../benchy.obj");
  benchy.matrix.translate(23, 5, 25);
  shapes.push(benchy);
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

  // // Pass tyhe matrix to u_ModelMatrix attribute
  // var globalRotMat = new Matrix4();
  // globalRotMat.rotate(parseInt(g_globalAngleX), 1, 0, 0).rotate(parseInt(g_globalAngleY), 0, 1, 0);
  // // console.log(45 + g_globalAngle);
  // gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniform3f(u_LightColor, ...(g_lightingOn ? g_lightColor : [1.0, 1.0, 1.0]));
  gl.uniform3f(u_SpotColor, ...(g_spotOn ? g_spotColor : [1.0, 1.0, 1.0]));
  gl.uniform3f(u_LightPos, ...g_lightPos);
  gl.uniform3f(u_LightPosSpot, ...g_spotPos);
  gl.uniform3f(u_SpotTarg, g_spotTargX, g_spotTargY, g_spotTargZ);
  gl.uniform3f(u_CameraPos, ...camera.eye.elements);
  gl.uniform1f(u_LightOn, g_lightingOn ? 1.0 : 0.0);
  gl.uniform1f(u_SpotOn, g_spotOn ? 1.0 : 0.0);


  // camera
  // camera.ccube.matrix.setTranslate(...camera.at.elements);
  // camera.ccube.matrix.scale(0.01, 0.01, 0.01);
  // // console.log(camera.at.elements)
  // camera.ccube.render();


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

  // g_meteorSpawn -= delta;
  // g_meteorFall -= delta;
  // if (g_meteorSpawn <= 0) {
  //   g_meteorSpawn = 1750 + Math.random() * 1000;
  //   map[Math.round(Math.random() * (MAP_WIDTH - 1))][Math.round(Math.random() * (MAP_DEPTH - 1))][MAP_HEIGHT - 1] = 4;
  // }


  // var meteorFallQueued = false;
  // if (g_meteorFall <= 0) {
  //   g_meteorFall = 360;
  //   meteorFallQueued = true;
  // }

  g_lightPos = [
    g_lightXOn ? MAP_WIDTH / 2 + 5 * Math.sin(performance.now() / 400) : g_lightX,
    g_lightYOn ? 10 + 2.5 * Math.cos(performance.now() / 400) : g_lightY,
    g_lightZOn ? MAP_DEPTH / 2 + 5 * Math.cos(performance.now() / 400) : g_lightZ
  ];
  pointLight.matrix.setTranslate(...g_lightPos);
  pointLight.matrix.scale(0.25, 0.25, 0.25);

  g_spotPos = [
    g_spotPosXOn ? MAP_WIDTH / 2 + 10 * Math.sin(performance.now() / 800) : g_spotPosX,
    g_spotPosYOn ? 10 + 2.5 * Math.cos(performance.now() / 800) : g_spotPosY,
    g_spotPosZOn ? MAP_DEPTH / 2 + 10 * Math.cos(performance.now() / 800) : g_spotPosZ
  ];
  spotLight.matrix.setTranslate(...g_spotPos);
  spotLight.matrix.scale(0.25, 0.25, 0.25);

  spotLightTarg.matrix.setTranslate(g_spotTargX, g_spotTargY, g_spotTargZ);
  spotLightTarg.matrix.scale(0.25, 0.25, 0.25);

  // for (let i = 0; i < MAP_WIDTH; i++) {
  //   for (let j = 0; j < MAP_DEPTH; j++) {
  //     for (let k = 0; k < MAP_HEIGHT; k++) {
  //       if (meteorFallQueued && map[i][j][k] == 4) {
  //         map[i][j][k] = 0;
  //         if (k - 1 <= 0 || map[i][j][k - 1] == 2) {
  //           return -1;
  //         }
  //         if (map[i][j][k - 1] == 3) {
  //           map[i][j][k - 1] = 0;
  //         }
  //         else {
  //           map[i][j][k - 1] = 4;
  //         }
  //       }
  //     }
  //   }
  // }


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

  // map[16][23][5] = 2;
}