// ========================= CONSTANTS ========================= 
const GAME_STATES = {
  MENU: "menu",
  PLAYING: "playing",
  GAME_OVER: "gameover",
  TUTORIAL: "tutorial"
};

const PLAYER_STATES = {
  IDLE: "idle",
  AIR: "air",
  DASH: "dash",
  HURT: "hurt"
};

const ENEMY_SPAWNS = [
  {x:255, y:275},
  {x:925, y:275},
  {x:575, y:75},
  {x:75, y:675},
  {x:1075, y:675}
];

let platforms;

const GRAVITY = 0.8;
const MOVE_SPEED = 8;
const JUMP_FORCE = 18;
const DASH_SPEED = 20;
const DASH_DURATION = 8;
const DASH_RECHARGE_TIME = 72;
const HURT_IFRAMES = 45; 
const KNOCKBACK_X = 6;
const KNOCKBACK_Y = 8;
const MIN_SPAWN_DIST_FROM_PLAYER = 200;


// ========================= GLOBALS =========================
let canvas;
let gameState = GAME_STATES.MENU; // 0 = preGame, 1 = gameStart, 2 = gameOver
let gameTime = 0; // in seconds
let spawnTimer = 0;
let spawnCooldown = 120;
let debug = true;
let hitstop = 0;
let shake = 0;
let score = 0;
let enemiesKilled = 0;
let finalScore = 0;
let tutorialStep;
let tutorialTimer = 0;
let tutorialMessage = "";
let paintbrush= null;

let bgImage;
let playerImg, rusherImg, throwerImg, bomberImg;
let sfxShoot, sfxDash, sfxHurt, sfxKill;


let playerX = 600;
let playerY = 700;
let playerW = 30;
let playerH = 50;

let bullets = [];
let enemies = [];
let enemyProjectiles = [];
let bloodParticles = [];
let splatters = [];

let difficulty = {
  spawnInterval: 120,
  rusherChance: 0.9,
  throwerChance: 0.1,
  bomberChance: 0.0,
  speedMultiplier: 1,
  throwRateMultiplier: 1
};

let input = {
  left: false,
  right: false,

  jumpPressed: false,
  dashPressed: false,
  shootPressed: false,
};


// ==================== P5.JS LIFECYCLE ====================

function preload() {
  bgImage;
  playerImg = loadImage('assets/player.png');
  bomberImg = loadImage('assets/bomber.png');
  rusherImg = loadImage('assets/rusher.png');
  throwerImg = loadImage('assets/thrower.png');

  sfxShoot = loadSound('assets/shootsound.wav');
  sfxDash = loadSound('assets/dashsound.wav');
  sfxHurt = loadSound('assets/hurtsound.wav');
  sfxKill = loadSound('assets/killsound.wav');
}

function setup() {
  canvas = createCanvas(1200, 800);  

  colorMode(RGB, 255);

  platforms = [
  {x:240, y:705, w:120, h: 60},
  {x:50, y:750, w:100, h: 15},
  {x:840, y:685, w:120, h: 80},
  {x:1050, y:705, w:100, h: 60},
  {x:0, y:765, w:width, h:30}, // floor
  {x:90, y:535, w:370, h:30},
  {x:715, y:535, w:370, h:30},
  {x:150, y:350, w:200, h: 30},
  {x:850, y:350, w:500, h:30},
  {x:450, y:175, w:300, h:30}
  ]

  drawMenu();
}

function draw() {

  background(220);
  
  switch (gameState) {
    case GAME_STATES.MENU:
      drawMenu();
      break;
    case GAME_STATES.TUTORIAL:
      if (hitstop <= 0) updateTutorial();
      else hitstop--;
      drawTutorial();
      break;
    case GAME_STATES.PLAYING:
      if (hitstop <= 0)
        updateGame();
      else
        hitstop--;
      drawGame();
      break;
    case GAME_STATES.GAME_OVER:
      drawGameOver();
      break;
  }
}


// ==================== GAME STATE ==================== 

function drawMenu() {
  push();
  background(30);
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(50);
  text("PAINT THE WORLD", width / 2, height / 2 - 50);
  textSize(20);
  text("Press 'T' for Tutorial", width / 2, height / 2 + 20);
  text("Press 'SPACE' to Start Game", width / 2, height / 2 + 60);
  pop();
}

function startTutorial() {
  gameState = GAME_STATES.TUTORIAL;
  tutorialStep = 1;
  tutorialTimer = 0;
  score = 0;
  enemiesKilled = 0;

  platforms = [
    {x: 0, y: 700, w: 1200, h: 100}
  ];

  player = new Player(width / 2, 650);
  player.hasWeapon = false;

  bullets = [];
  enemies = [];
  enemyProjectiles = [];
  bloodParticles = [];
  splatters = [];
  hitstop = 0;
  shake = 0;
  paintbrush = null;
}

