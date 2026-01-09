/* ================== CANVAS ================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;


canvas.width = 360;
canvas.height = 640;

/* ================== CONSTANTS ================== */
const GROUND_HEIGHT = 90;
const PIPE_SPACING = 180;

/* ================== ASSETS ================== */
const assets = {
  bg: new Image(),
  ground: new Image(),
  cat: new Image(),
  pipeTop: new Image(),
  pipeBottom: new Image(),
  sounds: {
    flap: new Audio("assets/sounds/flap.wav"),
    score: new Audio("assets/sounds/score.wav"),
    hit: new Audio("assets/sounds/hit.wav"),
    gameover: new Audio("assets/sounds/gameover.wav")
  }
};

assets.bg.src = "assets/flappybirdbg.png";
assets.ground.src = "assets/ground.png";
assets.cat.src = "assets/cat.gif";
assets.pipeTop.src = "assets/toppipr.png";
assets.pipeBottom.src = "assets/Bottompipe.png";

/* ================== GAME STATE ================== */
let state = "START"; // START | PLAY | OVER
let score = 0;
let best = localStorage.getItem("best") || 0;
let groundX = 0;

/* ================== CAT ================== */
const cat = {
  x: 80,
  y: 240,
  w: 100,
  h: 52,
  gravity: 0.1,
  jump: -4, 
  velocity: 0,
  rotation: 0,

  flap() {
    this.velocity = this.jump;
    assets.sounds.flap.currentTime = 0;
    assets.sounds.flap.play().catch(() => {});
  },

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
    this.rotation = Math.min(Math.max(this.velocity / 10, -0.5), 0.5);
  },

  draw() {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.rotation);
    ctx.drawImage(assets.cat, -this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  },

  reset() {
    this.y = 240;
    this.velocity = 0; 
    this.rotation = 0;
  }
};

/* ================== PIPES ================== */
const pipes = {
  list: [],
  gap: 180,
  speed: 2.1,
  width: 60,
  height: 360,

  reset() {
    this.list = [];
  },

  spawn() {
    const y = Math.random() * -200;
    this.list.push({
      x: canvas.width,
      y: y,
      scored: false
    });
  },

  update() {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      p.x -= this.speed;

      // COLLISION
      if (
        cat.x < p.x + this.width &&
        cat.x + cat.w > p.x &&
        (
          cat.y < p.y + this.height ||
          cat.y + cat.h > p.y + this.height + this.gap
        )
      ) {
        gameOver();
      }

      // SCORE
      if (!p.scored && p.x + this.width < cat.x) {
        p.scored = true;
        score++;
        assets.sounds.score.currentTime = 0;
        assets.sounds.score.play().catch(() => {});
      }
    }

    // REMOVE OFFSCREEN PIPE
    if (this.list.length && this.list[0].x < -this.width) {
      this.list.shift();
    }

    // DISTANCE-BASED SPAWN (NO OVERLAP EVER)
    if (
      this.list.length === 0 ||
      canvas.width - this.list[this.list.length - 1].x >= PIPE_SPACING
    ) {
      this.spawn();
    }
  },

  draw() {
    this.list.forEach(p => {
      ctx.drawImage(
        assets.pipeTop,
        p.x,
        p.y,
        this.width,
        this.height
      );

      ctx.drawImage(
        assets.pipeBottom,
        p.x,
        p.y + this.height + this.gap,
        this.width,
        this.height
      );
    });
  }
};

/* ================== GAME OVER ================== */
function gameOver() {
  if (state !== "PLAY") return;

  state = "OVER";
  assets.sounds.hit.currentTime = 0;
  assets.sounds.hit.play().catch(() => {});
  assets.sounds.gameover.currentTime = 0;
  assets.sounds.gameover.play().catch(() => {});

  best = Math.max(score, best);
  localStorage.setItem("best", best);
}

/* ================== INPUT ================== */
function handleInput(e) {
  // Prevent screen scrolling/zooming on mobile when tapping
  if (e && e.type === "touchstart") {
    e.preventDefault();
  }

  if (state === "START") {
    state = "PLAY";
    score = 0;
    cat.reset();
    pipes.reset();
    pipes.spawn();
    document.getElementById("overlay").style.display = "none";
  }
  else if (state === "PLAY") {
    cat.flap();
  }
  else if (state === "OVER") {
    state = "START";
    document.getElementById("overlay").style.display = "block";
  }
}

// Keyboard Controls (Desktop)
document.addEventListener("keydown", e => {
  if (e.code === "Space") handleInput(e);
});

// Mobile & Mouse Controls
// { passive: false } allows us to use preventDefault() to stop scrolling
canvas.addEventListener("touchstart", handleInput, { passive: false });
canvas.addEventListener("mousedown", handleInput);

/* ================== UPDATE ================== */
function update() {
  if (state !== "PLAY") return;

  cat.update();
  pipes.update();

  groundX = (groundX - pipes.speed) % canvas.width;

  if (cat.y + cat.h >= canvas.height - GROUND_HEIGHT || cat.y < 0) {
    gameOver();
  }
}

/* ================== DRAW ================== */
function drawPixelNeonText(text, x, y, size = 32) {
  const gradient = ctx.createLinearGradient(x - 120, y, x + 120, y);
  gradient.addColorStop(0, "#ff004c");
  gradient.addColorStop(0.2, "#ff9900");
  gradient.addColorStop(0.4, "#ffee00");
  gradient.addColorStop(0.6, "#00ff88");
  gradient.addColorStop(0.8, "#00aaff");
  gradient.addColorStop(1, "#b400ff");

  ctx.font = `${size}px 'Press Start 2P', monospace`;
  ctx.textAlign = "center";
  ctx.fillStyle = gradient;

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000";

  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 8;

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  ctx.shadowBlur = 0;
}



function draw() {
  ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);

  pipes.draw();
  cat.draw();

  // Ground
  ctx.drawImage(
    assets.ground,
    groundX,
    canvas.height - GROUND_HEIGHT,
    canvas.width,
    GROUND_HEIGHT
  );
  ctx.drawImage(
    assets.ground,
    groundX + canvas.width,
    canvas.height - GROUND_HEIGHT,
    canvas.width,
    GROUND_HEIGHT
  );

  // Score
  ctx.fillStyle = "#fff";
  ctx.font = "32px Arial";
  ctx.fillText(score, canvas.width / 2 - 10, 50);

  drawPixelNeonText(score, canvas.width / 2, 52, 32);

if (state === "OVER") {
  drawPixelNeonText("GAME OVER", canvas.width / 2, 260, 24);
  drawPixelNeonText("BEST " + best, canvas.width / 2, 300, 18);
  drawPixelNeonText("TAP TO RESTART", canvas.width / 2, 340, 14);
}

}

/* ================== LOOP ================== */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
