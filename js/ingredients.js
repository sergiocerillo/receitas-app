// Ingredientes-base, separados por tipo de receita.
// "food"  -> usados em receitas salgadas e doces (cozinha vegetariana)
// "drink" -> usados em bebidas quentes e frias (estilo cardápio de cafeteria)

const FOOD_INGREDIENTS = [
  // Ovos e laticínios
  "Ovo","Clara de ovo","Gema de ovo","Leite integral","Leite desnatado","Leite condensado",
  "Creme de leite","Manteiga","Margarina","Queijo mussarela","Queijo prato","Queijo parmesão",
  "Queijo minas","Queijo coalho","Queijo gorgonzola","Queijo brie","Requeijão","Cream cheese",
  "Iogurte natural","Iogurte grego","Nata","Ricota",

  // Grãos, farinhas e massas
  "Arroz branco","Arroz integral","Arroz arbóreo","Feijão carioca","Feijão preto","Feijão branco",
  "Lentilha","Grão de bico","Ervilha seca","Farinha de trigo","Farinha de mandioca","Farinha de milho",
  "Farinha de rosca","Fubá","Amido de milho","Aveia em flocos","Quinoa","Macarrão espaguete",
  "Macarrão parafuso","Macarrão penne","Lasanha (massa)","Pão de forma","Pão francês","Pão de alho",
  "Massa folhada","Massa de pastel","Tapioca (goma)","Polvilho doce","Polvilho azedo","Grão de trigo (bulgur)",

  // Proteína vegetal
  "Tofu","Tofu defumado","Proteína de soja (PVT)","Grão de bico cozido","Hambúrguer vegetal",
  "Seitan","Cogumelo shitake","Cogumelo paris","Champignon","Cogumelo portobello",

  // Vegetais e legumes
  "Cebola","Alho","Tomate","Tomate cereja","Batata","Batata doce","Cenoura","Abobrinha","Abóbora",
  "Chuchu","Pimentão verde","Pimentão vermelho","Pimentão amarelo","Pepino","Beterraba","Berinjela",
  "Alface","Rúcula","Espinafre","Couve","Repolho","Repolho roxo","Brócolis","Couve-flor","Vagem",
  "Milho verde","Ervilha fresca","Aspargos","Pimenta dedo de moça","Jiló","Quiabo","Mandioca","Inhame",
  "Nabo","Rabanete","Alho-poró","Gengibre","Palmito","Azeitona verde","Azeitona preta",

  // Frutas
  "Banana","Maçã","Laranja","Limão","Limão siciliano","Abacaxi","Morango","Uva","Manga",
  "Mamão","Melancia","Melão","Abacate","Coco ralado","Maracujá","Kiwi","Pêra","Pêssego","Framboesa",
  "Mirtilo","Caju","Goiaba","Ameixa","Tangerina","Carambola","Damasco seco","Tâmara","Uva passa",

  // Temperos e ervas
  "Sal","Pimenta do reino","Páprica doce","Páprica picante","Cominho","Orégano","Manjericão",
  "Salsinha","Cebolinha","Coentro","Louro","Alecrim","Tomilho","Canela em pó","Canela em pau",
  "Cravo","Noz-moscada","Curry","Colorau","Açafrão","Caldo de legumes","Molho de soja (shoyu)",
  "Molho inglês vegetariano","Molho de pimenta","Mostarda","Ketchup","Maionese","Vinagre branco",
  "Vinagre balsâmico","Azeite de oliva","Óleo de soja","Óleo de girassol","Óleo de coco",
  "Extrato de tomate","Molho de tomate pronto","Fermento em pó","Fermento biológico",
  "Bicarbonato de sódio","Baunilha (essência)",

  // Açúcares e doces
  "Açúcar refinado","Açúcar cristal","Açúcar mascavo","Açúcar de confeiteiro","Mel","Chocolate em pó",
  "Chocolate ao leite","Chocolate meio amargo","Chocolate branco","Achocolatado","Leite em pó",
  "Doce de leite","Goiabada","Gelatina em pó (sem sabor)",

  // Nozes e sementes
  "Amendoim","Castanha de caju","Castanha do pará","Nozes","Amêndoas","Avelã","Semente de chia",
  "Semente de linhaça","Gergelim","Pistache","Semente de girassol","Semente de abóbora",
];

const DRINK_INGREDIENTS = [
  // Bases de café e chá
  "Café coado","Café espresso","Café espresso duplo (dose dupla)","Café descafeinado","Café coado forte",
  "Grãos de café moídos","Cold brew (café extração fria)","Chá preto","Chá verde","Chá branco",
  "Chá mate","Chá de camomila","Chá de hortelã","Chá de erva-cidreira","Chá de gengibre","Erva-mate",
  "Chá gelado (base)","Chocolate quente (base)","Achocolatado",

  // Leites e cremes
  "Leite integral","Leite desnatado","Leite vaporizado (steamed milk)","Leite de amêndoas",
  "Leite de aveia","Leite de coco","Leite condensado","Creme de leite","Chantilly",
  "Espuma de leite (milk foam)","Leite em pó",

  // Xaropes
  "Xarope de baunilha","Xarope de caramelo","Xarope de avelã","Xarope de coco","Xarope de menta",
  "Xarope de canela","Xarope de café","Xarope de framboesa","Xarope de maçã verde","Xarope de gengibre",
  "Xarope simples (açúcar + água)","Xarope de amêndoas (orgeat)","Xarope de morango","Xarope de maracujá",

  // Coberturas e finalização
  "Calda de chocolate","Calda de caramelo","Canela em pó","Cacau em pó","Marshmallow",
  "Raspas de chocolate","Raspas de limão","Folhas de hortelã","Sal (borda)","Açúcar (borda)",

  // Preparos específicos de café (podem entrar como "ingrediente" do preparo)
  "Espresso simples","Cappuccino (mix leite+espuma)","Café com leite","Macchiato","Latte",
  "Flat white","Mocha (café + chocolate)","Affogato (café + sorvete)","Café gelado",

  // Sucos e outras bases
  "Água","Água com gás","Água mineral","Água de coco","Suco de laranja","Suco de limão",
  "Suco de uva","Suco de abacaxi","Suco de maracujá","Limonada (base)","Refrigerante de cola",
  "Refrigerante de guaraná","Água tônica","Gelo","Gelo triturado","Açúcar refinado","Açúcar mascavo",
  "Mel","Adoçante",

  // Bebidas alcoólicas (para drinks)
  "Cachaça","Vodka","Gin","Rum branco","Whisky","Vinho tinto","Vinho branco","Espumante",
  "Licor de café","Vermute",
];

// Mantido por retrocompatibilidade (não usado diretamente na UI nova).
const INGREDIENTS = [...FOOD_INGREDIENTS, ...DRINK_INGREDIENTS];