function updateTutorial() {
  gameTime++;
  
  input.left = keyIsDown(LEFT_ARROW);
  input.right = keyIsDown(RIGHT_ARROW);

  player.update();

  switch (tutorialStep) {
    case 1:
      tutorialMessage = "Use LEFT / RIGHT ARROWS to Move\nSPACE to Jump";
      if ((input.left || input.right) && player.isGrounded === false) {
        tutorialTimer++;
        if (tutorialTimer > 60) {
          tutorialStep = 2;
          tutorialTimer = 0;
        }
      }
      break;

    case 2:
      tutorialMessage = "This is your HP and DASH meter";
      tutorialTimer++;
      if (tutorialTimer > 150) {
        tutorialStep = 3;
        tutorialTimer = 0;
      }
      break;

    case 3:
      tutorialMessage = "Press L-SHIFT to Dash\n(Dashing makes you invincible)";
      tutorialTimer++;
      if (input.dashPressed && tutorialTimer > 180) {
        tutorialStep = 4;
        tutorialTimer = 0;
      }
      break;
    
    case 4:
      tutorialMessage = "Pick up the Paintbrush";
      if (!paintbrush && !player.hasWeapon) {
        paintbrush = new Paintbrush (600, 650);
      }

      if (paintbrush) {
        paintbrush.update(player);
        if (player.hasWeapon) {
          paintbrush = null;
          tutorialStep = 5;
          tutorialTimer = 0;
        }
      }
      break;

    case 5:
      tutorialMessage = "Press 'F' to shoot paint!";
      tutorialTimer++;
      if (input.shootPressed && tutorialTimer > 300) {
        tutorialStep = 6;
        tutorialTimer = 0;
      }
      break;

    case 6:
      if (tutorialTimer === 0) {
        player.hasWeapon = false;
        let e = new Rusher(800, 650); e.isDummy = true;
        enemies = [e];
      }
      tutorialMessage = "Rushers chase you down.";
      tutorialTimer++;
      if (tutorialTimer > 180) {
        tutorialStep = 7;
        tutorialTimer = 0; 
      }
      break;

    case 7:
      if (tutorialTimer === 0) {
        player.hasWeapon = false;
        let e = new Thrower(800, 650); e.isDummy = true;
        enemies = [e];
      }
      tutorialMessage = "Throwers attack from afar.";
      tutorialTimer++;
      if (tutorialTimer > 180) {
        tutorialStep = 8;
        tutorialTimer = 0;
      }
      break;

    case 8:
      if (tutorialTimer === 0) {
        player.hasWeapon = false;
        let e = new Bomber(800, 650); e.isDummy = true;
        enemies = [e];
      }
      tutorialMessage = "Bombers explode on contact";
      tutorialTimer++;
      if (tutorialTimer > 180) {
        tutorialStep = 9;
        tutorialTimer = 0;
      }
      break;

    case 9:
      if (tutorialTimer === 0) {
        player.hasWeapon = true;
        let e1 = new Rusher(500, 650); e1.isDummy = true;
        let e2 = new Thrower(700, 650); e2.isDummy = true;
        let e3 = new Bomber(900, 650); e3.isDummy = true;
        enemies = [e1, e2, e3];
        tutorialTimer++;
      }
      tutorialMessage = "Defeat the Dummies!";
      if (enemies.length === 0) {
        tutorialStep = 10;
        tutorialTimer = 0;
      }
      break;

    case 10:
      tutorialMessage = "Tutorial Complete!\nPress SPACE to return to the Menu.";
      if (input.jumpPressed) {
        gameState = GAME_STATES.MENU;
      }
      break;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    if (bullets[i].isExpired()) bullets.splice(i, 1);
  }
    checkBulletCollisions();

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    if (enemies[i].dead) enemies.splice(i, 1);
  }

  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    bloodParticles[i].update();
    if (bloodParticles[i].isDead()) {
      createSplatter(bloodParticles[i].x, bloodParticles[i].y, random(6, 12), bloodParticles[i].col);
      bloodParticles.splice(i, 1);
    }
  }

  input.jumpPressed = false;
  input.dashPressed = false;
  input.shootPressed = false;
  
}

function drawTutorial() {
  background(240);


  push();
  translate(random(-shake, shake), random(-shake, shake));
  shake *= 0.85;

  for (let s of splatters) {
    s.update();
    s.draw();
  }

  drawMap();

  for (let p of bloodParticles) p.draw();

  player.draw();

  for (let e of enemies) e.draw();
  for (let b of bullets) b.draw();
  if (paintbrush) paintbrush.draw();

  pop();

  drawUI();

  if (tutorialStep === 2) {
    push();
    noFill();
    let pulse = 150 + sin(frameCount * 0.1) * 105;
    stroke(255, 0, 0, pulse);
    strokeWeight(4);
    rect(15, 15, 160, 55, 4);
    pop();
  }

  push();
  textAlign(CENTER, CENTER);
  fill(0);
  noStroke();
  textSize(32);
  text(tutorialMessage, width / 2, height / 2 - 100);
  pop();
}



