let selectedIngredients = []; // {name, amount, unit}
let currentType = null; // "food" | "drink"
let photoDataUrl = null;
let editingId = null;
let tags = [];

function initCategoryWatcher() {
  const radios = document.querySelectorAll('input[name="category"]');
  radios.forEach(r => r.addEventListener("change", onCategoryChange));
}

async function onCategoryChange(e) {
  const category = e.target.value;
  const newType = CATEGORY_TO_INGREDIENT_TYPE[category];
  const picker = document.getElementById("ingredient-picker-wrap");

  if (newType !== currentType) {
    currentType = newType;
    if (!editingId) selectedIngredients = [];
    document.getElementById("ingredient-search").value = "";
    document.getElementById("picker-title").textContent =
      currentType === "food" ? "Ingredientes (comida)" : "Ingredientes (bebida)";
    document.getElementById("new-ingredient-type-hint").textContent =
      currentType === "food" ? "comida" : "bebida";
    renderAvailableList(await getFilteredList(""));
    renderSelectedList();
  }
  picker.style.display = "block";
  const hint = document.getElementById("pick-category-hint");
  if (hint) hint.style.display = "none";
}

async function getFilteredList(term) {
  const all = await Ingredients.getAll(currentType);
  const t = term.trim().toLowerCase();
  const filtered = t ? all.filter(i => i.toLowerCase().includes(t)) : all;
  return [...filtered].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function initIngredientPicker() {
  document.getElementById("ingredient-search").addEventListener("input", async (e) => {
    if (!currentType) return;
    renderAvailableList(await getFilteredList(e.target.value));
  });

  const availableList = document.getElementById("available-list");
  const selectedList = document.getElementById("selected-list");

  selectedList.addEventListener("dragover", (e) => {
    e.preventDefault();
    selectedList.classList.add("dragover");
  });
  selectedList.addEventListener("dragleave", () => selectedList.classList.remove("dragover"));
  selectedList.addEventListener("drop", (e) => {
    e.preventDefault();
    selectedList.classList.remove("dragover");
    const name = e.dataTransfer.getData("text/plain");
    if (name) addIngredient(name);
  });

  availableList.addEventListener("dragover", (e) => e.preventDefault());
  availableList.addEventListener("drop", (e) => {
    e.preventDefault();
    const name = e.dataTransfer.getData("text/from-selected");
    if (name) removeIngredient(name);
  });

  async function submitNewIngredient() {
    if (!currentType) {
      showToast("Escolha a categoria da receita primeiro.");
      return;
    }
    const input = document.getElementById("new-ingredient-name");
    const name = input.value.trim();
    if (!name) return;
    const added = await Ingredients.addCustom(currentType, name);
    if (added) {
      input.value = "";
      renderAvailableList(await getFilteredList(document.getElementById("ingredient-search").value));
      showToast(currentType === "food" && isLikelyNonVeg(name)
        ? `"${name}" adicionado. Atenção: pode não ser vegetariano.`
        : `"${name}" adicionado à lista de ingredientes.`);
    } else {
      showToast("Esse ingrediente já existe na lista.");
    }
  }

  document.getElementById("new-ingredient-submit").addEventListener("click", submitNewIngredient);
  document.getElementById("new-ingredient-name").addEventListener("keydown", (e) => {
    const isEnter = e.key === "Enter" || e.keyCode === 13 || e.which === 13;
    if (isEnter) {
      e.preventDefault();
      submitNewIngredient();
    }
  });
}

function renderAvailableList(items) {
  const el = document.getElementById("available-list");
  if (!items.length) {
    el.innerHTML = `<div class="empty-list-msg">Nenhum ingrediente encontrado</div>`;
    return;
  }
  el.innerHTML = items.map(name => `
    <div class="ingredient-item ${currentType === "food" && isLikelyNonVeg(name) ? "warn" : ""}" draggable="true" data-name="${escapeAttr(name)}">
      <span>${escapeHTML(name)}</span>
      <button type="button" class="add-btn" title="Adicionar" aria-label="Adicionar ${escapeAttr(name)}">+</button>
    </div>
  `).join("");

  el.querySelectorAll(".ingredient-item").forEach(item => {
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", item.dataset.name);
    });
    item.querySelector(".add-btn").addEventListener("click", () => addIngredient(item.dataset.name));
  });
}

function unitOptionsHTML(selectedUnit) {
  return `<option value="">un.</option>` + UNITS.map(u =>
    `<option value="${escapeAttr(u)}" ${u === selectedUnit ? "selected" : ""}>${escapeHTML(u)}</option>`
  ).join("");
}

