const views = {
  inicio: ["VISIÓN NACIONAL", "Resumen general"],
  iglesias: ["ORGANIZACIÓN", "Iglesias locales"],
  familias: ["COMUNIDAD", "Familias"],
  personas: ["COMUNIDAD", "Personas y familias"],
  cultos: ["ACTIVIDAD LOCAL", "Cultos y reuniones"],
  asistencia: ["PARTICIPACIÓN", "Asistencia y seguimiento"],
  finanzas: ["ADMINISTRACIÓN", "Finanzas"],
  informes: ["ANÁLISIS", "Informes y estadísticas"]
};

const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menu-button");
const toast = document.getElementById("toast");
let toastTimer;

function showView(name) {
  if (!views[name]) return;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  document.getElementById(`view-${name}`).classList.add("active");
  document.getElementById("section-eyebrow").textContent = views[name][0];
  document.getElementById("section-title").textContent = views[name][1];
  sidebar.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-view], [data-view-target]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view || button.dataset.viewTarget));
});

menuButton.addEventListener("click", () => {
  const open = sidebar.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.toast)));

const attendanceInputs = document.querySelectorAll(".attendance-input");
function updateAttendanceTotal() {
  const total = [...attendanceInputs].reduce((sum, input) => sum + Math.max(0, Number(input.value) || 0), 0);
  document.getElementById("attendance-total").textContent = `${total} personas`;
}
attendanceInputs.forEach((input) => input.addEventListener("input", updateAttendanceTotal));

document.getElementById("service-form").addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Culto registrado correctamente en el prototipo");
});

document.getElementById("person-search").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll("#people-table tbody tr").forEach((row) => {
    row.hidden = !row.textContent.toLowerCase().includes(query);
  });
});

const familyListMode = document.getElementById("family-list-mode");
const familyMapMode = document.getElementById("family-map-mode");
document.querySelectorAll("[data-family-mode]").forEach((button) => button.addEventListener("click", () => {
  const mapMode = button.dataset.familyMode === "map";
  familyListMode.hidden = mapMode;
  familyMapMode.hidden = !mapMode;
  document.querySelectorAll("[data-family-mode]").forEach((item) => item.classList.toggle("active", item === button));
}));

document.getElementById("family-search").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll("#family-directory .family-row").forEach((row) => {
    row.hidden = !row.textContent.toLowerCase().includes(query);
  });
});

document.querySelectorAll(".map-family").forEach((button) => button.addEventListener("click", () => {
  const lat = Number(button.dataset.lat);
  const lon = Number(button.dataset.lon);
  const margin = 0.02;
  const bbox = `${lon - margin},${lat - 0.01},${lon + margin},${lat + 0.01}`;
  document.getElementById("family-map").src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
  document.querySelector(".map-caption strong").textContent = button.querySelector("strong").textContent;
  document.querySelectorAll(".map-family").forEach((item) => item.classList.toggle("active", item === button));
}));

const familyDialog = document.getElementById("family-dialog");
document.getElementById("add-family-button").addEventListener("click", () => {
  familyDialog.hidden = false;
  familyDialog.querySelector("input").focus();
});
document.querySelectorAll("[data-close-family]").forEach((button) => button.addEventListener("click", () => { familyDialog.hidden = true; }));
document.getElementById("family-form").addEventListener("submit", (event) => {
  event.preventDefault();
  familyDialog.hidden = true;
  showToast("Familia guardada correctamente en el prototipo");
});
document.querySelectorAll(".family-detail-button").forEach((button) => button.addEventListener("click", () => showToast(`Ficha de la familia ${button.dataset.family} abierta`)));

const rosterCards = [...document.querySelectorAll(".member-card")];
function updateRoster() {
  const visible = rosterCards.filter((card) => !card.hidden);
  const checked = rosterCards.filter((card) => card.querySelector("input").checked);
  rosterCards.forEach((card) => card.classList.toggle("present", card.querySelector("input").checked));
  document.getElementById("checked-count").textContent = `${checked.length} / ${rosterCards.length}`;
  document.getElementById("attendance-percent").textContent = `${Math.round((checked.length / rosterCards.length) * 100)}% de asistencia`;
  document.getElementById("check-all").textContent = visible.length > 0 && visible.every((card) => card.querySelector("input").checked) ? "Desmarcar visibles" : "Marcar todos";
}
rosterCards.forEach((card) => card.querySelector("input").addEventListener("change", updateRoster));
function filterRoster() {
  const query = document.getElementById("attendance-search").value.trim().toLowerCase();
  const category = document.getElementById("attendance-category").value;
  rosterCards.forEach((card) => {
    card.hidden = !card.textContent.toLowerCase().includes(query) || (category !== "all" && card.dataset.category !== category);
  });
  updateRoster();
}
document.getElementById("attendance-search").addEventListener("input", filterRoster);
document.getElementById("attendance-category").addEventListener("change", filterRoster);
document.getElementById("check-all").addEventListener("click", () => {
  const visible = rosterCards.filter((card) => !card.hidden);
  const shouldCheck = !visible.every((card) => card.querySelector("input").checked);
  visible.forEach((card) => { card.querySelector("input").checked = shouldCheck; });
  updateRoster();
});
document.getElementById("close-service").addEventListener("click", () => {
  showToast(`Culto guardado: ${rosterCards.filter((card) => card.querySelector("input").checked).length} presentes y $ ${Number(document.getElementById("service-offering").value || 0).toLocaleString("es-UY")} de ofrenda`);
});

const roleDialog = document.getElementById("role-dialog");
document.getElementById("change-role").addEventListener("click", () => {
  roleDialog.hidden = false;
  roleDialog.querySelector(".role-options button").focus();
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => { roleDialog.hidden = true; }));
document.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
  document.getElementById("scope-label").textContent = button.dataset.role;
  roleDialog.hidden = true;
  showToast(`Vista cambiada a ${button.dataset.role}`);
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !roleDialog.hidden) roleDialog.hidden = true;
  if (event.key === "Escape" && !familyDialog.hidden) familyDialog.hidden = true;
});

