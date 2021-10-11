/** @type {HTMLCanvasElement} */
var canvas;

/** @type {WebGLRenderingContext} */
var gl;

function main() {
    canvas = document.getElementById("glCanvas");
    gl = canvas.getContext("webgl");

    gl.viewport(0, 0, canvas.width, canvas.height);

    var bacteriaVertexShader = gl.createShader(gl.VERTEX_SHADER);
    var bacteriaFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    var diskVertexShader = gl.createShader(gl.VERTEX_SHADER);
    var diskFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    compileShader(gl, bacteriaVertexShader, bacteriaVertexShaderText);
    compileShader(gl, bacteriaFragmentShader, bacteriaFragmentShaderText);
    compileShader(gl, diskVertexShader, diskVertexShaderText);
    compileShader(gl, diskFragmentShader, diskFragmentShaderText);

    var bacteriaProgram = gl.createProgram();
    var diskProgram = gl.createProgram();

    gl.attachShader(bacteriaProgram, bacteriaVertexShader);
    gl.attachShader(bacteriaProgram, bacteriaFragmentShader);
    gl.attachShader(diskProgram, diskVertexShader);
    gl.attachShader(diskProgram, diskFragmentShader);

    linkProgram(gl, bacteriaProgram);
    linkProgram(gl, diskProgram);

    var diskVerts = [
        // covers the entire canvas
        // First triangle:
        1.0, 1.0,
        -1.0, 1.0,
        -1.0, -1.0,
        // Second triangle:
        -1.0, -1.0,
        1.0, -1.0,
        1.0, 1.0
    ];


    //var circlevert = generateCircleVerticies(0, 0, 0, '');
    var circlevert = [
        1.0, 1.0,
        -1.0, 1.0,
        -1.0, -1.0,
        // Second triangle:
        -1.0, -1.0,
        1.0, -1.0,
        1.0, 1.0
    ];
    var circlebufferobj = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circlebufferobj);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circlevert), gl.STATIC_DRAW);
    var cpal = gl.getAttribLocation(bacteriaProgram, 'v_position');
    gl.vertexAttribPointer(
        cpal, //attribute location
        2, //number of elements per attribute
        gl.FLOAT,
        gl.FALSE,
        2 * Float32Array.BYTES_PER_ELEMENT,//size of an individual vertex
        0 * Float32Array.BYTES_PER_ELEMENT//offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(cpal);


    var diskVertexBufferObj = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, diskVertexBufferObj);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diskVerts), gl.STATIC_DRAW);
    var positionAttribLocation = gl.getAttribLocation(diskProgram, 'v_position');
    gl.vertexAttribPointer(
        positionAttribLocation, //attribute location
        2, //number of elements per attribute
        gl.FLOAT,
        gl.FALSE,
        2 * Float32Array.BYTES_PER_ELEMENT,//size of an individual vertex
        0 * Float32Array.BYTES_PER_ELEMENT//offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(positionAttribLocation);


    var radius = 150.0;
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);


        gl.useProgram(bacteriaProgram);
        gl.drawArrays(gl.TRIANGLES, 0, 360 * 3);


        gl.useProgram(diskProgram);
        var widthHandle = gl.getUniformLocation(diskProgram, "center_x");
        var heightHandle = gl.getUniformLocation(diskProgram, "center_y");
        var radiusHandle = gl.getUniformLocation(diskProgram, "radius");

        //radius += 1;
        gl.uniform1f(widthHandle, canvas.width / 2);
        gl.uniform1f(heightHandle, canvas.height / 2);
        gl.uniform1f(radiusHandle, radius);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        //window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);
}
window.onload = main;

function generateCircleVerticies(cx, cy, radius, color) {
    var verts = [];
    for (let i = 1; i <= 360; i++) {
        var y1 = radius * Math.sin(i) + cy;
        var x1 = radius * Math.cos(i) + cx;

        var y2 = radius * Math.sin(i + 1) + cy;
        var x2 = radius * Math.cos(i + 1) + cx;

        verts.push(cx);
        verts.push(cy);
        verts.push(0);

        verts.push(x1);
        verts.push(y1);
        verts.push(0);

        verts.push(x2);
        verts.push(y2);
        verts.push(0);
    }
    return verts;
}

function compileShader(gl, shader, text) {
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader!', gl.getShaderInfoLog(shader));
    }
}

function linkProgram(gl, program) {
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program!', gl.getProgramInfo(program));
    }
}

const diskVertexShaderText = `
precision mediump float;

attribute vec4 v_position;

void main() {
    gl_Position = v_position;
} 
`;

const diskFragmentShaderText = `
precision mediump float;

uniform float center_x;
uniform float center_y;
uniform float radius;

void main() {
    float normalizedX = gl_FragCoord.x - center_x;
    float normalizedY = gl_FragCoord.y - center_y;

    if (sqrt(normalizedX * normalizedX + normalizedY * normalizedY) < radius) {
        //transparent cutout
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
`;

const bacteriaVertexShaderText = `
precision mediump float;

attribute vec4 v_position;

void main() {
    gl_Position = v_position;
} 
`;

const bacteriaFragmentShaderText = `
precision mediump float;

uniform vec4 f_color;

void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;