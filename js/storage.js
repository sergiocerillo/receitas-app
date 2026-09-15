// Camada de persistência via localStorage - totalmente local, sem backend
// Toda função aqui é assíncrona (por compatibilidade) — use sempre com await.

const Storage = {
  _getRecipes() {
    const data = localStorage.getItem('recipes');
    return data ? JSON.parse(data) : [];
  },

  _saveRecipes(recipes) {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  },

  async getAll() {
    return this._getRecipes().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async uploadPhoto(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  },

  deletePhoto(url) {
    // Fotos em base64 não precisam ser deletadas
  },

  async save(recipe) {
    const recipes = this._getRecipes();
    const newRecipe = {
      ...recipe,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      user_id: 'local-user'
    };
    recipes.push(newRecipe);
    this._saveRecipes(recipes);
    await Ingredients.syncRecipeIngredient(newRecipe);
    return newRecipe;
  },

  async update(id, patch) {
    const recipes = this._getRecipes();
    const index = recipes.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Receita não encontrada');
    recipes[index] = { ...recipes[index], ...patch };
    this._saveRecipes(recipes);
    await Ingredients.syncRecipeIngredient(recipes[index]);
    return recipes[index];
  },

  async remove(id) {
    const recipes = this._getRecipes();
    const filtered = recipes.filter(r => r.id !== id);
    this._saveRecipes(filtered);
    await Ingredients.removeRecipeIngredient(id);
  },

  async getById(id) {
    const recipes = this._getRecipes();
    return recipes.find(r => r.id === id) || null;
  },

  async byCategory(category) {
    const all = await this.getAll();
    return all.filter(r => r.category === category);
  },

  async recent(limit = 8) {
    const all = await this.getAll();
    return all.slice(0, limit);
  },

  async favorites() {
    const all = await this.getAll();
    return all.filter(r => r.favorite === true);
  },

  async customRecipes(excludeId = null) {
    const all = await this.getAll();
    return all
      .filter(r => r.is_custom_recipe && r.id !== excludeId)
      .map(r => ({ id: r.id, title: r.title, category: r.category }))
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  async toggleFavorite(id) {
    const recipe = await this.getById(id);
    if (!recipe) return;
    return this.update(id, { favorite: !recipe.favorite });
  },

  async markCooked(id) {
    const recipe = await this.getById(id);
    if (!recipe) return;
    const log = [...(recipe.cook_log || []), new Date().toISOString()];
    return this.update(id, { cook_log: log });
  },

  async unmarkLastCooked(id) {
    const recipe = await this.getById(id);
    if (!recipe || !recipe.cook_log?.length) return;
    const log = recipe.cook_log.slice(0, -1);
    return this.update(id, { cook_log: log });
  },

  async search(term) {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    const all = await this.getAll();
    return all.filter(r =>
      r.title.toLowerCase().includes(t) ||
      r.ingredients.some(i => i.name.toLowerCase().includes(t)) ||
      (r.tags || []).some(tag => tag.toLowerCase().includes(t))
    );
  },

  async exportBackup() {
    const recipes = await this.getAll();
    const prefs = await Ingredients._getPrefsRow();
    return JSON.stringify({ recipes, ingredientPrefs: prefs, exportedAt: new Date().toISOString() }, null, 2);
  },

  async importBackup(json) {
    const data = JSON.parse(json);
    if (Array.isArray(data.recipes) && data.recipes.length) {
      const recipes = this._getRecipes();
      const imported = data.recipes.map(r => ({
        ...r,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        user_id: 'local-user',
        created_at: r.created_at || new Date().toISOString()
      }));
      this._saveRecipes([...recipes, ...imported]);
    }

    if (data.ingredientPrefs) {
      const current = await Ingredients._getPrefsRow();
      const merge = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));
      await Ingredients._savePrefsRow({
        custom_food: merge(current.custom_food, data.ingredientPrefs.custom_food),
        custom_drink: merge(current.custom_drink, data.ingredientPrefs.custom_drink),
        hidden_food: merge(current.hidden_food, data.ingredientPrefs.hidden_food),
        hidden_drink: merge(current.hidden_drink, data.ingredientPrefs.hidden_drink)
      });
    }
  }
};

