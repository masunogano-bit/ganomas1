/**
 * Renderizador Canvas desacoplado de la física.
 * Dibuja cada bolita con volumen, reflejo, sombra y número legible.
 */
class AmphoraRenderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.world = world;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    // Un máximo de 2 mantiene las bolas nítidas sin triplicar el consumo
    // de memoria y GPU en teléfonos de alta densidad.
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.context.setTransform(
      (rect.width * dpr) / this.world.width,
      0,
      0,
      (rect.height * dpr) / this.world.height,
      0,
      0
    );
  }

  render() {
    const ctx = this.context;
    const { width, height } = this.world;
    ctx.clearRect(0, 0, width, height);

    // Sombra interior que ancla visualmente las bolitas al recipiente.
    const floor = ctx.createRadialGradient(400, 520, 20, 400, 520, 245);
    floor.addColorStop(0, "rgba(0,0,20,.42)");
    floor.addColorStop(1, "rgba(0,0,20,0)");
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.ellipse(400, 520, 235, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    const ordered = [...this.world.balls].sort((a, b) => a.y - b.y);
    for (const ball of ordered) this.drawBall(ball);
  }

  drawBall(ball) {
    const ctx = this.context;
    const r = ball.radius;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    ctx.shadowColor = "rgba(0,0,20,.48)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 5;
    const gradient = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.12, 0, 0, r);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.16, this.lighten(ball.color, 24));
    gradient.addColorStop(0.56, ball.color);
    gradient.addColorStop(0.84, this.darken(ball.color, 28));
    gradient.addColorStop(1, this.darken(ball.color, 58));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255,255,255,.96)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Reflejo duro: da nitidez y volumen sin un halo borroso.
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.08, r * 0.72, Math.PI * 1.08, Math.PI * 1.62);
    ctx.stroke();

    // Contraplaca blanca para mantener el número legible al rotar.
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.darken(ball.color, 18);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = "#10123e";
    ctx.font = `900 ${Math.max(11, r * 0.65)}px "Exo 2", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = ball.number.length > 3 ? ball.number.slice(-3) : ball.number;
    ctx.fillText(label, 0, 0.8);

    ctx.restore();
  }

  lighten(hex, amount) {
    return this.shiftColor(hex, amount);
  }

  darken(hex, amount) {
    return this.shiftColor(hex, -amount);
  }

  shiftColor(hex, amount) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean, 16);
    const r = Math.max(0, Math.min(255, (value >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((value >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (value & 0xff) + amount));
    return `rgb(${r},${g},${b})`;
  }
}

window.TombolaRender = Object.freeze({ AmphoraRenderer });
