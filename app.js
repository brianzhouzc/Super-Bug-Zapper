let playing = false;
let current_points = 0;
let highest_points = 0;

let last_spawn = Date.now();
let mouse_coords = [];

/** @type {HTMLCanvasElement} */
let canvas;

/** @type {HTMLCanvasElement} */
let particle_canvas;

/** @type {WebGLRenderingContext} */
let gl;

/** @type {CanvasRenderingContext2D} */
let ctx;

let bacteriaProgram, diskProgram;
const disk_radius = 280.0;
const disk_verts = [
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

function main() {
    init();

    function render() {
        clear_canvas();

        if (playing) {
            game_logic();
            draw_bacterias();
        }
        draw_disk();
        draw_particles();
        window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);
}
window.onload = main;

// Logic functions
function init() {
    //Initialize webgl
    canvas = document.getElementById("glCanvas");
    particle_canvas = document.getElementById("particleCanvas");
    gl = canvas.getContext("webgl");
    ctx = particle_canvas.getContext("2d");

    gl.viewport(0, 0, canvas.width, canvas.height);

    var bacteriaVertexShader = gl.createShader(gl.VERTEX_SHADER);
    var bacteriaFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    var diskVertexShader = gl.createShader(gl.VERTEX_SHADER);
    var diskFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    compileShader(gl, bacteriaVertexShader, bacteriaVertexShaderText);
    compileShader(gl, bacteriaFragmentShader, bacteriaFragmentShaderText);
    compileShader(gl, diskVertexShader, diskVertexShaderText);
    compileShader(gl, diskFragmentShader, diskFragmentShaderText);

    bacteriaProgram = gl.createProgram();
    diskProgram = gl.createProgram();

    gl.attachShader(bacteriaProgram, bacteriaVertexShader);
    gl.attachShader(bacteriaProgram, bacteriaFragmentShader);
    gl.attachShader(diskProgram, diskVertexShader);
    gl.attachShader(diskProgram, diskFragmentShader);

    linkProgram(gl, bacteriaProgram);
    linkProgram(gl, diskProgram);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    document.getElementById("start_button").onclick = start_game;
    particle_canvas.onmousedown = mouse_event;
}

function start_game() {
    if (!playing) {
        Bacteria.allBacterias = [];
        var amount = Math.floor(randomBetweenInterval(2, 5));
        for (var i = 0; i < amount; i++)
            Bacteria.allBacterias.push(Bacteria.generateRandomBacteria());

        current_points = 0;

        playing = true;
    }
}

function end_game() {
    alert('Game Over! You got ' + current_points + ' points!');
    if (current_points > highest_points)
        highest_points = current_points;
    document.getElementById("highest_score").innerHTML = highest_points;
    playing = false;
}

function game_logic() {

    //Process mouse event
    while (mouse_coords.length) {
        var coord = mouse_coords.shift();
        var b_index = Bacteria.allBacterias.length;
        while (b_index--) {
            if (Bacteria.allBacterias[b_index].collideWithPoint(coord[0], coord[1])) {
                var bacteria = Bacteria.allBacterias[b_index];
                if (bacteria.next_radius > 0) {
                    Date.now() - bacteria.spawn_time;
                    current_points += Math.max(1, 10 - Math.ceil((Date.now() - bacteria.spawn_time) / 100));
                    document.getElementById("current_score").innerHTML = current_points;

                    for (var i = 0; i < 30; i++) {
                        Particle.allParticles.push(new Particle(coord[2], coord[3]));
                    }
                    Bacteria.allBacterias.splice(b_index, 1);
                    break;
                }
            }
        }
    }

    //Particle
    var p_toberemove = [];
    for (var i = 0; i < Particle.allParticles.length; i++) {
        var particle = Particle.allParticles[i];
        particle.update();
        if (particle.transparency == 0) {
            p_toberemove.push(i);
        }
    }

    for (var i = 0; i < p_toberemove.length; i++) {
        Particle.allParticles.splice(p_toberemove[i], 1);
    }

    //Collision with other bacterias
    var toberemove = -1;
    for (var i = 0; i < Bacteria.allBacterias.length - 1; i++) {
        for (var j = i + 1; j < Bacteria.allBacterias.length; j++) {
            if (Bacteria.allBacterias[i].collideWith(Bacteria.allBacterias[j])) {
                Bacteria.allBacterias[j].next_radius = 0;
                Bacteria.allBacterias[i].next_radius += Bacteria.allBacterias[j].radius;
                break;
            }
        }
    }
    for (var i = 0; i < Bacteria.allBacterias.length - 1; i++) {
        if (Bacteria.allBacterias[i].radius <= 0) {
            toberemove = i;
        }
    }
    if (toberemove > -1)
        Bacteria.allBacterias.splice(toberemove, 1);

    //Process gameover
    var game_over_amount = 2;
    var count = 0;
    Bacteria.allBacterias.forEach(bacteria => {
        if (bacteria.radius > 450) {
            count = 999999;
        } else if (bacteria.radius > 150) {
            count++;
        }
    });
    if (count >= game_over_amount) {
        end_game();
    }

    //Spawn more bacteria if below value
    var spawn_interval = Math.floor(randomBetweenInterval(300, 600));
    if (Bacteria.allBacterias.length <= 10) {
        if (Date.now() - last_spawn > spawn_interval) {
            Bacteria.allBacterias.push(Bacteria.generateRandomBacteria());
            last_spawn = Date.now();
        }
    }

    //Increment size
    var radius_increment = 0.5;
    Bacteria.allBacterias.forEach(bacteria => {
        if (bacteria.next_radius <= 0) {
            bacteria.updateRadius(10.0);
        } else {
            if (bacteria.next_radius > bacteria.radius + radius_increment) {
                bacteria.updateRadius(2.0);
            } else {
                bacteria.next_radius = bacteria.next_radius + radius_increment;
                bacteria.updateRadius(radius_increment);
            }
        }
    })
}

function mouse_event(e) {
    if (playing) {
        var rect = e.target.getBoundingClientRect();
        var x = e.clientX - rect.left; //x position within the element.
        var y = e.target.height - (e.clientY - rect.top);  //y position within the element.

        if (!isOutsideOfDisk(x, y)) {
            mouse_coords.push(vec4(x, y, x, e.clientY - rect.top));
        }
    }

    function isOutsideOfDisk(x, y) {
        return disk_radius * disk_radius <
            (canvas.width / 2 - x) * (canvas.width / 2 - x) + (canvas.height / 2 - y) * (canvas.height / 2 - y)
    }
}

// Rendering functions
function clear_canvas() {
    ctx.fillStyle = "rgba(1,1,1,0.0)";
    ctx.clearRect(0, 0, particle_canvas.width, particle_canvas.height);

    gl.clearColor(0.968627451, 0.929411765, 0.88627451, 1);
    gl.clear(gl.COLOR_BUFFER_BIT)
}

function draw_bacterias() {
    gl.useProgram(bacteriaProgram);

    var bacteriaVerticies = [];
    Bacteria.allBacterias.forEach(bacteria => {
        bacteriaVerticies.push(...bacteria.generateVerticies());
    })

    var bacteriaBufferObj = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bacteriaBufferObj);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bacteriaVerticies), gl.STATIC_DRAW);
    var bacteriaPosAttrLocation = gl.getAttribLocation(bacteriaProgram, 'v_position');
    gl.vertexAttribPointer(
        bacteriaPosAttrLocation, //attribute location
        2, //number of elements per attribute
        gl.FLOAT,
        gl.FALSE,
        5 * Float32Array.BYTES_PER_ELEMENT,//size of an individual vertex
        0 * Float32Array.BYTES_PER_ELEMENT//offset from the beginning of a single vertex to this attribute
    );
    var bacteriaColorAttrLocation = gl.getAttribLocation(bacteriaProgram, 'v_color');
    gl.vertexAttribPointer(
        bacteriaColorAttrLocation, //attribute location
        3, //number of elements per attribute
        gl.FLOAT,
        gl.FALSE,
        5 * Float32Array.BYTES_PER_ELEMENT,//size of an individual vertex
        2 * Float32Array.BYTES_PER_ELEMENT//offset from the beginning of a single vertex to this attribute
    );

    gl.enableVertexAttribArray(bacteriaPosAttrLocation);
    gl.enableVertexAttribArray(bacteriaColorAttrLocation);

    gl.drawArrays(gl.TRIANGLES, 0, bacteriaVerticies.length / 5 * 2);
}

