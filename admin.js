(() => {
  const loginView = document.querySelector("#login-view");
  const dashboardView = document.querySelector("#dashboard-view");
  const loginForm = document.querySelector("#login-form");
  const eventForm = document.querySelector("#event-form");
  const loginMessage = document.querySelector("#login-message");
  const eventMessage = document.querySelector("#event-message");
  const dateInput = document.querySelector("#event-datetime");
  const previewDate = document.querySelector("#preview-date");
  const previewRelative = document.querySelector("#preview-relative");
  const updateButton = document.querySelector("#update-button");
  const toast = document.querySelector("#admin-toast");
  let csrf = "";

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
    return data;
  }

  function localInputValue(isoDate) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(isoDate));
    const value = type => parts.find(part => part.type === type)?.value || "";
    return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
  }

  function formatEvent(isoDate) {
    return new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(new Date(isoDate));
  }

  function renderPreview(event) {
    const date = new Date(event.date);
    previewDate.textContent = formatEvent(event.date);
    const hours = Math.max(0, Math.round((date.getTime() - Date.now()) / 3_600_000));
    previewRelative.textContent = date <= new Date() ? "El evento ya comenzó" : hours < 48 ? `Comienza en aproximadamente ${hours} horas` : `Comienza en aproximadamente ${Math.ceil(hours / 24)} días`;
    dateInput.value = localInputValue(event.date);
  }

  async function loadEvent() {
    const event = await api("/api/fecha-juego", { method: "GET", headers: {} });
    renderPreview(event);
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadEvent().catch(error => { eventMessage.textContent = error.message; });
  }

  function showLogin() {
    dashboardView.hidden = true;
    loginView.hidden = false;
    csrf = "";
  }

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    loginMessage.textContent = "Verificando…";
    const button = loginForm.querySelector("button");
    button.disabled = true;
    try {
      const result = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ username: loginForm.username.value, password: loginForm.password.value }) });
      csrf = result.csrf;
      loginMessage.textContent = "";
      loginForm.reset();
      showDashboard();
    } catch (error) {
      loginMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  eventForm.addEventListener("submit", async event => {
    event.preventDefault();
    eventMessage.classList.remove("success");
    eventMessage.textContent = "Actualizando…";
    updateButton.disabled = true;
    try {
      const result = await api("/api/fecha-juego", { method: "POST", headers: { "X-CSRF-Token": csrf }, body: JSON.stringify({ localDateTime: dateInput.value }) });
      renderPreview(result.event);
      eventMessage.textContent = "La fecha pública se actualizó correctamente.";
      eventMessage.classList.add("success");
      notify("Contador público actualizado");
    } catch (error) {
      eventMessage.textContent = error.message;
    } finally {
      updateButton.disabled = false;
    }
  });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    try { await api("/api/admin/logout", { method: "POST", headers: { "X-CSRF-Token": csrf }, body: "{}" }); } catch {}
    showLogin();
  });

  api("/api/admin/session", { method: "GET", headers: {} }).then(result => { csrf = result.csrf; showDashboard(); }).catch(showLogin);
})();