function startNewGame() {
  // Initializing game variables
  gameTime = 0;
  score = 0;
  enemiesKilled = 0;
  finalScore = 0;

  platforms = [
  {x:240, y:705, w:120, h: 60},
  {x:50, y:750, w:100, h: 15},
  {x:840, y:685, w:120, h: 80},
  {x:1050, y:705, w:100, h: 60},
  {x:0, y:765, w:width, h:30}, // floor
  {x:90, y:535, w:370, h:30},
  {x:715, y:535, w:370, h:30},
  {x:150, y:350, w:500, h: 30},
  {x:850, y:350, w:200, h:30},
  {x:450, y:175, w:300, h:30}
  ];

  bullets = [];
  enemies = [];
  enemyProjectiles= [];
  bloodParticles = [];
  splatters = [];
  player = new Player (playerX, playerY);
  player.hasWeapon = true;
  
  gameState = GAME_STATES.PLAYING;
}

function updateGame() {
  gameTime++;
  spawnTimer++;
  updateDifficulty();
  if (gameTime % 60 === 0) score += 10;

  if (spawnTimer >= difficulty.spawnInterval) {
    spawnEnemy();
    spawnTimer = 0;
  }

  input.left = keyIsDown(LEFT_ARROW);
  input.right = keyIsDown(RIGHT_ARROW);
  
  player.update();

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    if (bullets[i].isExpired()) {
      bullets.splice(i, 1);
    }
  }

  checkBulletCollisions();

  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    let p = enemyProjectiles[i];
    p.update();

    if (
      p.x > player.x &&
      p.x < player.x + player.w &&
      p.y > player.y &&
      p.y < player.y + player.h &&
      !player.isInvincible
    ) {
      player.takeDamage();
      enemyProjectiles.splice(i, 1);
      continue;
    }

    if (p.life <= 0) {
      enemyProjectiles.splice(i, 1);
    }
  }


  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();

    if (enemies[i].dead) {
      enemies.splice(i, 1);
    }
  }

  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    bloodParticles[i].update();

    if (bloodParticles[i].isDead()) {
      createSplatter(
        bloodParticles[i].x,
        bloodParticles[i].y,
        random(6, 12),
        bloodParticles[i].col
      );
      bloodParticles.splice(i, 1);
    
    }
  }

  input.jumpPressed = false;
  input.dashPressed = false;
  input.shootPressed = false;

  if (player.isDead) {
    enterGameOver();
  }
}

function drawGame() {

  push();

  translate(
    random(-shake, shake),
    random(-shake, shake)
  );
  shake *= 0.85;
  
  stroke(0);
  strokeWeight(4);
  noFill();
  rect(0, 0, width, height);

  for (let s of splatters) {
    s.update();
    s.draw();
  }
  
  drawMap();
  
  for (let p of bloodParticles) {
    p.draw();
  }

  for (let e of enemies) {
    e.draw();
  }

  for (let b of bullets) {
    b.draw();
  }

  for (let p of enemyProjectiles) {
    p.draw();
  }
    
  player.draw();

  pop();

  resetMatrix();
  
  drawUI();

  // if (debug) drawDebug();
}

function drawGameOver() {
  background(30);
  push();
  fill(255);
  textAlign(CENTER, CENTER);

  textSize(40);
  text("GAME OVER", width / 2, height / 2 - 80);

  textSize(20);
  text(`Final Score: ${finalScore}`, width / 2, height / 2 - 20);
  text(`Enemies Killed: ${enemiesKilled}`, width / 2, height / 2+ 20);
  text(`Time Survived: ${floor(gameTime / 60)}s`, width / 2, height / 2 + 60);

  textSize(14);
  text("Press SPACE to Restart", width / 2, height / 2 + 120);
  text("Press 'M' to Return to Menu", width / 2, height / 2 + 150);
  pop();
}

function enterGameOver() {
  finalScore = score + floor(gameTime / 60) * 20;
  gameState = GAME_STATES.GAME_OVER;
}

function spawnEnemy() {
  let s;
  let attempts = 0;
  const maxAttempts = 20;

  do {
    s = random(ENEMY_SPAWNS);
    attempts++;
    
    if (attempts >= maxAttempts) return;

    let dx = (s.x + 30 / 2) - (player.x + player.w / 2);
    let dy = (s.y + 50 / 2) - (player.y + player.h / 2);
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MIN_SPAWN_DIST_FROM_PLAYER) {
      continue;
    }

    break;
  } while (true);
  
  let x = s.x + random(-15, 15);
  let y = s.y + random(-15, 15);

  let roll = random();

  if (roll < difficulty.rusherChance) 
    enemies.push(new Rusher(s.x, s.y));
  else if (roll < difficulty.rusherChance + difficulty.throwerChance) 
    enemies.push(new Thrower(s.x, s.y));
  else 
    enemies.push(new Bomber(s.x, s.y));
}

function createSplatter(x, y, baseSize, col = null) {
  if (!col) col = makeBloodColor();

  if (splatters.length > 1500) {
    splatters.shift();
  }

  splatters.push(
    new Splatter(x, y, baseSize * 2.2, col)
  );
}

