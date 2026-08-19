// Camada de persistência via Supabase (Postgres + Row Level Security).
// Toda função aqui é assíncrona — use sempre com await.
// Depende de js/supabaseClient.js (variável global `sb`) já carregado.

const Storage = {
  async _userId() {
    const { data } = await sb.auth.getUser();
    if (!data?.user) throw new Error("Não autenticado.");
    return data.user.id;
  },

  async getAll() {
    const { data, error } = await sb.from("recipes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // Envia uma foto para o bucket "recipe-photos" e retorna a URL pública
  // (isso é o que fica salvo em recipes.photo, em vez do base64 antigo).
  async uploadPhoto(file) {
    const user_id = await this._userId();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("recipe-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });
    if (error) throw error;
    const { data } = sb.storage.from("recipe-photos").getPublicUrl(path);
    return data.publicUrl;
  },

  // Apaga uma foto do bucket a partir da URL pública salva na receita.
  // Best-effort: não trava a UI nem lança erro (ex: fotos antigas em base64,
  // ou vindas de importação por link, não estão no nosso bucket — ignora).
  deletePhoto(url) {
    if (!url || !url.includes("/recipe-photos/")) return;
    const path = decodeURIComponent(url.split("/recipe-photos/")[1] || "");
    if (!path) return;
    sb.storage.from("recipe-photos").remove([path]).catch(() => {});
  },

  async save(recipe) {
    const user_id = await this._userId();
    const { data, error } = await sb.from("recipes").insert({ ...recipe, user_id }).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await sb.from("recipes").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await sb.from("recipes").delete().eq("id", id);
    if (error) throw error;
  },

  async getById(id) {
    const { data, error } = await sb.from("recipes").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async byCategory(category) {
    const { data, error } = await sb.from("recipes").select("*").eq("category", category).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async recent(limit = 8) {
    const { data, error } = await sb.from("recipes").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },

  async favorites() {
    const { data, error } = await sb.from("recipes").select("*").eq("favorite", true).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async toggleFavorite(id) {
    const recipe = await this.getById(id);
    if (!recipe) return;
    return this.update(id, { favorite: !recipe.favorite });
  },

  // Busca simples client-side (título, ingredientes, tags) — o volume de
  // receitas de um app pessoal não justifica full-text search no banco.
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

  // Importa um backup (gerado por este app) para a conta atualmente logada.
  // Receitas antigas ganham novo id/user_id; preferências de ingredientes são mescladas.
  async importBackup(json) {
    const data = JSON.parse(json);
    const user_id = await this._userId();

    if (Array.isArray(data.recipes) && data.recipes.length) {
      const rows = data.recipes.map(r => {
        const { id, user_id: _old, created_at, ...rest } = r;
        return { ...rest, user_id };
      });
      const { error } = await sb.from("recipes").insert(rows);
      if (error) throw error;
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
  async _getPrefsRow() {
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) throw new Error("Não autenticado.");
    const user_id = userData.user.id;

    const { data, error } = await sb.from("ingredient_prefs").select("*").eq("user_id", user_id).maybeSingle();
    if (error) throw error;
    if (data) return data;

    const defaults = {
      user_id, custom_food: [], custom_drink: [], hidden_food: [], hidden_drink: [],
      custom_food_groups: [], custom_drink_groups: []
    };
    const { data: created, error: insertError } = await sb.from("ingredient_prefs").insert(defaults).select().single();
    if (insertError) throw insertError;
    return created;
  },

  async _savePrefsRow(patch) {
    const user_id = await Storage._userId();
    const { error } = await sb.from("ingredient_prefs").update(patch).eq("user_id", user_id);
    if (error) throw error;
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
