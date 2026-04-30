// Simple Pong game using canvas
(() => {
  const canvas = document.getElementById('game');
  const leftScoreEl = document.getElementById('leftScore');
  const rightScoreEl = document.getElementById('rightScore');
  const ctx = canvas.getContext('2d');

  // Set logical size and scale for high-DPI displays
  const LOGICAL_WIDTH = 800;
  const LOGICAL_HEIGHT = 500;
  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    canvas.style.width = LOGICAL_WIDTH + 'px';
    canvas.style.height = LOGICAL_HEIGHT + 'px';
    canvas.width = Math.floor(LOGICAL_WIDTH * ratio);
    canvas.height = Math.floor(LOGICAL_HEIGHT * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Game settings
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 100;
  const PADDLE_SPEED = 6; // keyboard speed
  const CPU_MAX_SPEED = 5; // max speed for computer paddle
  const BALL_RADIUS = 8;
  const WIN_SCORE = 10;
  let paused = true;

  // Game state
  const state = {
    leftPaddleY: (LOGICAL_HEIGHT - PADDLE_HEIGHT) / 2,
    rightPaddleY: (LOGICAL_HEIGHT - PADDLE_HEIGHT) / 2,
    leftScore: 0,
    rightScore: 0,
    ball: {
      x: LOGICAL_WIDTH / 2,
      y: LOGICAL_HEIGHT / 2,
      vx: 5,
      vy: 3,
    },
    keys: {
      up: false,
      down: false,
    }
  };

  // Helpers
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function resetBall(servingToRight = null) {
    state.ball.x = LOGICAL_WIDTH / 2;
    state.ball.y = LOGICAL_HEIGHT / 2;
    // Randomize angle
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // -22.5deg .. +22.5deg
    const speed = 5;
    // Decide direction: if servingToRight null, alternate towards last scorer; else use param
    let dir = (Math.random() < 0.5) ? 1 : -1;
    if (servingToRight === true) dir = 1;
    if (servingToRight === false) dir = -1;
    state.ball.vx = speed * dir * Math.cos(angle);
    state.ball.vy = speed * Math.sin(angle);
    paused = true;
    // short pause then unpause
    setTimeout(() => { paused = false; }, 600);
  }

  // Initial reset
  resetBall();

  // Input: mouse controls left paddle
  function getCanvasMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const y = evt.clientY - rect.top;
    // convert from CSS pixels to logical canvas coordinates (we set style size equal to logical)
    return { y: y };
  }
  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasMousePos(e);
    state.leftPaddleY = clamp(pos.y - PADDLE_HEIGHT / 2, 0, LOGICAL_HEIGHT - PADDLE_HEIGHT);
  });

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'Up') state.keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 'Down') state.keys.down = true;
    // space toggles pause
    if (e.key === ' ' || e.code === 'Space') {
      paused = !paused;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'Up') state.keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 'Down') state.keys.down = false;
  });

  // Click canvas to start/pause
  canvas.addEventListener('click', () => {
    paused = !paused;
  });

  // Main update
  function update() {
    if (!paused) {
      // Keyboard paddle moves
      if (state.keys.up) state.leftPaddleY -= PADDLE_SPEED;
      if (state.keys.down) state.leftPaddleY += PADDLE_SPEED;
      state.leftPaddleY = clamp(state.leftPaddleY, 0, LOGICAL_HEIGHT - PADDLE_HEIGHT);

      // Computer AI: track ball with max speed
      const cpuCenter = state.rightPaddleY + PADDLE_HEIGHT / 2;
      const diff = state.ball.y - cpuCenter;
      const move = clamp(diff * 0.12, -CPU_MAX_SPEED, CPU_MAX_SPEED);
      state.rightPaddleY = clamp(state.rightPaddleY + move, 0, LOGICAL_HEIGHT - PADDLE_HEIGHT);

      // Move ball
      state.ball.x += state.ball.vx;
      state.ball.y += state.ball.vy;

      // Top/bottom wall collision
      if (state.ball.y - BALL_RADIUS <= 0) {
        state.ball.y = BALL_RADIUS;
        state.ball.vy *= -1;
      } else if (state.ball.y + BALL_RADIUS >= LOGICAL_HEIGHT) {
        state.ball.y = LOGICAL_HEIGHT - BALL_RADIUS;
        state.ball.vy *= -1;
      }

      // Paddle collision helper: check rectangle collision
      function collidePaddle(px, py) {
        return state.ball.x - BALL_RADIUS < px + PADDLE_WIDTH &&
               state.ball.x + BALL_RADIUS > px &&
               state.ball.y + BALL_RADIUS > py &&
               state.ball.y - BALL_RADIUS < py + PADDLE_HEIGHT;
      }

      // Left paddle collision
      if (collidePaddle(0, state.leftPaddleY) && state.ball.vx < 0) {
        // place ball outside paddle to avoid sticking
        state.ball.x = PADDLE_WIDTH + BALL_RADIUS;
        // reflect horizontally
        state.ball.vx *= -1;
        // change vertical speed depending on hit position
        const relativeY = (state.ball.y - (state.leftPaddleY + PADDLE_HEIGHT / 2));
        const normalized = relativeY / (PADDLE_HEIGHT / 2); // -1..1
        const speed = Math.min(9, Math.hypot(state.ball.vx, state.ball.vy) + 0.3);
        const angle = normalized * (Math.PI / 3); // up to ~60 degrees
        state.ball.vx = speed * Math.cos(angle);
        state.ball.vy = speed * Math.sin(angle);
      }

      // Right paddle collision
      if (collidePaddle(LOGICAL_WIDTH - PADDLE_WIDTH, state.rightPaddleY) && state.ball.vx > 0) {
        state.ball.x = LOGICAL_WIDTH - PADDLE_WIDTH - BALL_RADIUS;
        state.ball.vx *= -1;
        const relativeY = (state.ball.y - (state.rightPaddleY + PADDLE_HEIGHT / 2));
        const normalized = relativeY / (PADDLE_HEIGHT / 2);
        const speed = Math.min(9, Math.hypot(state.ball.vx, state.ball.vy) + 0.3);
        const angle = normalized * (Math.PI / 3);
        state.ball.vx = -Math.abs(speed * Math.cos(angle));
        state.ball.vy = speed * Math.sin(angle);
      }

      // Score: ball out left or right
      if (state.ball.x + BALL_RADIUS < 0) {
        // Right scores
        state.rightScore += 1;
        rightScoreEl.textContent = state.rightScore;
        if (state.rightScore >= WIN_SCORE) {
          paused = true;
          // Show winner text by pausing and not resetting further; you can refresh to restart.
          setTimeout(() => alert('Computer wins! Refresh to play again.'), 50);
        } else {
          // serve to left (ball goes right)
          resetBall(true);
        }
      } else if (state.ball.x - BALL_RADIUS > LOGICAL_WIDTH) {
        // Left scores
        state.leftScore += 1;
        leftScoreEl.textContent = state.leftScore;
        if (state.leftScore >= WIN_SCORE) {
          paused = true;
          setTimeout(() => alert('You win! Refresh to play again.'), 50);
        } else {
          // serve to right (ball goes left)
          resetBall(false);
        }
      }
    }
  }

  // Draw everything
  function draw() {
    // Clear
    ctx.fillStyle = '#07142a';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Middle dashed line
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    const dashH = 14;
    const gap = 10;
    const centerX = LOGICAL_WIDTH / 2 - 1;
    for (let y = 10; y < LOGICAL_HEIGHT - 10; y += dashH + gap) {
      ctx.fillRect(centerX, y, 2, dashH);
    }

    // Paddles
    ctx.fillStyle = '#f1f6ff';
    ctx.fillRect(0, state.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(LOGICAL_WIDTH - PADDLE_WIDTH, state.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball with slight glow
    const grd = ctx.createRadialGradient(state.ball.x, state.ball.y, 1, state.ball.x, state.ball.y, BALL_RADIUS * 2);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Soft shadow
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, LOGICAL_HEIGHT - 6, LOGICAL_WIDTH, 6);
    ctx.globalAlpha = 1;
  }

  // Main loop
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Expose nothing, UI is in DOM. Quick instructions printed in console:
  console.log('Pong ready. Move left paddle with mouse or Arrow Up/Down. Click canvas or press Space to pause/start.');

})();