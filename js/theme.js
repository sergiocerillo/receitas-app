// Aplica o tema salvo (ou o preferido pelo sistema) o mais cedo possível,
// antes da primeira pintura da página, pra evitar o "flash" de tema errado.
(function () {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    document.documentElement.setAttribute("data-theme", saved);
  }
})();

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function currentTheme() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyIcon() {
    const isDark = currentTheme() === "dark";
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.setAttribute("aria-label", isDark ? "Mudar para tema claro" : "Mudar para tema escuro");
    btn.setAttribute("title", isDark ? "Tema claro" : "Tema escuro");
  }

  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    applyIcon();
  });

  applyIcon();
}
