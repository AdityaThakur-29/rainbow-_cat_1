/* ================== CANVAS ================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

/* ================== GAME SIZE ================== */
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

/* ================== DPI + RESPONSIVE ================== */
function resizeGame() {
  const dpr = window.devicePixelRatio || 1;

  // Set internal resolution (CRITICAL)
  canvas.width = GAME_WIDTH * dpr;
  canvas.height = GAME_HEIGHT * dpr;

  // Reset transform BEFORE scaling
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Fit canvas visually
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );

  canvas.style.width = GAME_WIDTH * scale + "px";
  canvas.style.height = GAME_HEIGHT * scale + "px";
  canvas.style.display = "block";
  canvas.style.margin = "auto";
}

window.addEventListener("resize", resizeGame);
window.addEventListener("orientationchange", resizeGame);
resizeGame();

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
assets.cat.src = "assets/cat.png";
assets.pipeTop.src = "assets/toppipr.png";
assets.pipeBottom.src = "assets/Bottompipe.png";

/* ================== GAME STATE ================== */
let state = "START";
let score = 0;
let best = localStorage.getItem("best") || 0;
let groundX = 0;

/* ================== CAT ================== */
const cat = {
  x: 80,
  y: 240,
  w: 60,
  h: 40,
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
    this.rotation = Math.max(-0.5, Math.min(0.5, this.velocity / 10));
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
    this.list.push({
      x: GAME_WIDTH,
      y: Math.random() * -200,
      scored: false
    });
  },

  update() {
    for (const p of this.list) {
      p.x -= this.speed;

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

      if (!p.scored && p.x + this.width < cat.x) {
        p.scored = true;
        score++;
        assets.sounds.score.play().catch(() => {});
      }
    }

    if (this.list.length && this.list[0].x < -this.width) {
      this.list.shift();
    }

    if (
      this.list.length === 0 ||
      GAME_WIDTH - this.list[this.list.length - 1].x >= PIPE_SPACING
    ) {
      this.spawn();
    }
  },

  draw() {
    for (const p of this.list) {
      ctx.drawImage(assets.pipeTop, p.x, p.y, this.width, this.height);
      ctx.drawImage(
        assets.pipeBottom,
        p.x,
        p.y + this.height + this.gap,
        this.width,
        this.height
      );
    }
  }
};

/* ================== GAME OVER ================== */
function gameOver() {
  if (state !== "PLAY") return;
  state = "OVER";
  assets.sounds.hit.play().catch(() => {});
  assets.sounds.gameover.play().catch(() => {});
  best = Math.max(score, best);
  localStorage.setItem("best", best);
}

const overlay = document.getElementById("overlay");

overlay.addEventListener("pointerdown", e => {
  e.preventDefault();

  // Hide overlay
  overlay.style.display = "none";

  // Start game
  if (state === "START") {
    state = "PLAY";
    score = 0;
    cat.reset();
    pipes.reset();
    pipes.spawn();
  }

  // Start loop if not started
  if (!started) {
    started = true;
    loop();
  }
});


/* ================== INPUT ================== */
function handleInput(e) {
  e.preventDefault();

  if (state === "START") {
    state = "PLAY";
    score = 0;
    cat.reset();
    pipes.reset();
    pipes.spawn();
  } else if (state === "PLAY") {
    cat.flap();
  } else if (state === "OVER") {
    state = "START";
  }
}

canvas.style.touchAction = "none";
canvas.addEventListener("pointerdown", handleInput);

document.addEventListener("keydown", e => {
  if (e.code === "Space") handleInput(e);
});

/* ================== UPDATE ================== */
function update() {
  if (state !== "PLAY") return;

  cat.update();
  pipes.update();

  groundX = (groundX - pipes.speed) % GAME_WIDTH;

  if (cat.y + cat.h >= GAME_HEIGHT - GROUND_HEIGHT || cat.y < 0) {
    gameOver();
  }
}

/* ================== DRAW ================== */
function draw() {
  ctx.drawImage(assets.bg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  pipes.draw();
  cat.draw();

  ctx.drawImage(
    assets.ground,
    groundX,
    GAME_HEIGHT - GROUND_HEIGHT,
    GAME_WIDTH,
    GROUND_HEIGHT
  );
  ctx.drawImage(
    assets.ground,
    groundX + GAME_WIDTH,
    GAME_HEIGHT - GROUND_HEIGHT,
    GAME_WIDTH,
    GROUND_HEIGHT
  );

  ctx.fillStyle = "#fff";
  ctx.font = "28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(score, GAME_WIDTH / 2, 50);

  if (state === "OVER") {
    ctx.fillText("GAME OVER", GAME_WIDTH / 2, 260);
    ctx.fillText("BEST " + best, GAME_WIDTH / 2, 300);
    ctx.fillText("TAP TO RESTART", GAME_WIDTH / 2, 340);
  }
}

/* ================== LOOP (USER-GESTURE SAFE) ================== */
let started = false;

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener(
  "pointerdown",
  () => {
    if (!started) {
      started = true;
      loop();
    }
  },
  { once: true }
);
