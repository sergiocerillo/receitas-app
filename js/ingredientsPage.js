// Lógica compartilhada pelas páginas ingredientes-comida.html e
// ingredientes-bebidas.html: formulário de cadastro (com categoria),
// busca e lista agrupada por categoria.

function ingredientRowHTML(type, name) {
  const warn = type === "food" && isLikelyNonVeg(name);
  return `
    <div class="ingredient-item ${warn ? "warn" : ""}">
      <span>${escapeHTML(name)}${warn ? ' <span class="badge">⚠️ pode não ser vegetariano</span>' : ""}</span>
      <button type="button" class="hide-btn" data-name="${escapeHTML(name)}" data-type="${type}" title="Excluir" aria-label="Excluir ${escapeHTML(name)}">×</button>
    </div>`;
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

function initIngredientsPage({ type, groups, listElId, searchElId, formElId, nameElId, groupElId }) {
  const listEl = document.getElementById(listElId);
  const searchEl = document.getElementById(searchElId);
  const groupNames = Object.keys(groups);

  const groupSelect = document.getElementById(groupElId);
  groupSelect.innerHTML = groupNames.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join("")
    + `<option value="Outros">Outros</option>`;

  async function render(searchTerm = "") {
    const hidden = await Ingredients.getHidden(type);
    const custom = await Ingredients.getCustom(type);
    const term = searchTerm.trim().toLowerCase();

    const sections = [];
    for (const groupName of groupNames) {
      const baseItems = groups[groupName].filter(n => !hidden.includes(n));
      const customItems = custom.filter(c => c.group === groupName).map(c => c.name);
      let items = [...baseItems, ...customItems];
      if (term) items = items.filter(n => n.toLowerCase().includes(term));
      if (items.length) {
        sections.push({ name: groupName, items: [...new Set(items)].sort((a, b) => a.localeCompare(b, "pt-BR")) });
      }
    }

    let extras = custom.filter(c => !groupNames.includes(c.group)).map(c => c.name);
    if (term) extras = extras.filter(n => n.toLowerCase().includes(term));
    if (extras.length) {
      sections.push({ name: "Outros", items: [...new Set(extras)].sort((a, b) => a.localeCompare(b, "pt-BR")) });
    }

    if (!sections.length) {
      listEl.innerHTML = `<div class="empty-list-msg">Nenhum ingrediente encontrado.</div>`;
      return;
    }

    listEl.innerHTML = sections.map(sec => `
      <div class="ingredient-group-title">${escapeHTML(sec.name)}</div>
      ${sec.items.map(name => ingredientRowHTML(type, name)).join("")}
    `).join("");

    listEl.querySelectorAll(".hide-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await Ingredients.remove(btn.dataset.type, btn.dataset.name);
        render(searchEl.value);
        showToast(`"${btn.dataset.name}" excluído.`);
      });
    });
  }

  searchEl.addEventListener("input", (e) => render(e.target.value));

  document.getElementById(formElId).addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById(nameElId);
    const name = nameInput.value.trim();
    const group = groupSelect.value;
    if (!name) return;

    if (await Ingredients.addCustom(type, name, group)) {
      nameInput.value = "";
      render(searchEl.value);
      showToast(type === "food" && isLikelyNonVeg(name)
        ? `"${name}" cadastrado em "${group}". Atenção: pode não ser vegetariano.`
        : `"${name}" cadastrado em "${group}".`);
    } else {
      showToast("Esse ingrediente já existe.");
    }
  });

  render();
}

function initBackupControls() {
  const exportBtn = document.getElementById("export-btn");
  const importFile = document.getElementById("import-file");
  if (!exportBtn || !importFile) return;

  exportBtn.addEventListener("click", async () => {
    const blob = new Blob([await Storage.exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minhas-receitas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup exportado.");
  });

  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await Storage.importBackup(reader.result);
        showToast("Backup importado com sucesso! Recarregando...");
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        showToast("Não foi possível importar esse backup: " + err.message);
      }
    };
    reader.readAsText(file);
  });
}
