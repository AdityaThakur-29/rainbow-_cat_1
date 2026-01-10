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
// parse stored best as integer to ensure numeric comparisons
let best = parseInt(localStorage.getItem("best") || "0", 10);
let groundX = 0;

/* ================== CAT ================== */
const cat = {
  x: 80,
  y: 240,
  w: 50,
  h: 30,
  gravity: 0.1,
  jump: -3,
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
  speed: 2,
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

/* ================== RAINBOW TRAIL ================== */
const rainbowTrail = {
  particles: [],
  maxLife: 40, // frames
  hue: 0,
  spawnRate: 1, // particles per update (can be fractional if desired)

  spawn(x, y) {
    this.particles.push({
      x,
      y,
      life: this.maxLife,
      hue: this.hue
    });
    this.hue = (this.hue + 8) % 360; // step hue for rainbow
  },

  update() {
    // move particles left with the pipes speed and let them fall slightly
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x -= pipes.speed; // follow world movement
      p.y += 0.2; // slight downward drift
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  },

  draw() {
    // draw soft circles with alpha from life
    for (const p of this.particles) {
      const alpha = p.life / this.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${p.hue}, 100%, 50%)`;
      const r = 8; // radius
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

/* ================== RAINBOW PIXEL TEXT HELPERS ================== */
// replaced: drawRainbowPixelText — now draws tiled-pattern text (inspired by background) with subtle shadow + stroke
function drawRainbowPixelText(text, cx, cy, opts = {}) {
	const font = opts.font || "Arial";
	const fontSize = opts.fontSize || 24;
	const color = opts.color || "#FFFFFF";
	const align = opts.align || "center";
	const shadowColor = opts.shadowColor || "rgba(0,0,0,0.6)";
	const shadowBlur = (typeof opts.shadowBlur === "number") ? opts.shadowBlur : Math.max(6, Math.floor(fontSize / 6));
	const strokeColor = opts.strokeColor || "rgba(0,0,0,0.6)";
	const strokeWidth = (typeof opts.strokeWidth === "number") ? opts.strokeWidth : Math.max(2, Math.floor(fontSize / 12));

	ctx.save();
	ctx.imageSmoothingEnabled = false;
	ctx.font = `${fontSize}px ${font}`;
	ctx.textAlign = align;
	ctx.textBaseline = "middle";

	// Create a repeating pattern from background if available, otherwise fallback to solid color
	let fillStyle = color;
	if (assets.bg && assets.bg.complete) {
		try {
			const pattern = ctx.createPattern(assets.bg, "repeat");
			if (pattern) fillStyle = pattern;
		} catch (e) {
			fillStyle = color;
		}
	}

	// Draw shadowed filled text (pattern or color)
	ctx.shadowColor = shadowColor;
	ctx.shadowBlur = shadowBlur;
	ctx.fillStyle = fillStyle;
	ctx.fillText(String(text), cx, cy);

	// Draw a dark stroke on top for contrast and crispness
	ctx.shadowBlur = 0;
	ctx.shadowColor = "transparent";
	ctx.lineWidth = strokeWidth;
	ctx.strokeStyle = strokeColor;
	ctx.strokeText(String(text), cx, cy);

	ctx.restore();
}

/* ================== GAME OVER ================== */
function gameOver() {
  if (state !== "PLAY") return;
  state = "OVER";
  assets.sounds.hit.play().catch(() => {});
  assets.sounds.gameover.play().catch(() => {});
  best = Math.max(score, best);
  // store as string explicitly
  localStorage.setItem("best", String(best));
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

  // spawn trail at the cat's center while playing
  const cx = cat.x + cat.w / 2;
  const cy = cat.y + cat.h / 2;
  // spawn one particle per update; tweak spawnRate if needed
  rainbowTrail.spawn(cx, cy);

  rainbowTrail.update();

  groundX = (groundX - pipes.speed) % GAME_WIDTH;

  if (cat.y + cat.h >= GAME_HEIGHT - GROUND_HEIGHT || cat.y < 0) {
    gameOver();
  }
}

/* ================== DRAW ================== */
function draw() {
	// draw the full scene normally first
	ctx.drawImage(assets.bg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
	pipes.draw();

	// draw trail before the cat so it appears behind
	rainbowTrail.draw();

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

	// If game over, blur the whole screen by capturing current canvas and redrawing blurred
	if (state === "OVER") {
		// capture current canvas to offscreen
		const off = document.createElement("canvas");
		off.width = GAME_WIDTH;
		off.height = GAME_HEIGHT;
		const offCtx = off.getContext("2d");
		offCtx.imageSmoothingEnabled = false;
		offCtx.drawImage(canvas, 0, 0);

		// clear main canvas and draw blurred snapshot
		ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
		ctx.save();
		ctx.filter = "blur(6px)";
		ctx.drawImage(off, 0, 0);
		ctx.filter = "none";
		// darken a bit on top of blurred scene
		ctx.fillStyle = "rgba(0,0,0,0.25)";
		ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
		ctx.restore();
	}

	// Score - rainbow pixel at top center (no backdrop)
	const scoreText = String(score);
	const scoreFontSize = 20;
	const scoreScale = 3;
	drawRainbowPixelText(scoreText, GAME_WIDTH / 2, 50, {
		fontSize: scoreFontSize,
		pixelScale: scoreScale,
		hueShift: 0
	});

	// Overlay texts when game over (drawn sharp above blurred scene) — no black box behind them
	if (state === "OVER") {
		// show GAME OVER, current session SCORE and restart hint (BEST removed)
		const lines = ["GAME OVER", "SCORE " + score, "TAP TO RESTART"];
		const sizes = [34, 22, 16];
		const scales = [5, 4, 3];
		for (let i = 0; i < lines.length; i++) {
			const tx = GAME_WIDTH / 2;
			const ty = 250 + i * 44;
			drawRainbowPixelText(lines[i], tx, ty, {
				fontSize: sizes[i],
				pixelScale: scales[i],
				hueShift: 0,
				color: "#FFFFFF",
				shadowColor: "rgba(0,0,0,0.6)"
			});
		}
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
