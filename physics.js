/**
 * Variables principales de la máquina neumática.
 * AIR_FORCE supera localmente a GRAVITY en el chorro central.
 * TURBULENCE controla el movimiento lateral y la variación del flujo.
 */
const AIR_FORCE = 155;
const TURBULENCE = 92;
const GRAVITY = 82;

/**
 * Motor físico ligero para las bolitas de la tómbola.
 * Simula una máquina air-mix: las bolas suben por el chorro central,
 * se dispersan con turbulencia y bajan por los laterales.
 */
class PhysicsWorld {
  constructor(width = 800, height = 700) {
    this.width = width;
    this.height = height;
    this.center = { x: width / 2, y: height * 0.5 };
    this.bounds = { rx: width * 0.32, ry: height * 0.32 };
    this.airForce = AIR_FORCE;
    this.turbulence = TURBULENCE;
    this.gravity = GRAVITY;
    this.restitution = 0.78;
    this.friction = 0.995;
    this.balls = [];
    this.elapsed = 0;
  }

  addBall({ number, color, radius = 21, entry = false }) {
    if (this.balls.length >= 80) return null;

    const angle = (this.balls.length * 2.399) % (Math.PI * 2);
    const spreadX = this.bounds.rx * (0.18 + (this.balls.length % 5) * 0.085);
    const spreadY = this.bounds.ry * (0.16 + (this.balls.length % 4) * 0.08);
    const ball = {
      id: `${Date.now()}-${Math.random()}`,
      number: String(number),
      color,
      radius,
      x: entry ? this.center.x : this.center.x + Math.cos(angle) * spreadX,
      y: entry ? this.center.y - this.bounds.ry * 0.76 : this.center.y + Math.sin(angle) * spreadY,
      vx: Math.cos(angle) * 70 + (Math.random() - 0.5) * 45,
      vy: entry ? 45 : (Math.random() - 0.5) * 80,
      rotation: 0,
      spin: (Math.random() - 0.5) * 4,
      noiseSeed: Math.random() * Math.PI * 2,
      noiseRate: 1.1 + Math.random() * 1.7
    };
    this.balls.push(ball);
    return ball;
  }

  /**
   * Añade energía sin cambiar posiciones ni reiniciar la simulación.
   */
  stir(strength = 170) {
    for (const ball of this.balls) {
      const angle = Math.random() * Math.PI * 2;
      ball.vx += Math.cos(angle) * strength;
      ball.vy += Math.sin(angle) * strength - 35;
      ball.spin += (Math.random() - 0.5) * 5;
    }
  }

  update(rawDt, rotationFactor = 1) {
    const dt = Math.min(rawDt, 1 / 30);
    const { x: cx, y: cy } = this.center;
    this.elapsed += dt;

    for (const ball of this.balls) {
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const distance = Math.max(1, Math.hypot(dx, dy));

      /**
       * Chorro neumático: es más intenso en el centro y cerca de la base.
       * Así las bolas suben por el centro, se abren arriba y retornan por
       * los laterales, como en una máquina de lotería real.
       */
      const normalizedX = dx / this.bounds.rx;
      const heightRatio = Math.max(0, Math.min(1, (ball.y - (cy - this.bounds.ry)) / (this.bounds.ry * 2)));
      const centralJet = Math.exp(-normalizedX * normalizedX * 5.5);
      const baseBoost = 0.62 + heightRatio * 0.86;
      const airThrust = this.airForce * (0.18 + centralJet * 0.95) * baseBoost * rotationFactor;

      // Ruido continuo: evita el parpadeo de Math.random() en cada frame.
      const noiseTime = this.elapsed * ball.noiseRate + ball.noiseSeed;
      const turbulenceX = Math.sin(noiseTime * 2.1) * this.turbulence;
      const turbulenceY = Math.cos(noiseTime * 1.37) * this.turbulence * 0.32;

      // Una corriente lateral suave completa el circuito de aire.
      const circulation = 18 * rotationFactor;
      const tangentX = -dy / distance;
      const tangentY = dx / distance;

      ball.vx += (turbulenceX + tangentX * circulation) * dt;
      ball.vy += (this.gravity - airThrust + turbulenceY + tangentY * circulation) * dt;

      ball.vx *= this.friction;
      ball.vy *= this.friction;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.rotation += ball.spin * dt;
      this.resolveEllipse(ball);
    }

    // Dos pasadas estabilizan grupos densos sin añadir una librería pesada.
    this.resolveBallCollisions();
    this.resolveBallCollisions();
  }

  resolveEllipse(ball) {
    const rx = this.bounds.rx - ball.radius;
    const ry = this.bounds.ry - ball.radius;
    const dx = ball.x - this.center.x;
    const dy = ball.y - this.center.y;
    const normalized = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    if (normalized <= 1) return;

    const scale = 1 / Math.sqrt(normalized);
    ball.x = this.center.x + dx * scale;
    ball.y = this.center.y + dy * scale;

    // Normal del gradiente elíptico para un rebote creíble.
    let nx = dx / (rx * rx);
    let ny = dy / (ry * ry);
    const length = Math.max(0.0001, Math.hypot(nx, ny));
    nx /= length;
    ny /= length;
    const alongNormal = ball.vx * nx + ball.vy * ny;
    if (alongNormal > 0) {
      ball.vx -= (1 + this.restitution) * alongNormal * nx;
      ball.vy -= (1 + this.restitution) * alongNormal * ny;
      ball.spin += (Math.random() - 0.5) * 0.8;
    }
  }

  resolveBallCollisions() {
    const balls = this.balls;
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) {
        const a = balls[i];
        const b = balls[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minimum = a.radius + b.radius;
        if (distance >= minimum) continue;
        if (distance < 0.001) {
          dx = 0.01;
          dy = 0;
          distance = 0.01;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minimum - distance;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        const relativeX = b.vx - a.vx;
        const relativeY = b.vy - a.vy;
        const closingSpeed = relativeX * nx + relativeY * ny;
        if (closingSpeed >= 0) continue;

        const impulse = -(1 + this.restitution) * closingSpeed * 0.5;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        a.spin -= impulse * 0.004;
        b.spin += impulse * 0.004;
      }
    }
  }
}

window.TombolaPhysics = Object.freeze({ PhysicsWorld, AIR_FORCE, TURBULENCE, GRAVITY });
