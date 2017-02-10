"use strict";

/////////////////////
// ### GLOBALS ### //
/////////////////////
var game;

//////////////////////////////
// ### KEYBOARD MANAGER ### //
//////////////////////////////
var KeyboardManager = function() {
    this.keys = {};
};

KeyboardManager.prototype.onKeyDown = function(event) {
    this.keys[event.key] = true;
};
KeyboardManager.prototype.onKeyUp = function(event) {
    this.keys[event.key] = false;
};

//////////////////////
// ### RENDERER ### //
//////////////////////
var Renderer = function() {
    this.canvas = null;
    this.context = null;
};

Renderer.prototype.init = function() {
     this.canvas = document.getElementById("canvas");
     this.context = this.canvas.getContext("2d");
};
Renderer.prototype.clear = function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
};
Renderer.prototype.drawRect = function(rect) {
    this.context.beginPath();
    this.context.rect(rect.x, rect.y, rect.w, rect.h);
    this.context.stroke();
};
Renderer.prototype.drawFilledRect = function(rect) {
    this.context.beginPath();
    this.context.fillRect(rect.x, rect.y, rect.w, rect.h);
    this.context.stroke();
};

///////////////////////
// ### RECTANGLE ### //
///////////////////////
var Rect = function(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
};

Rect.prototype.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
};
Rect.prototype.translate = function(dx, dy) {
    this.x += dx;
    this.y += dy;
};
Rect.prototype.grow = function(dw, dh) {
    this.w += dw;
    this.h += dh;
};
Rect.prototype.inflate = function(dw, dh) {
    this.translate(-dw, -dh);
    this.grow(2*dw, 2*dh);
};
Rect.prototype.colliding = function(other) {
    return !(this.x + this.w < other.x  ||
             this.y + this.h < other.y  ||
             this.x > other.x + other.w ||
             this.y > other.y + other.h);
};

/////////////////////////
// ### MOVING RECT ### //
/////////////////////////
var MovableRect = function(x, y, w, h, vx=0, vy=0) {
    Rect.call(this, x, y, w, h);
    this.vx = vx;
    this.vy = vy;
    
    this.lastX = x;
    this.lastY = y;
};
MovableRect.prototype = Object.create(Rect.prototype);
MovableRect.prototype.constructor = MovableRect;

MovableRect.prototype.setVelocity = function(vx, vy) {
    this.vx = vx;
    this.vy = vy;
};
MovableRect.prototype.accelerate = function(dvx, dvy) {
    this.vx += dvx;
    this.vy += dvy;
};
MovableRect.prototype.saveOldPosition = function() {
    this.lastX = this.x;
    this.lastY = this.y;
};
MovableRect.prototype.move = function() {
    this.saveOldPosition();
    this.translate(this.vx, this.vy);
};

////////////////////
// ### PLAYER ### //
////////////////////
var Player = function(x, y) {
    MovableRect.call(this, x, y, 50, 50);
};
Player.prototype = Object.create(MovableRect.prototype);
Player.prototype.constructor = Player;

Player.prototype.acceleration = 0.5;
Player.prototype.frictionMultiplier = 0.95;
Player.prototype.gravity = 0.5;
Player.prototype.jumpSpeed = 12;

Player.prototype.canJump = false; // Add some 'currently jumping' malarkey to get variable jump heights

Player.prototype.handleInput = function(keys) {
    if (keys.a) {
        this.accelerate(-this.acceleration, 0);
    }
    if (keys.d) {
        this.accelerate(this.acceleration, 0);
    }
    if (keys.w) {
        this.accelerate(0, -this.acceleration);
    }
    if (keys.s) {
        this.accelerate(0, this.acceleration);
    }
    if (keys[" "]) {
        if (this.canJump) {
            this.canJump = false;
            this.accelerate(0, -this.jumpSpeed);
        }
    }
    
    // FOR TESTING PURPOSES
    if (keys.r) {
        this.setPosition(200, 100);
        this.setVelocity(0, 0);
    }
};
Player.prototype.applyFriction = function() {
    this.vx *= this.frictionMultiplier;
};
Player.prototype.applyGravity = function() {
    this.vy += this.gravity;
};
Player.prototype.handleCollision = function(platform) {
    if (this.lastX + this.w <= platform.lastX) {
        this.x = platform.x - this.w;
        this.vx = 0;
    } else if (this.lastX >= platform.lastX + platform.w) {
        this.x = platform.x + platform.w;
        this.vx = 0;
    } else if (this.lastY + this.h <= platform.lastY) {
        this.y = platform.y - this.h;
        this.vy = 0;
        this.canJump = true;
    } else if (this.lastY >= platform.lastY + platform.h) {
        this.y = platform.y + platform.h;
        this.vy = 0;
    }
};
Player.prototype.update = function(map) {
    this.applyFriction();
    this.applyGravity();
    
    this.move();
    
    this.canJump = false;
    var collisions = map.getCollisions(this);
    for (var i=0; i<collisions.length; i++) {
        this.handleCollision(collisions[i]);
    }
};

//////////////////////
// ### PLATFORM ### //
//////////////////////
var Platform = function(x, y, w, h) {
    MovableRect.call(this, x, y, w, h);
};;
Platform.prototype = Object.create(MovableRect.prototype);
Platform.prototype.constructor = Platform;
Platform.prototype.update = function() {
    this.move();
};

/////////////////
// ### MAP ### //
/////////////////
var Map = function(platforms=[]) {
    this.platforms = platforms;
};

Map.prototype.add = function(platform) {
    this.platforms.push(platform);
};
Map.prototype.getCollisions = function(rect) {
    var collisions = [];
    for (var i=0; i<this.platforms.length; i++) {
        if (this.platforms[i].colliding(rect)) {
            collisions.push(this.platforms[i]);
        }
    }
    return collisions;
};
Map.prototype.update = function() {
    for (var i=0; i<this.platforms.length; i++) {
        this.platforms[i].update();
    }
};

//////////////////
// ### GAME ### //
//////////////////
var Game = function() {
    this.fps = 60;
    
    this.keyboardManager = new KeyboardManager();
    this.renderer = new Renderer();
    
    this.player = new Player(200, 200);
    
    this.currentMap = new Map([
        new Platform(100, 400, 150, 100),
        new Platform(150, 300, 50 , 50 ),
        new Platform(450, 300, 50 , 50 ),
        new Platform(150, 250, 350, 50 ),
        new Platform(400, 400, 150, 100),
        new Platform(650, 300, 100, 200),
        new Platform(50 , 500, 700, 100)
    ]);
};

Game.prototype.init = function() {
    this.renderer.init();
};
Game.prototype.mainLoop = function() {
    var boundLoop = this.mainLoop.bind(this);
    setTimeout(function() {requestAnimationFrame(boundLoop);}, 1000/this.fps);
    
    this.update();
    this.draw();
};
Game.prototype.update = function() {
    this.currentMap.update();
    
    this.player.handleInput(this.keyboardManager.keys);
    this.player.update(this.currentMap);
};
Game.prototype.draw = function() {
    this.renderer.clear();
    this.renderer.drawFilledRect(this.player);
    for (var i=0; i<this.currentMap.platforms.length; i++) {
        this.renderer.drawRect(this.currentMap.platforms[i]);
    }
};

window.onload = function() {
    game = new Game();
    game.init();
    game.mainLoop();
};