function makeBloodColor() {
  push();
  colorMode(HSB, 360, 100, 100, 255);

  let h = random(0, 360);
  let s = random(70, 100);
  let b = random(50, 90);

  let col = color(h, s, b, 255);
  pop();
  colorMode(RGB, 255);

  return col;
}

function createBloodBurst(x, y, power, dirX = 0, dirY = 0, col = null) {

  if (!col) col = makeBloodColor();
  let count = floor(random(4, 6));

  for (let i = 0; i < count; i++) {
    bloodParticles.push(
      new BloodParticle(x, y, power, col, dirX, dirY)
    );
  }

  createSplatter(x, y, power * random(0.8, 1.2), col);
}

// Difficulty Scaling
function updateDifficulty() {
  let time = floor(gameTime / 60);
  let kills = enemiesKilled;

  // Early
  if (time < 90 && kills < 30) {
    difficulty.spawnInterval = 120;
    difficulty.rusherChance = 0.9;
    difficulty.throwerChance = 0.1;
    difficulty.bomberChance = 0.0;
    difficulty.speedMultiplier = 1;
    difficulty.throwRateMultiplier = 1;
  }

  // Mid
  else if (time < 180 && kills < 60) {
    difficulty.spawnInterval = random(72, 90);
    difficulty.rusherChance = 0.65;
    difficulty.throwerChance = 0.25;
    difficulty.bomberChance = 0.10;
    difficulty.speedMultiplier = 1.1;
    difficulty.throwRateMultiplier = 1.5;
  }

  // Late
  else if (time < 270 && kills < 120) {
    difficulty.spawnInterval = 60;
    difficulty.rusherChance = 0.5;
    difficulty.throwerChance = 0.3;
    difficulty.bomberChance = 0.2;
    difficulty.speedMultiplier = 1.3;
    difficulty.throwRateMultiplier = 2;
  }

  // End
  else {
    difficulty.spawnInterval = random(30, 42);
    difficulty.rusherChance = 0.5;
    difficulty.throwerChance = 0.3;
    difficulty.bomberChance = 0.2;
    difficulty.speedMultiplier = 1.5;
    difficulty.throwRateMultiplier = 2.5;
  }
}

// ==================== INPUT HANDLING ====================
function keyPressed() {
  if (gameState === GAME_STATES.MENU) {
    if (key === 't' || key === 'T') startTutorial();
    if (key === ' ') startNewGame();
    return false;
  }

  if (gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.TUTORIAL) {
    if (key === ' ') input.jumpPressed = true;
    if (keyCode === SHIFT) input.dashPressed = true;
    if (key === 'F' || key === 'f') input.shootPressed = true;
  }
  
  // Start new Game
  if (gameState === GAME_STATES.GAME_OVER) {
    if (key === ' ') startNewGame();
    if (key === 'm' || key === 'M') gameState = GAME_STATES.MENU;
  }
  return false;
}