const CATEGORY_LABELS = {
  "salgada": "Receita salgada",
  "doce": "Receita doce",
  "bebida-quente": "Bebida quente",
  "bebida-fria": "Bebida fria"
};

// Categoria da receita -> tipo de ingrediente que deve ser exibido.
const CATEGORY_TO_INGREDIENT_TYPE = {
  "salgada": "food",
  "doce": "food",
  "bebida-quente": "drink",
  "bebida-fria": "drink"
};

const Ingredients = {
  _getPrefsRow() {
    const data = localStorage.getItem('ingredient_prefs');
    if (data) return JSON.parse(data);
    
    const defaults = {
      user_id: 'local-user',
      custom_food: [],
      custom_drink: [],
      hidden_food: [],
      hidden_drink: [],
      custom_food_groups: [],
      custom_drink_groups: []
    };
    localStorage.setItem('ingredient_prefs', JSON.stringify(defaults));
    return defaults;
  },

  async _savePrefsRow(patch) {
    const current = this._getPrefsRow();
    const updated = { ...current, ...patch };
    localStorage.setItem('ingredient_prefs', JSON.stringify(updated));
  },

  // Mantém receitas-base marcadas como personalizadas disponíveis também na
  // lista comum de ingredientes. O tipo vem da categoria da receita:
  // salgadas/doces viram comida; bebidas quentes/frias viram bebida.
  async syncRecipeIngredient(recipe) {
    const prefs = await this._getPrefsRow();
    const clean = type => this._normalizeCustom(prefs[`custom_${type}`])
      .filter(item => item.recipe_id !== recipe.id);
    let food = clean("food");
    let drink = clean("drink");

    if (recipe.is_custom_recipe) {
      const type = CATEGORY_TO_INGREDIENT_TYPE[recipe.category];
      const item = { name: recipe.title, group: "Outros", recipe_id: recipe.id };
      if (type === "food") food = [...food, item];
      if (type === "drink") drink = [...drink, item];
    }

    await this._savePrefsRow({ custom_food: food, custom_drink: drink });
  },

  async removeRecipeIngredient(recipeId) {
    const prefs = await this._getPrefsRow();
    const remove = type => this._normalizeCustom(prefs[`custom_${type}`])
      .filter(item => item.recipe_id !== recipeId);
    await this._savePrefsRow({ custom_food: remove("food"), custom_drink: remove("drink") });
  },

  // Cada item customizado é {name, group}. Dados antigos (só o nome, string
  // solta) viram {name, group: "Outros"} automaticamente ao ler.
  _normalizeCustom(list) {
    return (list || []).map(item =>
      typeof item === "string" ? { name: item, group: "Outros" } : item
    );
  },

  async getCustom(type) {
    const prefs = await this._getPrefsRow();
    return this._normalizeCustom(prefs[`custom_${type}`]);
  },

  async addCustom(type, name, group = "Outros") {
    name = name.trim();
    if (!name) return false;
    const prefs = await this._getPrefsRow();
    const base = type === "food" ? FOOD_INGREDIENTS : DRINK_INGREDIENTS;
    const custom = this._normalizeCustom(prefs[`custom_${type}`]);
    const exists = base.some(i => i.toLowerCase() === name.toLowerCase()) ||
      custom.some(i => i.name.toLowerCase() === name.toLowerCase());
    if (exists) return false;
    await this._savePrefsRow({ [`custom_${type}`]: [...custom, { name, group }] });
    return true;
  },

  async removeCustom(type, name) {
    const prefs = await this._getPrefsRow();
    const custom = this._normalizeCustom(prefs[`custom_${type}`]).filter(i => i.name !== name);
    await this._savePrefsRow({ [`custom_${type}`]: custom });
  },

  async hideBase(type, name) {
    const prefs = await this._getPrefsRow();
    const hidden = prefs[`hidden_${type}`] || [];
    if (!hidden.includes(name)) {
      await this._savePrefsRow({ [`hidden_${type}`]: [...hidden, name] });
    }
  },

  async unhideBase(type, name) {
    const prefs = await this._getPrefsRow();
    const hidden = (prefs[`hidden_${type}`] || []).filter(i => i !== name);
    await this._savePrefsRow({ [`hidden_${type}`]: hidden });
  },

  async getHidden(type) {
    const prefs = await this._getPrefsRow();
    return prefs[`hidden_${type}`] || [];
  },

  async remove(type, name) {
    const custom = await this.getCustom(type);
    if (custom.some(i => i.name === name)) {
      await this.removeCustom(type, name);
    } else {
      await this.hideBase(type, name);
    }
  },

  async getAll(type) {
    const base = type === "food" ? FOOD_INGREDIENTS : DRINK_INGREDIENTS;
    const prefs = await this._getPrefsRow();
    const hidden = prefs[`hidden_${type}`] || [];
    const custom = this._normalizeCustom(prefs[`custom_${type}`]);
    return [...base.filter(i => !hidden.includes(i)), ...custom.map(i => i.name)];
  },

  // Categorias extras criadas pelo usuário, além das já embutidas em
  // FOOD_INGREDIENT_GROUPS / DRINK_INGREDIENT_GROUPS.
  async getCustomGroups(type) {
    const prefs = await this._getPrefsRow();
    return prefs[`custom_${type}_groups`] || [];
  },

  async addCustomGroup(type, name) {
    name = name.trim();
    if (!name) return false;
    const baseGroups = Object.keys(type === "food" ? FOOD_INGREDIENT_GROUPS : DRINK_INGREDIENT_GROUPS);
    const prefs = await this._getPrefsRow();
    const customGroups = prefs[`custom_${type}_groups`] || [];
    const exists = [...baseGroups, ...customGroups, "Outros"].some(g => g.toLowerCase() === name.toLowerCase());
    if (exists) return false;
    await this._savePrefsRow({ [`custom_${type}_groups`]: [...customGroups, name] });
    return true;
  },

  // Retorna o nome já cadastrado (respeitando a grafia existente) ou,
  // se não existir, cadastra automaticamente e retorna o nome informado.
  async findOrCreate(type, name) {
    name = name.trim();
    const all = await this.getAll(type);
    const existing = all.find(i => i.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    await this.addCustom(type, name);
    return name;
  }
};

const UNITS = ["g", "kg", "ml", "L", "unidade", "xícara", "colher de sopa", "colher de chá", "dente", "fatia", "lata", "pitada", "a gosto"];

// Heurística simples para avisar sobre ingredientes que costumam não ser vegetarianos.
const NON_VEG_KEYWORDS = [
  "frango", "carne", "boi", "porco", "bacon", "linguiça", "presunto", "peixe",
  "camarão", "atum", "sardinha", "peru", "salsicha", "charque", "lombo", "costela",
  "filé", "picanha", "alcatra", "fraldinha", "patinho", "acém", "lagarto", "cordeiro",
  "vitela", "anchova", "bife", "mortadela", "salame", "banha", "gelatina animal", "tilápia", "salmão", "bacalhau"
];

function isLikelyNonVeg(name) {
  const n = name.toLowerCase();
  return NON_VEG_KEYWORDS.some(k => n.includes(k));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatQty(ing) {
  if (!ing.amount && !ing.unit) return "";
  if (ing.unit === "a gosto") return "a gosto";
  return [ing.amount, ing.unit].filter(Boolean).join(" ");
}
