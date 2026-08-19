// Tradução automática usando a API pública e gratuita MyMemory
// (https://mymemory.translated.net/). Sem chave, sem custo, mas com limite
// de tamanho por requisição e de uso diário — por isso traduzimos linha a
// linha e falhamos "graciosamente" quando o serviço não responde.

async function translateLine(text, sourceLang, targetLang) {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao traduzir (serviço indisponível).");
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("Não foi possível traduzir esse texto.");
  return translated;
}

// Traduz um bloco de texto (multi-linha) preservando as quebras de linha.
async function translateText(text, sourceLang = "en", targetLang = "pt-br") {
  if (!text || !text.trim()) return text;
  const lines = text.split("\n");
  const results = [];
  for (const line of lines) {
    if (!line.trim()) { results.push(""); continue; }
    try {
      results.push(await translateLine(line, sourceLang, targetLang));
    } catch {
      results.push(line); // mantém o original se a tradução dessa linha falhar
    }
  }
  return results.join("\n");
}

// Traduz título, ingredientes e passo a passo de uma receita "parseada"
// (mesmo formato usado pelo importador de links/texto colado).
async function translateParsedRecipe(parsed, sourceLang = "en", targetLang = "pt-br") {
  const title = parsed.title ? await translateLine(parsed.title, sourceLang, targetLang) : parsed.title;

  const ingredients = [];
  for (const ing of parsed.ingredients || []) {
    let name = ing.name;
    try { name = await translateLine(ing.name, sourceLang, targetLang); } catch { /* mantém original */ }
    ingredients.push({ ...ing, name: capitalizeFirst(name) });
  }

  const steps = await translateText(parsed.steps || "", sourceLang, targetLang);

  return { ...parsed, title, ingredients, steps };
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