// ==================== CLASSES ====================
// Player class
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 50;
    
    this.vx = 0;
    this.vy = 0;

    this.state = PLAYER_STATES.IDLE;
    this.facing = 1; // 1 for right, -1 for left

    this.isGrounded = true;
 
    this.health = 3;

    this.dashY = y;
    this.dashCharges = 3;
    this.maxDashCharges = 3;
    this.dashTimer = 0;
    this.dashCooldown = DASH_RECHARGE_TIME;
    this.hitFlash = 0;
    this.hasWeapon = false;

    this.hurtInvincible = false;
    this.dashInvincible = false;
    this.invincibilityTimer = 0;

    this.canShoot = true;
    this.shootCooldown = 1;
    this.shootTimer = 0;
  }

  get isInvincible() {
    return this.hurtInvincible || this.dashInvincible;
  }

  update() {
    switch(this.state) {
      case PLAYER_STATES.IDLE:
        this.updateIdle();
        break;
    
      case PLAYER_STATES.AIR:
        this.updateAir();
        break;
        
      case PLAYER_STATES.DASH:
        this.updateDash();
        break;
        
      case PLAYER_STATES.HURT:
        this.updateHurt();
        break;
    }
    
    this.applyPhysics();
    this.resolveWorldBounds();
    this.resolveCollisions();
    this.updateTimers();

    if (!this.canShoot) {
      this.shootTimer--;
      if (this.shootTimer <= 0) this.canShoot = true;
    }
  }

  shoot() {
    if (this.canShoot && this.hasWeapon) {
      bullets.push(
        new Bullet(
        this.x + this.w / 2,
        this.y + this.h / 2,
        this.facing
      )
    );
      sfxShoot.play(0, random(0.8, 1.2), 0.5);
      this.canShoot = false;
      this.shootTimer = this.shootCooldown;
    }
  }

  updateIdle() {
    this.handleHorizontalInput();

    if (!this.isGrounded) {
      this.state = PLAYER_STATES.AIR;
      return;
    }

    if (input.jumpPressed && this.isGrounded) {
      this.vy = -JUMP_FORCE;
      this.state = PLAYER_STATES.AIR;
    }

    if (input.dashPressed && this.dashCharges > 0) {
      this.startDash();
    }

    if (input.shootPressed) {
      this.shoot();
    }
  }

  updateAir() {
    this.handleHorizontalInput();

    if (this.isGrounded) {
      this.state = PLAYER_STATES.IDLE;
      return;
    }

    if (input.dashPressed && this.dashCharges > 0) { 
      this.startDash();
    }

    if (input.shootPressed) {
      this.shoot();
    }
  }

  updateDash() {
    this.dashTimer--;

    if (this.dashTimer <= 0) {
      this.dashInvincible = false;
      this.vx = 0;

      this.state = this.isGrounded ?
        PLAYER_STATES.IDLE :
        PLAYER_STATES.AIR;
      return;
    }
    this.y = this.dashY;
    this.vy = 0;

    if (input.shootPressed) {
      this.shoot();
    }
  }

  updateHurt() {
    this.handleHorizontalInput();
    
    if (input.jumpPressed && this.isGrounded) {
      this.vy = -JUMP_FORCE;
      this.state = PLAYER_STATES.AIR;
    }

    if (input.shootPressed) {
      this.shoot();
    }
  }

  updateTimers() {
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer--;
    } else {
      this.hurtInvincible = false;
      this.dashInvincible = false;
    }

    if (this.state === PLAYER_STATES.HURT) {
      this.state = this.isGrounded ? PLAYER_STATES.IDLE : PLAYER_STATES.AIR;
    }

    if (this.dashCharges >= this.maxDashCharges) {
      this.dashCooldown = 0;
    } else {
      if (this.dashCooldown > 0) {
        this.dashCooldown--;
      } else {
        this.dashCharges++;
        this.dashCooldown = DASH_RECHARGE_TIME;
      }
    }
  }

  startDash() {
    this.state = PLAYER_STATES.DASH;
    sfxDash.play();
    this.dashTimer = DASH_DURATION;
    this.dashCharges--;
    this.dashInvincible = true;
    this.invincibilityTimer = DASH_DURATION;
    this.dashY = this.y;
    this.vx = DASH_SPEED * this.facing;
    this.vy = 0;

    if (this.dashCharges < this.maxDashCharges && this.dashCooldown <= 0) {
      this.dashCooldown = DASH_RECHARGE_TIME;
    }
  }

  takeDamage(source = null, sourceX = null) {
    if (this.isInvincible) return;

    this.health--;
    sfxHurt.play(0, random(0.8, 1.2), 0.5);
    this.state = PLAYER_STATES.HURT;
    this.hitFlash = 10;

    if (this.isDead) this.die();

    this.hurtInvincible = true;
    this.invincibilityTimer = HURT_IFRAMES;

    if (source === "bomber") {
      let dir = 0;
      if (sourceX !== null) {
        dir = this.x < sourceX ? -1 : 1;
      } else {
        dir = -this.facing;
      }

      this.vx = dir * KNOCKBACK_X;
      this.vy = -KNOCKBACK_Y;
    } else {
      this.vx = 0;
      this.vy = 0;
    }
    
  }

  get isDead() {
    return this.health <= 0;
  }

  handleHorizontalInput() {
    this.vx = 0;

    if (input.left) {
      this.vx = -MOVE_SPEED;
      this.facing = -1;
    }

    if (input.right) {
      this.vx = MOVE_SPEED;
      this.facing = 1;
    }
  }

  applyPhysics() {
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
  }

 resolveCollisions() {
  this.isGrounded = false;

  const playerBottom = this.y + this.h;
  const playerLeft = this.x;
  const playerRight = this.x + this.w;

  for (let plat of platforms) {
    const platTop = plat.y;
    const platLeft = plat.x;
    const platRight = plat.x + plat.w;

    const isFalling = this.vy >= 0;

    const horizontallyAligned =
      playerRight > platLeft &&
      playerLeft < platRight;

    const wasAbovePlatform =
      playerBottom - this.vy <= platTop;

    const isLanding =
      isFalling &&
      horizontallyAligned &&
      wasAbovePlatform &&
      playerBottom >= platTop;

    if (isLanding) {
      this.y = platTop - this.h;
      this.vy = 0;
      this.isGrounded = true;
      return;
      }
    }
  }

  resolveWorldBounds() {
    // L-R Borders
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }
    if (this.x > width - this.w) {
      this.x = width - this.w;
      this.vx = 0;
    }

    // Ceiling
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
    }

  }
  
  die() {
    console.log("Player has died of death");
    // reset game states later
  }

  draw() {
    push();
    translate(this.x + this.w / 2, this.y + this.h / 2);
    scale(this.facing, 1);

    if (this.isInvincible) tint(255, 150);

    imageMode(CENTER);
    image(playerImg, 0, 0, this.w, this.h);

    // stroke(0);
    // strokeWeight(4);
    // rect(this.x, this.y, this.w, this.h);
    pop();
  }
}

