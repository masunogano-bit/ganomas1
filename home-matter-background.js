(() => {
  "use strict";

  const canvas = document.querySelector("#matter-background");
  const MatterLib = window.Matter;
  if (!canvas || !MatterLib) return;

  const { Engine, Bodies, Body, Composite } = MatterLib;
  const engine = Engine.create({ enableSleeping: false });
  const context = canvas.getContext("2d");
  const colors = ["#29bfff", "#3979ff", "#9f62ee", "#ff486d", "#19c991", "#f39c32", "#e84f9b"];
  const balls = [];
  let boundaries = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let lastTime = performance.now();

  // La gravedad es ligera: el flujo de aire puede vencerla y mantener
  // las bolas recorriendo toda la pantalla, como en una máquina neumática.
  engine.gravity.y = 0.08;
  engine.gravity.scale = 0.001;

  function createBall(index) {
    const radius = 14 + Math.random() * 15;
    const ball = Bodies.circle(
      radius + Math.random() * Math.max(1, width - radius * 2),
      Math.random() * Math.max(1, height - radius * 2),
      radius,
      {
        restitution: 0.99,
        friction: 0,
        frictionAir: 0.006 + Math.random() * 0.006,
        density: 0.0015
      }
    );
    ball.plugin.visual = {
      color: colors[index % colors.length],
      number: 1 + ((index * 7) % 75),
      phase: Math.random() * Math.PI * 2,
      kind: index % 3 === 0 ? "coin" : "ball"
    };
    Body.setVelocity(ball, { x: (Math.random() - .5) * 8, y: (Math.random() - .5) * 7 });
    Body.setAngularVelocity(ball, (Math.random() < .5 ? -1 : 1) * (.035 + Math.random() * .055));
    balls.push(ball);
    Composite.add(engine.world, ball);
  }

  function rebuildBoundaries() {
    if (boundaries.length) Composite.remove(engine.world, boundaries);
    const thick = 100;
    boundaries = [
      Bodies.rectangle(width / 2, -thick / 2, width + thick * 2, thick, { isStatic: true }),
      Bodies.rectangle(width / 2, height + thick / 2, width + thick * 2, thick, { isStatic: true }),
      Bodies.rectangle(-thick / 2, height / 2, thick, height + thick * 2, { isStatic: true }),
      Bodies.rectangle(width + thick / 2, height / 2, thick, height + thick * 2, { isStatic: true })
    ];
    Composite.add(engine.world, boundaries);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    rebuildBoundaries();
    balls.forEach(ball => {
      Body.setPosition(ball, {
        x: Math.min(Math.max(ball.circleRadius, ball.position.x), width - ball.circleRadius),
        y: Math.min(Math.max(ball.circleRadius, ball.position.y), height - ball.circleRadius)
      });
    });
  }

  function applyAir(time) {
    balls.forEach((ball, index) => {
      const phase = ball.plugin.visual.phase;
      const normalizedX = (ball.position.x / Math.max(width, 1)) - .5;
      const airColumn = Math.sin((ball.position.x / Math.max(width, 1)) * Math.PI * 4 + time * .002);
      const lift = (-0.000115 - Math.max(0, airColumn) * 0.000085) * ball.mass;
      const swirl = Math.sin(time * 0.0017 + phase + index * .37) * 0.000075 * ball.mass;
      const turbulenceX = ((Math.random() - .5) * 0.00013 + swirl - normalizedX * 0.000018) * ball.mass;
      const turbulenceY = (Math.cos(time * 0.0021 + index) * 0.000055 + (Math.random() - .5) * 0.00008) * ball.mass;
      Body.applyForce(ball, ball.position, { x: turbulenceX, y: lift + turbulenceY });

      // Conserva una velocidad perceptible sin permitir que la simulación explote.
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      if (speed < 2.15) {
        const kick = 2.15 / Math.max(speed, .1);
        Body.setVelocity(ball, { x: ball.velocity.x * kick + swirl * 9000, y: ball.velocity.y * kick - .35 });
      } else if (speed > 9.5) {
        const clamp = 9.5 / speed;
        Body.setVelocity(ball, { x: ball.velocity.x * clamp, y: ball.velocity.y * clamp });
      }

      if (Math.abs(ball.angularVelocity) < .032) {
        Body.setAngularVelocity(ball, (index % 2 ? 1 : -1) * (.04 + (index % 4) * .008));
      }
    });
  }

  function drawBall(ball) {
    const { x, y } = ball.position;
    const radius = ball.circleRadius;
    const { color, number, kind } = ball.plugin.visual;
    context.save();
    context.translate(x, y);
    context.rotate(ball.angle);
    context.shadowColor = kind === "coin" ? "#ffb000" : color;
    context.shadowBlur = kind === "coin" ? 28 : 22;

    if (kind === "coin") {
      const coinFace = context.createRadialGradient(-radius * .35, -radius * .38, radius * .08, 0, 0, radius);
      coinFace.addColorStop(0, "#fffde2");
      coinFace.addColorStop(.16, "#fff17a");
      coinFace.addColorStop(.42, "#ffc31f");
      coinFace.addColorStop(.72, "#ff8a00");
      coinFace.addColorStop(1, "#9e2500");
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fillStyle = coinFace;
      context.fill();
      context.lineWidth = Math.max(3, radius * .14);
      context.strokeStyle = "#ffe768";
      context.stroke();
      context.shadowBlur = 0;
      context.beginPath();
      context.arc(0, 0, radius * .72, 0, Math.PI * 2);
      context.lineWidth = Math.max(2, radius * .08);
      context.strokeStyle = "rgba(143,48,0,.68)";
      context.stroke();
      context.beginPath();
      context.arc(0, 0, radius * .56, 0, Math.PI * 2);
      context.fillStyle = "rgba(255,229,85,.4)";
      context.fill();
      context.fillStyle = "#8b1d00";
      context.font = `900 ${Math.max(10, radius * .72)}px "Changa", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(indexForCoin(number), 0, radius * .03);
      context.beginPath();
      context.arc(-radius * .35, -radius * .38, radius * .14, 0, Math.PI * 2);
      context.fillStyle = "rgba(255,255,255,.92)";
      context.fill();
      context.restore();
      return;
    }

    const fill = context.createRadialGradient(-radius * .36, -radius * .38, radius * .08, 0, 0, radius);
    fill.addColorStop(0, "#ffffff");
    fill.addColorStop(.16, color);
    fill.addColorStop(.72, color);
    fill.addColorStop(1, "#10104a");
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "rgba(255,255,255,.82)";
    context.stroke();
    context.shadowBlur = 0;
    context.beginPath();
    context.arc(0, 0, radius * .47, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,.88)";
    context.fill();
    context.beginPath();
    context.arc(0, 0, radius * .68, -.72, .38);
    context.lineWidth = Math.max(2, radius * .1);
    context.lineCap = "round";
    context.strokeStyle = "rgba(255,255,255,.72)";
    context.stroke();
    context.beginPath();
    context.arc(radius * .72, 0, radius * .095, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,.95)";
    context.fill();
    context.fillStyle = "#13133f";
    context.font = `900 ${Math.max(8, radius * .45)}px "Exo 2", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(number, 0, .5);
    context.restore();
  }

  function indexForCoin(number) {
    return number % 2 ? "$" : "G";
  }

  function frame(now) {
    const delta = Math.min(16.5, Math.max(8, now - lastTime));
    lastTime = now;
    // El usuario solicitó que esta ambientación se mantenga activa. Por eso
    // la física no se detiene aunque el sistema reduzca otras animaciones UI.
    applyAir(now);
    Engine.update(engine, delta);
    context.clearRect(0, 0, width, height);
    balls.forEach(drawBall);
    canvas.dataset.motionFrame = String((Number(canvas.dataset.motionFrame || 0) + 1) % 100000);
    canvas.dataset.motionSample = balls.slice(0, 3).map(ball =>
      `${Math.round(ball.position.x)},${Math.round(ball.position.y)},${ball.angle.toFixed(2)}`
    ).join("|");
    requestAnimationFrame(frame);
  }

  resize();
  const count = Math.max(16, Math.min(28, Math.round(window.innerWidth / 58)));
  for (let index = 0; index < count; index += 1) createBall(index);
  canvas.dataset.matterReady = "true";
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
})();