function renderSelectedList() {
  const el = document.getElementById("selected-list");
  if (!selectedIngredients.length) {
    el.innerHTML = `<div class="empty-list-msg">Arraste ingredientes aqui, ou clique no "+" da lista ao lado</div>`;
    return;
  }
  el.innerHTML = selectedIngredients.map(ing => `
    <div class="ingredient-item selected-item" draggable="true" data-name="${escapeAttr(ing.name)}">
      <span>${escapeHTML(ing.name)}</span>
      <span class="qty-controls">
        <input type="number" min="0" step="any" class="qty-input" placeholder="qtd" value="${escapeAttr(ing.amount || "")}" data-name="${escapeAttr(ing.name)}" data-field="amount">
        <select class="unit-select" data-name="${escapeAttr(ing.name)}" data-field="unit">
          ${unitOptionsHTML(ing.unit || "")}
        </select>
        <button type="button" class="remove-btn" title="Remover" aria-label="Remover ${escapeAttr(ing.name)} da receita">×</button>
      </span>
    </div>
  `).join("");

  el.querySelectorAll(".selected-item").forEach(item => {
    const name = item.dataset.name;
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/from-selected", name);
    });
    item.querySelector(".remove-btn").addEventListener("click", () => removeIngredient(name));
    item.querySelector('[data-field="amount"]').addEventListener("input", (e) => {
      const ing = selectedIngredients.find(i => i.name === name);
      if (ing) ing.amount = e.target.value;
    });
    item.querySelector('[data-field="unit"]').addEventListener("change", (e) => {
      const ing = selectedIngredients.find(i => i.name === name);
      if (ing) ing.unit = e.target.value;
    });
  });
}

function addIngredient(name, amount = "", unit = "") {
  if (selectedIngredients.some(i => i.name === name)) return;
  selectedIngredients.push({ name, amount, unit });
  renderSelectedList();
}

function removeIngredient(name) {
  selectedIngredients = selectedIngredients.filter(i => i.name !== name);
  renderSelectedList();
}

function escapeAttr(str) { return escapeHTML(str); }

/* ---------- Foto ---------- */
function initPhotoField() {
  const input = document.getElementById("photo-input");
  const wrap = document.getElementById("photo-preview-wrap");
  const preview = document.getElementById("photo-preview");
  const removeBtn = document.getElementById("photo-remove-btn");

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      photoDataUrl = reader.result;
      preview.src = photoDataUrl;
      wrap.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener("click", () => {
    photoDataUrl = null;
    input.value = "";
    wrap.style.display = "none";
  });
}

function setPhotoFromUrl(url) {
  photoDataUrl = url;
  const wrap = document.getElementById("photo-preview-wrap");
  const preview = document.getElementById("photo-preview");
  preview.src = url;
  wrap.style.display = "block";
}

/* ---------- Tags ---------- */
function initTags() {
  const input = document.getElementById("tag-input");
  input.addEventListener("keydown", (e) => {
    const isEnter = e.key === "Enter" || e.keyCode === 13 || e.which === 13;
    if (isEnter || e.key === ",") {
      e.preventDefault();
      addTag(input.value);
      input.value = "";
    }
  });
  input.addEventListener("blur", () => {
    if (input.value.trim()) {
      addTag(input.value);
      input.value = "";
    }
  });
}

function addTag(raw) {
  const name = raw.trim().replace(/,$/, "");
  if (!name) return;
  if (tags.some(t => t.toLowerCase() === name.toLowerCase())) return;
  tags.push(name);
  renderTags();
}

function removeTag(name) {
  tags = tags.filter(t => t !== name);
  renderTags();
}

function renderTags() {
  const el = document.getElementById("tag-list");
  el.innerHTML = tags.map(t => `
    <span class="chip">${escapeHTML(t)}<button type="button" class="chip-remove" data-tag="${escapeAttr(t)}" title="Remover tag" aria-label="Remover tag ${escapeAttr(t)}">×</button></span>
  `).join("");
  el.querySelectorAll(".chip-remove").forEach(btn => {
    btn.addEventListener("click", () => removeTag(btn.dataset.tag));
  });
}

