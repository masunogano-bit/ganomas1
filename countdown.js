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
  const fallbackEvent = {
    date: "2026-10-17T19:00:00-05:00",
    timezone: "America/Guayaquil",
    timezoneLabel: "ECT"
  };
  let target = null;
  let eventData = null;
  let timer = null;
  let refreshTimer = null;
  let retryDelay = 15000;

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
      consoleElement.dataset.state = "pending";
      dateLabel.textContent = "La fecha anunciada ya pasó · próximo juego por confirmar.";
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

  async function loadEvent({ quiet = false } = {}) {
    if (!quiet) {
      consoleElement.dataset.state = "loading";
      dateLabel.textContent = "Consultando el próximo juego…";
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/fecha-juego", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("API unavailable");
      eventData = await response.json();
      target = new Date(eventData.date);
      if (!Number.isFinite(target.getTime())) throw new Error("Invalid event date");
      const fallbackTarget = new Date(fallbackEvent.date);
      if (target.getTime() <= Date.now() && fallbackTarget.getTime() > Date.now()) {
        eventData = fallbackEvent;
        target = fallbackTarget;
      }
      clearInterval(timer);
      clearTimeout(refreshTimer);
      retryDelay = 15000;
      tick();
      timer = setInterval(tick, 1000);
      refreshTimer = window.setTimeout(() => loadEvent({ quiet: true }), 60000);
    } catch {
      if (!target) {
        clearInterval(timer);
        eventData = fallbackEvent;
        target = new Date(fallbackEvent.date);
        tick();
        timer = setInterval(tick, 1000);
      }
      clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(loadEvent, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 60000);
    } finally {
      clearTimeout(timeout);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadEvent({ quiet: Boolean(target) });
  });

  loadEvent();
})();