function draw_disk() {
    gl.useProgram(diskProgram);

    var diskBufferObj = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, diskBufferObj);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(disk_verts), gl.STATIC_DRAW);
    var diskPosAttrLocation = gl.getAttribLocation(diskProgram, 'v_position');
    gl.vertexAttribPointer(
        diskPosAttrLocation, //attribute location
        2, //number of elements per attribute
        gl.FLOAT,
        gl.FALSE,
        2 * Float32Array.BYTES_PER_ELEMENT,//size of an individual vertex
        0 * Float32Array.BYTES_PER_ELEMENT//offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(diskPosAttrLocation);
    var widthHandle = gl.getUniformLocation(diskProgram, "center_x");
    var heightHandle = gl.getUniformLocation(diskProgram, "center_y");
    var radiusHandle = gl.getUniformLocation(diskProgram, "radius");

    gl.uniform1f(widthHandle, canvas.width / 2);
    gl.uniform1f(heightHandle, canvas.height / 2);
    gl.uniform1f(radiusHandle, disk_radius);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function draw_particles() {
    Particle.allParticles.forEach(particle => {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${particle.color[0]}, ${particle.color[1]}, ${particle.color[2]}, ${particle.transparency})`;
        // Draws a circle of radius 20 at the coordinates 100,100 on the canvas
        ctx.arc(particle.center_x, particle.center_y, particle.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    });
}

// Classes
class Bacteria {
    static allBacterias = [];

    constructor(center_x, center_y, radius, color = vec3(1.0, 0.0, 0.0)) {
        this.spawn_time = Date.now();
        this.center_x = center_x;
        this.center_y = center_y;
        this.radius = radius;
        this.next_radius = radius;
        this.color = color;
    }

    static generateRandomBacteria(radius = 0) {
        var bacteria;
        var done = false;
        while (!done) {
            var point = getRandomPointOnCircumference(canvas.width / 2, canvas.height / 2, disk_radius);
            bacteria = new Bacteria(point[0], point[1], radius > 0 ? radius : randomBetweenInterval(5, 50), Bacteria.getRandomColor());

            done = true;
            for (var i = 0; i < Bacteria.allBacterias.length; i++) {
                if (bacteria.collideWith(Bacteria.allBacterias[i]))
                    done = false;
            }
        }
        return bacteria;
    }

    static getRandomColor() {
        return rgbTopercentage(hslToRgb(Math.random(), 0.25 + 0.7 * Math.random(), 0.7 + 0.1 * Math.random()));
    }

    updateRadius(rate) {
        if (this.next_radius > this.radius) {
            this.radius += Math.min(rate, this.next_radius - this.radius);
        } else if (this.next_radius < this.radius) {
            this.radius -= Math.min(rate, this.radius - this.next_radius);
        }
    }

    collideWith(other) {
        return ((this.radius + other.radius) * (this.radius + other.radius)) > (
            (this.center_x - other.center_x) * (this.center_x - other.center_x) +
            (this.center_y - other.center_y) * (this.center_y - other.center_y)
        );
    }

    collideWithPoint(x, y) {
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

class Particle {
    static allParticles = [];

    constructor(
        center_x, center_y, radius = Math.floor(Math.random() * 10 + 5),
        vx = (Math.random() - 0.5) * 5, vy = (Math.random() - 0.5) * 5,
        color = hslToRgb(Math.random(), 0.25 + 0.7 * Math.random(), 0.7 + 0.1 * Math.random())
    ) {
        this.center_x = center_x;
        this.center_y = center_y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
        this.transparency = 1;
        this.spawn_time = Date.now();
        this.decay_rate = Math.random() * 800;
    }

    update() {
        this.center_x += this.vx;
        this.center_y += this.vy;

        var time_diff = Date.now() - this.spawn_time;
        if (this.transparency != 0.0 && time_diff < this.decay_rate) {
            this.transparency = 1 - (time_diff / this.decay_rate);
        } else {
            this.transparency = 0.0;
        }
    }
}

// Helpers
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

function randomBetweenInterval(min, max) { // min and max included 
    return Math.random() * (max - min + 1) + min;
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
        gl_FragColor = vec4(0.42745098, 0.407843137, 0.458823529, 1.0);
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