// Bullet Class
class Bullet {
  constructor(x, y, direction) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.speed = 30;
    this.direction = direction;
    this.lifetime = 60;
  }

  update() {
    this.prevX = this.x;
    this.x += this.speed * this.direction;
    this.lifetime--;

    if (this.x < 0 || this.x > width) {
      this.lifetime = 0;
    }
  }

  isExpired() {
    return this.lifetime <= 0;
  }

  draw() {
    fill(255, 255, 0);
    stroke(100);
    strokeWeight(1);
    rect(this.x, this.y, 5, 3);
  }
}

// Enemy Class
class Enemy {
  constructor(x, y) {
    this.isGrounded = false;
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 50;

    this.vx = 0;
    this.vy = 0;

    this.health = 1;
    this.dead = false;

    this.bloodColor = makeBloodColor();
  }

  update() {
    this.prevY = this.y;
    this.applyPhysics();
    this.resolveCollisions();

    if (this.y > height + 200) {
      this.dead = true;
    }
  }

  applyPhysics() {
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
  }

  resolveCollisions() {
    this.isGrounded = false;

    const prevBottom = this.prevY + this.h;
    const currBottom = this.y + this.h;
 
    for (let plat of platforms) {
      const platTop = plat.y;
      const platLeft = plat.x;
      const platRight = plat.x + plat.w;

      const horizontallyAligned =
        this.x + this.w > platLeft &&
        this.x < platRight;

      const isFalling = this.vy >= 0;

      const crossedPlatform =
        isFalling &&
        prevBottom <= platTop &&
        currBottom >= platTop;

      if (horizontallyAligned && crossedPlatform) {
        this.y = platTop - this.h;
        this.vy = 0;
        this.isGrounded = true;
        return;
      }
    }
  }

  takeDamage() {
    this.health--;
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    createBloodBurst(
      this.x + this.w / 2,
      this.y + this.h / 2,
      12,
      0,
      0,
      this.bloodColor
    );

    if (!this.isDummy) sfxKill.play(0, random(0.8, 1.2), 0.5);

    enemiesKilled++;
    score += 100;

    this.dead = true;
  }

  draw() {
    push();
    image(rusherImg, this.x, this.y, this.w, this.h);
    pop();
  }
}

// Rusher Class
class Rusher extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.speed = 4;
    this.randomDir = random([-1, 1]);
    this.isDummy = false;
  }

  update() {
    if (this.isDummy) {
      super.update();
      return;
    }
    const enemyPlat = getPlatformUnder(this);
    const playerPlat = getPlatformUnder(player);
    const shouldTrack = !player.hurtInvincible;
    let dir = 0;

    if (enemyPlat === playerPlat && shouldTrack) {
      dir = player.x < this.x ? -1 : 1;
    } else {
      if (frameCount % 60 === 0) {
        this.randomDir = random([-1, 1]);
      }
      dir = this.randomDir;
      if (playerPlat && enemyPlat && playerPlat.y < enemyPlat.y && this.isGrounded) {
        const playerCenterX = player.x + player.w / 2;
        const enemyCenterX = this.x + this.w / 2;
        if (abs(playerCenterX - enemyCenterX) < 10) {
          this.vy = -JUMP_FORCE;
        }
      }
    }

    this.vx = dir * this.speed * difficulty.speedMultiplier;

    if (this.x <= 0) this.randomDir = 1;
    if (this.x >= width - this.w) this.randomDir = -1;

    super.update();

    if (this.checkPlayerCollision() && !player.isInvincible) {
      player.takeDamage();
    }

    this.x = constrain(this.x, 0, width - this.w);
  }

  checkPlayerCollision() {
    return (
      this.x < player.x + player.w &&
      this.x + this.w > player.x &&
      this.y < player.y + player.h &&
      this.y + this.h > player.y
    );
  }
}

// EnemyProjectile class
class EnemyProjectile {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx; 
    this.vy = vy;
    this.life = 120;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw() {
    push();
    stroke(255, 0, 0);
    strokeWeight(4);
    fill(255, 255, 0);
    ellipse(this.x, this.y, 8, 8);
    pop();
  }
}

// Thrower Class
class Thrower extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.throwTimer = 120;
    this.projectileSpeed = 6;  
    this.isDummy = false;
  }

  update() {
    if (this.isDummy) {
      super.update();
      return;
    }
    this.throwTimer--;

    if (this.throwTimer <= 0 && this.isGrounded) {
      let dx = player.x + player.w / 2 - (this.x + this.w / 2);
      let dy = player.y + player.h / 2 - (this.y + this.h / 2);
      let mag = sqrt(dx * dx + dy * dy);

      let vx = (dx / mag) * this.projectileSpeed;
      let vy = (dy / mag) * this.projectileSpeed;

      enemyProjectiles.push(
        new EnemyProjectile(
          this.x + this.w / 2,
          this.y + this.h / 2,
          vx, vy)
      );
      this.throwTimer = 120 / difficulty.throwRateMultiplier;
    }

    super.update();
  }

  draw() {
    push();
    image(throwerImg, this.x, this.y, this.w, this.h);
    pop();
  }
}

