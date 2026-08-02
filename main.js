const {
  PhysicsWorld: PhysicsWorldClass,
  AIR_FORCE: BASE_AIR_FORCE,
  TURBULENCE: BASE_TURBULENCE
} = window.TombolaPhysics;
const { AmphoraRenderer: AmphoraRendererClass } = window.TombolaRender;

/**
 * Intensidad pública del soplador, en una escala de 1 a 10.
 * AIR_FORCE y TURBULENCE viven en physics.js y se escalan desde este control.
 */
let AIR_LEVEL = 6;

const MAX_BALLS = 80;
const world = new PhysicsWorldClass(800, 700);
const renderer = new AmphoraRendererClass(document.querySelector("#ball-canvas"), world);
const scene = document.querySelector("#machine-scene");
const mouth = document.querySelector("#mouth-target");
const layer = document.querySelector("#ticket-layer");
const countElement = document.querySelector("#ticket-count");
const numberInput = document.querySelector("#ticket-number");
const addButton = document.querySelector("#add-ticket");
const speedInput = document.querySelector("#air-intensity");
const speedOutput = document.querySelector("#rotation-output");
const toast = document.querySelector("#toast");
let autoNumber = 1;
let lastFrame = performance.now();
let toastTimer;
let sceneIsVisible = true;

const palette = ["#ff3b1f", "#00d9ff", "#ff0095", "#713cff", "#00e676", "#ffd500", "#006cff", "#ff6a00"];

function responsiveBallRadius(offset = 0) {
  return (window.matchMedia("(max-width: 600px)").matches ? 30 : 24) + offset;
}

function colorForNumber(number) {
  const numeric = Number.parseInt(String(number), 10) || String(number).length * 7;
  return palette[Math.abs(numeric) % palette.length];
}

function updateCounter() {
  countElement.textContent = String(world.balls.length);
  addButton.disabled = world.balls.length >= MAX_BALLS;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/**
 * Evalúa una curva Bézier cúbica. Los tickets usan esta trayectoria para
 * entrar por la boca sin moverse en una línea recta artificial.
 */
function cubicBezier(p0, p1, p2, p3, t) {
  const oneMinus = 1 - t;
  return {
    x: oneMinus ** 3 * p0.x + 3 * oneMinus ** 2 * t * p1.x + 3 * oneMinus * t ** 2 * p2.x + t ** 3 * p3.x,
    y: oneMinus ** 3 * p0.y + 3 * oneMinus ** 2 * t * p1.y + 3 * oneMinus * t ** 2 * p2.y + t ** 3 * p3.y
  };
}

/**
 * API pública solicitada. Puede llamarse repetidamente desde consola o desde
 * otros componentes mediante window.addTicket(numero).
 */
function addTicket(number = autoNumber) {
  if (world.balls.length >= MAX_BALLS) {
    showToast("La demostración alcanzó su máximo de 80 tickets.");
    return false;
  }

  const ticketNumber = String(number || autoNumber).slice(0, 4);
  autoNumber = Math.max(autoNumber + 1, (Number.parseInt(ticketNumber, 10) || 0) + 1);
  const color = colorForNumber(ticketNumber);
  const ticket = document.createElement("div");
  ticket.className = "flying-ticket";
  ticket.textContent = `#${ticketNumber.padStart(3, "0")}`;
  layer.appendChild(ticket);

  const sceneRect = scene.getBoundingClientRect();
  const mouthRect = mouth.getBoundingClientRect();
  const ticketWidth = ticket.getBoundingClientRect().width;
  const start = { x: Math.max(4, sceneRect.width * 0.82 - ticketWidth / 2), y: -48 };
  const end = {
    x: mouthRect.left - sceneRect.left - ticketWidth / 2,
    y: mouthRect.top - sceneRect.top - ticket.getBoundingClientRect().height / 2
  };
  const control1 = { x: sceneRect.width * 0.9, y: sceneRect.height * 0.08 };
  const control2 = { x: sceneRect.width * 0.57, y: sceneRect.height * 0.03 };
  const duration = 1150;
  const startedAt = performance.now();

  function animateTicket(now) {
    const raw = Math.min(1, (now - startedAt) / duration);
    const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    const point = cubicBezier(start, control1, control2, end, eased);
    const morph = Math.max(0, (eased - 0.72) / 0.28);
    const scaleX = 1 - morph * 0.52;
    const scaleY = 1 - morph * 0.08;
    ticket.style.borderRadius = `${8 + morph * 42}%`;
    ticket.style.opacity = String(1 - morph * 0.12);
    ticket.style.transform = `translate3d(${point.x}px,${point.y}px,0) rotate(${eased * 24 - 8}deg) scale(${scaleX},${scaleY})`;

    if (raw < 1) {
      requestAnimationFrame(animateTicket);
      return;
    }

    ticket.remove();
    world.addBall({ number: ticketNumber, color, radius: responsiveBallRadius(), entry: true });
    world.stir(45);
    updateCounter();
  }

  requestAnimationFrame(animateTicket);
  return true;
}

window.addTicket = addTicket;

function setAirIntensity(level) {
  AIR_LEVEL = Number(level);
  const forceScale = 0.55 + AIR_LEVEL * 0.105;
  const turbulenceScale = 0.72 + AIR_LEVEL * 0.055;
  world.airForce = BASE_AIR_FORCE * forceScale;
  world.turbulence = BASE_TURBULENCE * turbulenceScale;
  speedOutput.value = `Nivel ${AIR_LEVEL}`;
}

function animationLoop(now) {
  if (document.hidden || !sceneIsVisible) {
    lastFrame = now;
    requestAnimationFrame(animationLoop);
    return;
  }

  const dt = Math.min((now - lastFrame) / 1000, 1 / 24);
  lastFrame = now;
  world.update(dt, 1);
  renderer.render();
  requestAnimationFrame(animationLoop);
}

if ("IntersectionObserver" in window) {
  const sceneObserver = new IntersectionObserver(entries => {
    sceneIsVisible = entries[0]?.isIntersecting ?? true;
  }, { rootMargin: "180px 0px" });
  sceneObserver.observe(scene);
}

document.querySelector("#ticket-form").addEventListener("submit", event => {
  event.preventDefault();
  const value = numberInput.value.trim() || autoNumber;
  if (addTicket(value)) {
    numberInput.value = "";
    numberInput.focus();
  }
});

speedInput.addEventListener("input", () => setAirIntensity(speedInput.value));
document.querySelector("#mix-balls").addEventListener("click", () => {
  world.stir(210);
  showToast("¡Mezcla impulsada!");
});

const menu = document.querySelector("#menu");
const navLinks = document.querySelector("#nav-links");
menu.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
});
navLinks.addEventListener("click", () => {
  navLinks.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
});

// Carga inicial: suficientes bolitas para mostrar física desde el primer segundo.
for (let number = 1; number <= 14; number += 1) {
  world.addBall({ number, color: colorForNumber(number), radius: responsiveBallRadius(number % 2), entry: false });
}
updateCounter();
setAirIntensity(AIR_LEVEL);
requestAnimationFrame(animationLoop);
