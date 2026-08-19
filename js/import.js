// Importação de receitas a partir de um link: busca a página (direto, e se o
// site bloquear por CORS tenta de novo via um proxy público) e extrai título,
// ingredientes e preparo dos dados estruturados schema.org/Recipe (JSON-LD ou
// microdata) que a grande maioria dos sites de receita já publica.

const UNIT_PATTERN = "(kg|g|ml|l|litros?|xícaras?|cups?|colheres? de sopa|colheres? de chá|colher de sopa|colher de chá|tablespoons?|tbsp|teaspoons?|tsp|dentes?|cloves?|fatias?|slices?|latas?|cans?|pitadas?|pinch(?:es)?|unidades?|units?)";

function normalizeUnit(raw) {
  if (!raw) return "";
  const u = raw.toLowerCase();
  if (u === "g") return "g";
  if (u === "kg") return "kg";
  if (u === "ml") return "ml";
  if (u === "l" || u.startsWith("litro")) return "L";
  if (u.startsWith("xícara") || u.startsWith("cup")) return "xícara";
  if ((u.startsWith("colher") && u.includes("sopa")) || u.startsWith("tablespoon") || u === "tbsp") return "colher de sopa";
  if ((u.startsWith("colher") && u.includes("chá")) || u.startsWith("teaspoon") || u === "tsp") return "colher de chá";
  if (u.startsWith("dente") || u.startsWith("clove")) return "dente";
  if (u.startsWith("fatia") || u.startsWith("slice")) return "fatia";
  if (u.startsWith("lata") || u.startsWith("can")) return "lata";
  if (u.startsWith("pitada") || u.startsWith("pinch")) return "pitada";
  if (u.startsWith("unidade") || u.startsWith("unit")) return "unidade";
  return "";
}

// Extrai {amount, unit, name} de uma linha de ingrediente em texto livre.
function parseIngredientLine(line) {
  // Remove apenas marcadores de lista de verdade ("- ", "• ", "1. ", "2) ")
  // sem comer quantidades como "2 xícaras".
  line = line.replace(/^(?:[-•*]\s+|\d+[\.\)]\s+)/, "").trim();
  if (!line) return null;

  const re = new RegExp(`^(\\d+[\\.,]?\\d*)\\s*(?:${UNIT_PATTERN})?\\s*(?:de\\s+)?(.+)$`, "i");
  const match = line.match(re);

  if (match) {
    const amount = match[1].replace(",", ".");
    const unit = normalizeUnit(match[2]);
    const name = match[3].trim().replace(/\.$/, "");
    return { amount, unit, name: capitalize(name) };
  }

  const gostoMatch = line.match(/^(.+?)\s+(?:a gosto|to taste)\.?$/i);
  if (gostoMatch) {
    return { amount: "", unit: "a gosto", name: capitalize(gostoMatch[1].trim()) };
  }

  return { amount: "", unit: "", name: capitalize(line.replace(/\.$/, "")) };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stepsFromInstructions(recipeInstructions) {
  if (Array.isArray(recipeInstructions)) {
    return recipeInstructions
      .map(s => (typeof s === "string" ? s : s.text || ""))
      .filter(Boolean)
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");
  }
  if (typeof recipeInstructions === "string") return recipeInstructions;
  return "";
}

// Tenta extrair um objeto Recipe (schema.org, formato JSON-LD) do HTML.
function extractFromJsonLd(doc) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : (data["@graph"] || [data]);
      const recipe = items.find(i => {
        const type = i["@type"];
        return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
      });
      if (!recipe) continue;

      const rawIngredients = recipe.recipeIngredient || recipe.ingredients || [];
      let image = "";
      if (typeof recipe.image === "string") image = recipe.image;
      else if (Array.isArray(recipe.image)) image = recipe.image[0];
      else if (recipe.image && recipe.image.url) image = recipe.image.url;

      return {
        title: recipe.name || "",
        ingredients: rawIngredients.map(parseIngredientLine).filter(Boolean),
        steps: stepsFromInstructions(recipe.recipeInstructions),
        image
      };
    } catch {
      // bloco JSON-LD inválido — tenta o próximo
    }
  }
  return null;
}

// Fallback para sites que só marcam a receita com microdata (itemprop=...)
// em vez de JSON-LD.
function extractFromMicrodata(doc) {
  const ingredientEls = doc.querySelectorAll('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
  if (!ingredientEls.length) return null;

  const ingredients = Array.from(ingredientEls)
    .map(el => el.textContent.trim())
    .filter(Boolean)
    .map(parseIngredientLine)
    .filter(Boolean);

  const stepEls = doc.querySelectorAll('[itemprop="recipeInstructions"]');
  const steps = Array.from(stepEls)
    .map(el => el.textContent.trim())
    .filter(Boolean)
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  const title = doc.querySelector('[itemprop="name"]')?.textContent.trim()
    || doc.querySelector('meta[property="og:title"]')?.content
    || doc.querySelector("title")?.textContent.trim()
    || "";

  const image = doc.querySelector('meta[property="og:image"]')?.content || "";

  return { title, ingredients, steps, image };
}

function extractRecipeFromHTML(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return extractFromJsonLd(doc) || extractFromMicrodata(doc);
}

const CORS_PROXY = "https://api.allorigins.win/raw?url=";

async function fetchHTML(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) return await res.text();
  } catch {
    // segue para o proxy abaixo
  }
  // Muitos sites bloqueiam fetch direto do navegador (CORS). Um proxy público
  // repassa a página sem esse bloqueio — é o melhor esforço possível sem
  // um servidor próprio.
  const proxyRes = await fetch(CORS_PROXY + encodeURIComponent(url));
  if (!proxyRes.ok) throw new Error("Não foi possível acessar essa página.");
  return await proxyRes.text();
}

async function fetchRecipeFromURL(url) {
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  let html;
  try {
    html = await fetchHTML(url);
  } catch {
    throw new Error("Não consegui acessar esse link. Confira se está correto ou tente novamente em instantes.");
  }

  const parsed = extractRecipeFromHTML(html);
  if (!parsed || !parsed.ingredients.length) {
    throw new Error("Não encontrei uma receita estruturada nessa página. Tente outro link.");
  }
  return parsed;
}