// Bomber Class
class Bomber extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.health = 2;
    this.explosionRadius = 80;
    this.speed = 2;
    this.armed = false;
    this.hasExploded = false;
    this.randomDir = random([-1, 1]);
    this.isDummy = false;
  }

  update() {
    if (this.isDummy) {
      super.update();
      return;
    }
    const enemyPlat = getPlatformUnder(this);
    const playerPlat = getPlatformUnder(player);
    const shouldTrack = !player.hurtInvincible;
    let dir = 0;

    if (enemyPlat === playerPlat && shouldTrack) {
      dir = player.x < this.x ? -1 : 1;
    } else {
      if (frameCount % 60 === 0) {
        this.randomDir = random([-1, 1]);
      }
      dir = this.randomDir;
      if (playerPlat && enemyPlat && playerPlat.y < enemyPlat.y && this.isGrounded) {
        const playerCenterX = player.x + player.w / 2;
        const enemyCenterX = this.x + this.w / 2;
        if (abs(playerCenterX - enemyCenterX) < 10) {
          this.vy = -JUMP_FORCE;
        }
      }
    }

    this.vx = dir * this.speed * difficulty.speedMultiplier;

    let d = dist(
      this.x + this.w / 2,
      this.y + this.h / 2,
      player.x + player.w / 2,
      player.y + player.h / 2
    );

    if (d < this.explosionRadius && !this.armed) {
      this.armed = true;
      this.explode();
      return;
    }
    super.update();

    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }
    if (this.x > width - this.w) {
      this.x = width - this.w;
      this.vx = 0;
    }
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
    }
    if (this.y > height + 200) {
      this.dead = true;
    }
  }

  explode() {
    if (this.hasExploded) return;
    this.hasExploded = true;

    let cx = this.x + this.w / 2;
    let cy = this.y + this.h / 2;

    if (!this.isDummy && !player.isInvincible) {
      let d = dist(
        cx, cy,
        player.x + player.w / 2,
        player.y + player.h / 2
      );

      if (d < this.explosionRadius) {
        player.takeDamage("bomber", cx);
      }
    }

    createSplatter(
      cx, cy,
      max(this.w, this.h) * 1.5,
      this.bloodColor
    );

    let numParticles = floor(random(12, 24));
    for (let i = 0; i < numParticles; i++) {
      bloodParticles.push(
        new BloodParticle(cx, cy, random(10, 22), this.bloodColor)
      );
    }

    this.dead = true;
  }

  die() {
   this.explode();
   if (!this.isDummy) sfxKill.play(0, 0.8, 2);
   enemiesKilled++;
   score += 200;
  }

  draw() {
    push();
    image(bomberImg, this.x, this.y, this.w, this.h);
    

    if (debug) {
      noFill();
      stroke(255, 100, 0, 120);
      ellipse(
        this.x + this.w / 2,
        this.y + this.h / 2,
        this.explosionRadius * 2
      )
    }
    pop();
  }
}

// Splatter Class
class Splatter {
  constructor(x, y, size, col) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.col = col;

    this.life = Infinity;

    this.points = [];

    let pointCount = floor(random(12, 24));
    for (let i = 0; i < pointCount; i++) {
      let angle = map(i, 0, pointCount, 0, TWO_PI);
      let radius = this.size * random(0.8, 2.4);
      this.points.push({
        x: cos(angle) * radius,
        y: sin(angle) * radius
      });
    }
  }

  update() {
    this.life--;
  }

  draw() {
    push();

    colorMode(HSB, 360, 100, 100, 255);

    translate(this.x, this.y);
    noStroke();
    fill(this.col);

    beginShape();
    for (let p of this.points) {
      vertex(p.x, p.y);
    }
    endShape(CLOSE);
    pop();
  }

  isDead() {
    return false;
  }
}

class BloodParticle {
  constructor(x, y, power, col, dirX = 0, dirY = 0) {
    this.x = x;
    this.y = y;

    let angle = random(TWO_PI);
    let speed = random(power * 0.3, power);

    this.vx = cos(angle) * speed + dirX * power * 0.8;
    this.vy = sin(angle) * speed + dirY * power * 0.5;

    this.size = random(3, 8);
    this.life = random(30, 60);
    this.col = col;
  }

