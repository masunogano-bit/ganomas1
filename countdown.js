(() => {
  const consoleElement = document.querySelector("#game-countdown");
  if (!consoleElement) return;

  const values = {
    days: consoleElement.querySelector('[data-countdown="days"]'),
    hours: consoleElement.querySelector('[data-countdown="hours"]'),
    minutes: consoleElement.querySelector('[data-countdown="minutes"]'),
    seconds: consoleElement.querySelector('[data-countdown="seconds"]')
  };
  const dateLabel = consoleElement.querySelector("#countdown-date");
  let target = null;
  let eventData = null;
  let timer = null;

  const pad = number => String(Math.max(0, number)).padStart(2, "0");

  function writeUnits(days, hours, minutes, seconds) {
    values.days.textContent = pad(days);
    values.hours.textContent = pad(hours);
    values.minutes.textContent = pad(minutes);
    values.seconds.textContent = pad(seconds);
  }

  function formatDate(date, data) {
    const parts = new Intl.DateTimeFormat("es-EC", {
      timeZone: data.timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const value = type => parts.find(part => part.type === type)?.value || "";
    const weekday = value("weekday");
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${value("day")} de ${value("month")} | ${value("hour")}:${value("minute")} h (${data.timezoneLabel})`;
  }

  function tick() {
    if (!target) return;
    const remaining = target.getTime() - Date.now();
    if (remaining <= 0) {
      writeUnits(0, 0, 0, 0);
      consoleElement.dataset.state = "live";
      dateLabel.textContent = "¡EL JUEGO HA COMENZADO!";
      clearInterval(timer);
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    writeUnits(days, hours, minutes, seconds);
    consoleElement.dataset.state = "ready";
    dateLabel.textContent = formatDate(target, eventData);
  }

  async function loadEvent() {
    consoleElement.dataset.state = "loading";
    dateLabel.textContent = "Consultando el próximo juego…";
    try {
      const response = await fetch("/api/fecha-juego", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("API unavailable");
      eventData = await response.json();
      target = new Date(eventData.date);
      if (!Number.isFinite(target.getTime())) throw new Error("Invalid event date");
      clearInterval(timer);
      tick();
      timer = setInterval(tick, 1000);
    } catch {
      target = null;
      clearInterval(timer);
      writeUnits(0, 0, 0, 0);
      consoleElement.dataset.state = "error";
      dateLabel.textContent = "Próximo juego por confirmar · reconectando…";
      window.setTimeout(loadEvent, 15000);
    }
  }

  loadEvent();
})();
