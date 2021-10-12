/** @type {HTMLCanvasElement} */
var canvas;

/** @type {WebGLRenderingContext} */
var gl;

const disk_radius = 250.0;

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
    Bacteria.allBacterias.push(Bacteria.generateRandomBacteria());
    Bacteria.allBacterias.push(Bacteria.generateRandomBacteria());
    console.log(Bacteria.allBacterias)

    var circlevert = [];

    var circlebufferobj = gl.createBuffer();
    var diskVertexBufferObj = gl.createBuffer();

    function render() {
        //gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        circlevert = [];
        console.log(Bacteria.allBacterias.length)

        Bacteria.allBacterias.forEach(bacteria => {
            bacteria.radius += 1;
            circlevert.push(...bacteria.generateVerticies());
        })

        gl.useProgram(bacteriaProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, circlebufferobj);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circlevert), gl.STATIC_DRAW);
        var cpal = gl.getAttribLocation(bacteriaProgram, 'v_position');
        gl.vertexAttribPointer(
            cpal, //attribute location
            2, //number of elements per attribute
            gl.FLOAT,
            gl.FALSE,
            5 * Float32Array.BYTES_PER_ELEMENT,//size of an individual vertex
            0 * Float32Array.BYTES_PER_ELEMENT//offset from the beginning of a single vertex to this attribute
        );
        var ccolor = gl.getAttribLocation(bacteriaProgram, 'v_color');
        gl.vertexAttribPointer(
            ccolor, //attribute location
            3, //number of elements per attribute
            gl.FLOAT,
            gl.FALSE,
            5 * Float32Array.BYTES_PER_ELEMENT,//size of an individual vertex
            2 * Float32Array.BYTES_PER_ELEMENT//offset from the beginning of a single vertex to this attribute
        );

        gl.enableVertexAttribArray(cpal);
        gl.enableVertexAttribArray(ccolor);

        gl.drawArrays(gl.TRIANGLES, 0, circlevert.length / 5 * 2);


        gl.useProgram(diskProgram);
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
        var widthHandle = gl.getUniformLocation(diskProgram, "center_x");
        var heightHandle = gl.getUniformLocation(diskProgram, "center_y");
        var radiusHandle = gl.getUniformLocation(diskProgram, "radius");

        //radius += 1;
        gl.uniform1f(widthHandle, canvas.width / 2);
        gl.uniform1f(heightHandle, canvas.height / 2);
        gl.uniform1f(radiusHandle, disk_radius);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);

    canvas.onmousedown = function clickEvent(e) {
        // e = Mouse click event.
        var rect = e.target.getBoundingClientRect();
        var x = e.clientX - rect.left; //x position within the element.
        var y = e.target.height - (e.clientY - rect.top);  //y position within the element.

        var toberemove = []
        Bacteria.allBacterias.forEach(bacteria => {
            if (bacteria.colideWithPoint(x, y)) {
                toberemove.push(Bacteria.allBacterias.indexOf(bacteria));
                return;
            }
        })

        toberemove.forEach(index => {
            Bacteria.allBacterias.splice(index, 1)

        })

        for (var i = 0; i < toberemove.length; i++) {
            Bacteria.allBacterias.push(Bacteria.generateRandomBacteria())
        }
    }

}
window.onload = main;

// all in pixels
function generateCircleVerticies(cx, cy, radius, color = vec3(0.0, 0.0, 0.0)) {
    //var verts = screen2vert(cx, cy);
    var verts = [];
    /*
    x, y,    r, g, b,
    x, y,    r, g, b
    */
    var num_fans = 50;
    var angle = 2 * Math.PI / num_fans;
    var center = screen2vert(cx, cy)

    for (var i = 0; i < num_fans; i++) {
        verts.push(...center);
        verts.push(...color);

        var a = i * angle;
        var x = Math.cos(a) * radius + cx;
        var y = Math.sin(a) * radius + cy;
        verts.push(...screen2vert(x, y));
        verts.push(...color)

        var a = (i + 1) * angle;
        var x = Math.cos(a) * radius + cx;
        var y = Math.sin(a) * radius + cy;
        verts.push(...screen2vert(x, y));
        verts.push(...color)
    }
    console.log(verts)
    return verts;
}

function getRandomPointOnCircumference(cx, cy, radius) {
    var angle = Math.random() * 2 * Math.PI;
    return vec2(
        Math.cos(angle) * radius + cx,
        Math.sin(angle) * radius + cy
    )
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


function screen2vert(x, y) {
    return vec2(
        scale2range(x, canvas.width, 0, 1, -1),
        scale2range(y, canvas.height, 0, 1, -1)
    )
}

function vert2screen(x, y) {
    return vec2(
        scale2range(x, 1, -1, canvas.width, 0),
        scale2range(y, 1, -1, canvas.height, 0)
    )
}

function scale2range(num, old_top, old_bottom, new_top, new_bottom) {
    return (num - old_bottom) / (old_top - old_bottom) * (new_top - new_bottom) + new_bottom
}

class Bacteria {
    static allBacterias = [];

    static colors = [

    ];

    constructor(center_x, center_y, radius, color = vec3(1.0, 0.0, 0.0)) {
        this.center_x = center_x;
        this.center_y = center_y;
        this.radius = radius;
        this.color = color;
    }

    static generateRandomBacteria() {
        var point = getRandomPointOnCircumference(canvas.width / 2, canvas.height / 2, disk_radius);
        return new Bacteria(point[0], point[1], 10, Bacteria.getRandomColor());
    }

    static getRandomColor() {
        //hslToRgb(~~(360 * Math.random()), 0.7, 0.8);
        return rgbTopercentage(hslToRgb(Math.random() , 0.7, 0.8));
        return vec3(1.0, 0.0, 0.0);
    }

    colideWith(other) {
        return ((this.radius + other.radius) * (this.radius + other.radius)) > (
            (this.center_x - other.center_x) * (this.center_x - other.center_x) +
            (this.center_y - other.center_y) * (this.center_y - other.center_y)
        );
    }

    colideWithPoint(x, y) {
        return this.radius * this.radius > ((this.center_x - x) * (this.center_x - x) + (this.center_y - y) * (this.center_y - y));
    }

    generateVerticies() {

        var verts = [];
        /*
        x, y,    r, g, b,
        x, y,    r, g, b
        */
        var num_fans = 50;
        var angle = 2 * Math.PI / num_fans;
        var center = screen2vert(this.center_x, this.center_y)

        for (var i = 0; i < num_fans; i++) {
            verts.push(...center);
            verts.push(...this.color);

            var a = i * angle;
            var x = Math.cos(a) * this.radius + this.center_x;
            var y = Math.sin(a) * this.radius + this.center_y;
            verts.push(...screen2vert(x, y));
            verts.push(...this.color)

            var a = (i + 1) * angle;
            var x = Math.cos(a) * this.radius + this.center_x;
            var y = Math.sin(a) * this.radius + this.center_y;
            verts.push(...screen2vert(x, y));
            verts.push(...this.color)
        }
        return verts;
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
        gl_FragColor = vec4(0.968627451, 0.145098039, 0.521568627, 1.0);
    }
}
`;

const bacteriaVertexShaderText = `
precision mediump float;

attribute vec4 v_position;
attribute vec3 v_color;

varying vec3 f_color;

void main() {
    gl_Position = v_position;
    f_color = v_color;
} 
`;

const bacteriaFragmentShaderText = `
precision mediump float;

varying vec3 f_color;

void main() {
    gl_FragColor = vec4(f_color, 1.0);
}
`;