  update() {
    this.vy += 0.3;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw() {
    push();
    colorMode(HSB, 360, 100, 100, 255);
    noStroke();
    fill(this.col);
    ellipse(this.x, this.y, this.size);
    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

class Paintbrush {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 40;
    this.bob = 0;
  }

  update(p) {
    this.bob = sin(frameCount * 0.1) * 10;

    if (dist(this.x, this.y, p.x, p.y) < 40) {
      p.hasWeapon = true;
    }
  }

  draw() {
    push();
    translate(this.x, this.y + this.bob);
    fill(200, 150, 100);
    rect(0, 0, 10, 30);
    fill(255, 0, 0);
    ellipse(5, 0, 20, 15);
    pop();
  }
}

// ==================== ARENA and DEBUG HELPERS ====================

function checkBulletCollisions() {
  for (let b = bullets.length - 1; b >= 0; b--) {
    const bullet = bullets[b];
    for (let e of enemies) {
      let withinY = bullet.y + 3 > e.y && bullet.y - 3 < e.y + e.h;
      let crossedX = (bullet.prevX <= e.x + e.w && bullet.x >= e.x) || (bullet.prevX >= e.x && bullet.x < e.x + e.w);
      if (withinY && crossedX) {
        hitstop = 3;
        shake = 6;
        createBloodBurst(e.x + e.w / 2, e.y + e.h / 2, 10, bullet.direction, -0.3, e.bloodColor);

        createSplatter(bullet.x, bullet.y, random(4, 6), e.bloodColor);

        e.takeDamage();
        bullets.splice(b, 1);
        break;
      }
    }
  }
}

function drawUI() {
  push();
  noStroke();

  drawPlayerUI();
  drawStatsUI();

  pop();
}

function drawPlayerUI() {
  const x = 20;
  const y = 20;

  let hpWidth = 150;
  let hpHeight = 16;

  fill(30);
  rect(x, y, hpWidth, hpHeight, 2);

  let hpPercent = player.health / 3;
  fill(220, 40, 40);
  rect(x, y, hpWidth * hpPercent, hpHeight);

  noFill();
  stroke(0);
  strokeWeight(2);
  rect(x, y, hpWidth, hpHeight, 2);

  if (player.hitFlash > 0) {
    fill(128, 128, 128, 120);
    rect(x, y, hpWidth, hpHeight);
    player.hitFlash--;
  }

  let dashY = y + 28;
  let segments = player.maxDashCharges;
  let gap = 6;

  let totalWidth = hpWidth;
  let segmentWidth = (totalWidth - gap * (segments - 1)) / segments;
  let segmentHeight = 14;

  for (let i = 0; i < segments; i++) {
    let dx = x + i * (segmentWidth + gap);

    fill(40);
    rect(dx, dashY, segmentWidth, segmentHeight);

    if (i < player.dashCharges) {
      fill(80, 180, 255);
      rect(dx, dashY, segmentWidth, segmentHeight);
    } else if (
        i === player.dashCharges &&
        player.dashCharges < player.maxDashCharges &&
        player.dashCooldown > 0) {

      let progress = 1 - (player.dashCooldown / DASH_RECHARGE_TIME);

      fill(80, 180, 255);
      rect(dx, dashY, segmentWidth * progress, segmentHeight);

      noFill();
      stroke(0);
      strokeWeight(2);
      rect(dx, dashY, segmentWidth, segmentHeight);
    }
  }

}

function drawStatsUI() {
  const margin = 20;
  const lineHeight = 22;

  let timeSurvived = floor(gameTime / 60);

  textSize(16);
  fill(0);
  noStroke();
  textAlign(RIGHT, TOP);

  let x = width - margin;
  let y = margin;

  text(`TIME ${timeSurvived}s`, x, y);
  text(`KILLS ${enemiesKilled}`, x, y + lineHeight);
  text(`SCORE ${score}`, x, y + lineHeight * 2);
}

function getPlatformUnder(entity) {
  let closest = null;
  let closestY = Infinity;

  for (let plat of platforms) {
    let horizontallyAligned =
      entity.x + entity.w > plat.x &&
      entity.x < plat.x + plat.w;
    
    let verticalDistance = plat.y - (entity.y + entity.h);

    if (horizontallyAligned && verticalDistance >= 0 && verticalDistance < closestY) {
      closest = plat;
      closestY = verticalDistance;
    }
  }
  return closest;
}
function drawMap() {
  stroke(0);
  strokeWeight(4);
  noFill();
  rect(0, 0, width, height);

  for (let plat of platforms) {
    rect(plat.x, plat.y, plat.w, plat.h);
  }
}

function centerCanvas() {
  var x = (windowWidth - width) / 2;
  var y = (windowHeight - height) / 2;
  canvas.position(x, y);
}

function drawDebug() {
  fill(0);
  strokeWeight(0);
  text("Debug Info", 50, 90);
  text(`State: ${player.state}`, 50, 110);
  text(`Direction: ${player.facing === 1 ? "right" : "left"}`, 50, 130);         
}

function resizeGame() {
  const baseWidth = 1200;
  const baseHeight = 800;

  const scaleX = windowWidth / baseWidth;
  const scaleY = windowHeight / baseHeight;

  const scale = Math.min(scaleX, scaleY);

  const newWidth = baseWidth * scale;
  const newHeight = baseHeight * scale;

  canvas.style("width", newWidth + "px");
  canvas.style("height", newHeight + "px");

  const x = (windowWidth - newWidth) / 2;
  const y = (windowHeight - newHeight) / 2;
  canvas.position(x, y);
}
