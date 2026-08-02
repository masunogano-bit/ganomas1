const scene = document.querySelector("#winnerScene");
const startButton = document.querySelector("#startButton");
const statusMessage = document.querySelector("#statusMessage");
const confettiLayer = document.querySelector("#confettiLayer");
const stepButtons = [...document.querySelectorAll("[data-step]")];

const confettiColors = [
  "#00D2FF",
  "#FFD700",
  "#FF6600",
  "#E6005C",
  "#17F57A",
  "#F7FBFF"
];

function markStep(button, completed = true) {
  button.setAttribute("aria-pressed", String(completed));
}

function launchCelebration() {
  confettiLayer.replaceChildren();

  for (let index = 0; index < 58; index += 1) {
    const particle = document.createElement("i");
    const angle = (Math.PI * 2 * index) / 58;
    const distance = 120 + Math.random() * 360;

    particle.className = "confetti";
    particle.style.setProperty("--confetti-color", confettiColors[index % confettiColors.length]);
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance - 90}px`);
    particle.style.setProperty("--spin", `${360 + Math.random() * 720}deg`);
    particle.style.animationDelay = `${Math.random() * 120}ms`;
    confettiLayer.appendChild(particle);
  }

  window.setTimeout(() => confettiLayer.replaceChildren(), 1500);
}

stepButtons.forEach(button => {
  button.addEventListener("click", () => {
    const completed = button.getAttribute("aria-pressed") !== "true";
    markStep(button, completed);
    const total = stepButtons.filter(step => step.getAttribute("aria-pressed") === "true").length;
    statusMessage.textContent = completed
      ? `Paso ${button.dataset.step} completado. Llevas ${total} de 5.`
      : `Paso ${button.dataset.step} pendiente.`;
  });
});

startButton.addEventListener("click", () => {
  stepButtons.forEach(button => markStep(button));
  scene.classList.remove("is-live");
  void scene.offsetWidth;
  scene.classList.add("is-live");
  startButton.querySelector("span").textContent = "¡Partida iniciada!";
  statusMessage.textContent = "Todo está listo. Sigue el live y completa tu cartón.";
  launchCelebration();
});
