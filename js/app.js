function recipeCardHTML(r) {
  const ingredientsPreview = r.ingredients.slice(0, 3).map(i => i.name).join(", ");
  const more = r.ingredients.length > 3 ? ` +${r.ingredients.length - 3}` : "";
  const thumb = r.photo
    ? `<img class="thumb" src="${escapeAttrUrl(r.photo)}" alt="${escapeHTML(r.title)}">`
    : `<div class="thumb-placeholder">${categoryEmoji(r.category)}</div>`;

  const tagsHTML = (r.tags && r.tags.length)
    ? `<div class="chip-list">${r.tags.map(t => `<span class="chip small">${escapeHTML(t)}</span>`).join("")}</div>`
    : "";

  const cookedBadge = (r.cook_log && r.cook_log.length)
    ? `<span class="badge" title="Você já fez essa receita">🍳 ${r.cook_log.length}×</span>`
    : "";

  return `
    <a class="recipe-card" href="receita.html?id=${r.id}">
      <button type="button" class="favorite-btn ${r.favorite ? "active" : ""}" data-fav-id="${r.id}" title="${r.favorite ? "Remover dos favoritos" : "Favoritar"}" aria-label="${r.favorite ? "Remover " + escapeHTML(r.title) + " dos favoritos" : "Favoritar " + escapeHTML(r.title)}" aria-pressed="${r.favorite ? "true" : "false"}">${r.favorite ? "★" : "☆"}</button>
      ${thumb}
      <span class="tag ${r.category}">${CATEGORY_LABELS[r.category]}</span>
      <div class="body">
        <h3>${escapeHTML(r.title)}</h3>
        <div class="meta">${formatDate(r.created_at)} ${cookedBadge}</div>
        <div class="ingredients-preview">${escapeHTML(ingredientsPreview)}${more}</div>
        ${tagsHTML}
      </div>
    </a>`;
}

function categoryEmoji(category) {
  return { salgada: "🥗", doce: "🍰", "bebida-quente": "☕", "bebida-fria": "🥤" }[category] || "🍽️";
}

function escapeAttrUrl(str) { return escapeHTML(str); }

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Mostra um indicador de carregamento simples — usado enquanto a página
// aguarda a verificação de login e a primeira busca de dados no Supabase,
// pra nunca deixar a tela em branco/silenciosa (heurística nº1 de Nielsen).
function showLoading(containerId, label = "Carregando...") {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="page-loading"><span class="spinner" aria-hidden="true"></span> ${escapeHTML(label)}</div>`;
}

// `onFavoriteToggle`, se passado, é chamado (pode ser async) depois de
// alternar o favorito — normalmente a própria função `refresh()` da página,
// pra recarregar a lista com o estado atualizado.
function renderGrid(containerId, recipes, emptyMsg, onFavoriteToggle) {
  const el = document.getElementById(containerId);
  if (!recipes.length) {
    el.innerHTML = `
      <div class="empty-state">
        <p>${emptyMsg}</p>
        <a class="btn" href="cadastro.html">+ Cadastrar receita</a>
      </div>`;
    return;
  }
  el.innerHTML = recipes.map(recipeCardHTML).join("");
  bindFavoriteButtons(el, onFavoriteToggle);
}

function bindFavoriteButtons(container, onToggle) {
  container.querySelectorAll("[data-fav-id]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      await Storage.toggleFavorite(btn.dataset.favId);
      if (onToggle) await onToggle();
    });
  });
}

function markActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.mainnav a[data-page]").forEach(a => {
    if (a.dataset.page === path) a.classList.add("active");
  });
}

async function updateNavCounts() {
  const [salgadas, doces] = await Promise.all([
    Storage.byCategory("salgada"),
    Storage.byCategory("doce")
  ]);
  const counts = { "salgadas.html": salgadas.length, "doces.html": doces.length };
  document.querySelectorAll("nav.mainnav a[data-page]").forEach(a => {
    const c = counts[a.dataset.page];
    if (c !== undefined && c > 0) {
      a.textContent = `${a.textContent} (${c})`;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  markActiveNav();
  if (typeof initThemeToggle === "function") initThemeToggle();
  if (typeof initAuthNav === "function") await initAuthNav();
  if (typeof Storage !== "undefined") updateNavCounts();
});