/* ---------- Importação por link ---------- */
function initImport() {
  const statusEl = document.getElementById("import-status");

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? "var(--danger)" : "var(--primary)";
  }

  async function applyParsedRecipe(parsed) {
    if (!currentType) {
      setStatus("Selecione a categoria da receita antes de importar.", true);
      return;
    }

    if (parsed.title && !document.getElementById("title").value.trim()) {
      document.getElementById("title").value = parsed.title;
    }

    if (parsed.image) setPhotoFromUrl(parsed.image);

    let added = 0;
    for (const ing of (parsed.ingredients || [])) {
      if (!ing.name) continue;
      const canonicalName = await Ingredients.findOrCreate(currentType, ing.name);
      if (!selectedIngredients.some(i => i.name === canonicalName)) {
        selectedIngredients.push({ name: canonicalName, amount: ing.amount || "", unit: ing.unit || "" });
        added++;
      }
    }
    renderSelectedList();
    renderAvailableList(await getFilteredList(document.getElementById("ingredient-search").value));

    const stepsField = document.getElementById("steps");
    if (parsed.steps && !stepsField.value.trim()) {
      stepsField.value = parsed.steps;
    }

    setStatus(`Receita importada: ${added} ingrediente(s) adicionado(s)${added !== (parsed.ingredients || []).length ? " (alguns já estavam na lista)" : ""}.`, false);
  }

  async function maybeTranslate(parsed) {
    if (!document.getElementById("import-translate").checked) return parsed;
    setStatus("Traduzindo para português...", false);
    try {
      return await translateParsedRecipe(parsed, "en", "pt-br");
    } catch {
      setStatus("Não consegui traduzir agora, aplicando a receita original.", true);
      return parsed;
    }
  }

  document.getElementById("import-url-btn").addEventListener("click", async () => {
    const url = document.getElementById("import-url").value.trim();
    if (!url) {
      setStatus("Cole um link antes de buscar.", true);
      return;
    }
    if (!currentType) {
      setStatus("Selecione a categoria da receita antes de importar.", true);
      return;
    }
    const btn = document.getElementById("import-url-btn");
    btn.disabled = true;
    setStatus("Buscando receita no link...", false);
    try {
      const parsed = await fetchRecipeFromURL(url);
      const finalParsed = await maybeTranslate(parsed);
      await applyParsedRecipe(finalParsed);
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------- Modo de edição ---------- */
async function loadRecipeForEdit() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return;

  const recipe = await Storage.getById(id);
  if (!recipe) return;

  editingId = id;
  document.getElementById("page-title").textContent = "Editar receita";
  document.getElementById("submit-btn").textContent = "Salvar alterações";

  document.getElementById("title").value = recipe.title;
  document.getElementById("steps").value = recipe.steps;
  document.getElementById("notes").value = recipe.notes || "";

  tags = Array.isArray(recipe.tags) ? [...recipe.tags] : [];
  renderTags();

  if (recipe.photo) setPhotoFromUrl(recipe.photo);

  const radio = document.querySelector(`input[name="category"][value="${recipe.category}"]`);
  if (radio) {
    radio.checked = true;
    currentType = CATEGORY_TO_INGREDIENT_TYPE[recipe.category];
    selectedIngredients = recipe.ingredients.map(i => ({ ...i }));
    document.getElementById("ingredient-picker-wrap").style.display = "block";
    document.getElementById("pick-category-hint").style.display = "none";
    document.getElementById("picker-title").textContent =
      currentType === "food" ? "Ingredientes (comida)" : "Ingredientes (bebida)";
    document.getElementById("new-ingredient-type-hint").textContent =
      currentType === "food" ? "comida" : "bebida";
    renderAvailableList(await getFilteredList(""));
    renderSelectedList();
  }
}

function initForm() {
  const form = document.getElementById("recipe-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const category = form.querySelector('input[name="category"]:checked')?.value;
    const steps = document.getElementById("steps").value.trim();
    const notes = document.getElementById("notes").value.trim();

    if (!title || !category || !steps) {
      showToast("Preencha título, categoria e modo de preparo.");
      return;
    }
    if (!selectedIngredients.length) {
      showToast("Adicione pelo menos um ingrediente.");
      return;
    }

    const payload = {
      title,
      category,
      steps,
      notes,
      tags,
      photo: photoDataUrl,
      ingredients: selectedIngredients
    };

    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;

    try {
      if (editingId) {
        await Storage.update(editingId, payload);
        showToast("Receita atualizada!");
        setTimeout(() => { window.location.href = `receita.html?id=${editingId}`; }, 700);
      } else {
        await Storage.save(payload);
        showToast("Receita salva com sucesso!");
        setTimeout(() => { window.location.href = "index.html"; }, 800);
      }
    } catch (err) {
      showToast("Erro ao salvar: " + err.message);
      submitBtn.disabled = false;
    }
  });
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2400);
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await Auth.requireAuth();
  if (!user) return;

  initCategoryWatcher();
  initIngredientPicker();
  initPhotoField();
  initTags();
  initImport();
  initForm();
  await loadRecipeForEdit();
});
