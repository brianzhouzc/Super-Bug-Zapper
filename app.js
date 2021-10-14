var playing = false;
var current_points = 0;
var highest_points = 0;


/** @type {HTMLCanvasElement} */
var canvas;

/** @type {HTMLCanvasElement} */
var particle_canvas;

/** @type {WebGLRenderingContext} */
var gl;

/** @type {CanvasRenderingContext2D} */
var ctx;

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
        gl.clearColor(0.968627451, 0.929411765, 0.88627451, 1);
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        if (playing) {
            logic();
            draw_bacterias();
        }
        draw_disk();

        window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);
}
window.onload = main;

var bacteriaProgram, diskProgram;
function init() {
    //Initialize webgl
    canvas = document.getElementById("glCanvas");
    particle_canvas = document.getElementById("particleCanvas");
    gl = canvas.getContext("webgl");
    ctx = particle_canvas.getContext("2d");

    ctx.beginPath();
    ctx.fillStyle = "black";
    // After setting the fill style, draw an arc on the canvas
    ctx.arc(100, 100, 10, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

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


    document.getElementById("start_button").onclick = start_game;
    particle_canvas.onmousedown = clickEvent;
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

var last_spawn = Date.now();
function logic() {

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
                        createParticle(coord[2], coord[3]);
                    }
                    Bacteria.allBacterias.splice(b_index, 1);
                    break;
                }
            }
        }
    }

    //Collision with other bacterias
    var toberemove = -1;
    for (var i = 0; i < Bacteria.allBacterias.length - 1; i++) {
        for (var j = i + 1; j < Bacteria.allBacterias.length; j++) {
            if (Bacteria.allBacterias[i].collideWith(Bacteria.allBacterias[j])) {
                Bacteria.allBacterias[j].next_radius = 0;
                Bacteria.allBacterias[i].next_radius += Bacteria.allBacterias[j].radius;

                //Bacteria.allBacterias[i].radius += Bacteria.allBacterias[j].radius;
                //toberemove = j;
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
        alert('Game Over! You got ' + current_points + ' points!');
        if (current_points > highest_points)
            highest_points = current_points;
        document.getElementById("highest_score").innerHTML = highest_points;
        playing = false;
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
        //bacteria.radius += radius_increment;
    })
}

var mouse_coords = [];
function clickEvent(e) {
    if (playing) {
        var rect = e.target.getBoundingClientRect();
        var x = e.clientX - rect.left; //x position within the element.
        var y = e.target.height - (e.clientY - rect.top);  //y position within the element.
        if (!isOutsideOfDisk(x, y)) {
            mouse_coords.push(vec4(x, y, e.clientX, e.clientY));
        }
    }
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

function isOutsideOfDisk(x, y) {
    return disk_radius * disk_radius <
        (canvas.width / 2 - x) * (canvas.width / 2 - x) + (canvas.height / 2 - y) * (canvas.height / 2 - y)
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

function createParticle(x, y) {
    const particle = document.createElement('particle');
    document.body.appendChild(particle);

    const size = Math.floor(Math.random() * 20 + 5);
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = `hsl(${Math.random() * 360}, ${25 + 70 * Math.random()}%, ${70 + 10 * Math.random()}%`;

    const destinationX = x + (Math.random() - 0.5) * 2 * 75;
    const destinationY = y + (Math.random() - 0.5) * 2 * 75;

    const animation = particle.animate([
        {
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
            opacity: 1
        },
        {
            transform: `translate(${destinationX}px, ${destinationY}px)`,
            opacity: 0
        }
    ], {
        duration: Math.random() * 1000 + 500,
        easing: 'cubic-bezier(0, .9, .57, 1)',
        delay: Math.random() * 200
    });

    animation.onfinish = () => {
        particle.remove();
    };
}

class Game {
    constructor() {
        this.playing = false;
        this.current_score = 0;
        this.highest_score = 0;
        this.game_over_amount = 2;

        this.mouse_coords = [];
        this.bacterias = [];
        this.bacteria_verticies = [];
    }

    logic() {
        if (this.playing) {

            //Process mouse events
            while (this.mouse_coords.length) {
                var coord = this.mouse_coords.shift();
                var b_index = this.bacterias.length;
                while (b_index--) {
                    if (this.bacterias[b_index].collideWithPoint(coord[0], coord[1])) {
                        var bacteria = this.bacterias[b_index];
                        Date.now() - bacteria.spawn_time;
                        this.current_score += Math.max(1, 10 - Math.ceil((Date.now() - bacteria.spawn_time) / 100));
                        document.getElementById("current_score").innerHTML = this.current_score;

                        for (var i = 0; i < 30; i++) {
                            createParticle(coord[2], coord[3]);
                        }
                        this.bacterias.splice(b_index, 1);
                        break;
                    }
                }
            }

            //Collision with other bacterias
            var toberemove = -1;
            for (var i = 0; i < this.bacterias.length - 1; i++) {
                for (var j = i + 1; j < this.bacterias.length; j++) {
                    if (this.bacterias[i].collideWith(this.bacterias[j])) {
                        this.bacterias[i].radius += this.bacterias[j].radius;
                        toberemove = j;
                        break;
                    }
                }
            }
            if (toberemove > -1)
                this.bacterias.splice(toberemove, 1);

            //Process gameover
            var count = 0;
            this.bacterias.forEach(bacteria => {
                if (bacteria.radius > 150) {
                    count++;
                }
            });
            if (count >= this.game_over_amount) {
                alert('Game Over! You got ' + this.current_score + ' points!');
                if (this.current_score > this.highest_score)
                    this.highest_score = this.current_score;
                document.getElementById("highest_score").innerHTML = this.highest_score;
                this.playing = false;
            }

            //Spawn more bacteria if below value
            var spawn_interval = Math.floor(randomBetweenInterval(300, 600));
            if (this.bacterias.length <= 10) {
                if (Date.now() - last_spawn > spawn_interval) {
                    this.bacterias.push(Bacteria.generateRandomBacteria());
                    last_spawn = Date.now();
                }
            }

            //Increment size
            var radius_increment = 0.5;
            this.bacterias.forEach(bacteria => {
                bacteria.radius += radius_increment;
            })

            //Generate verticies
            this.bacteria_verticies = [];
            this.bacterias.forEach(bacteria => {
                this.bacteria_verticies.push(bacteria.generateVerticies());
            })
        }
    }
}
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
    constructor(center_x, center_y, radius, vx, vy, color = vec3(1.0, 0.0, 0.0)) {
        this.center_x = center_x;
        this.center_y = center_y;
        this.radius = radius;
        this.color = color;
    }

    //Math.random() - 0.5) * 2 * 75
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