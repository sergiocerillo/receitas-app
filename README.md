# 🍽️ Minhas Receitas

Aplicativo local de gerenciamento de receitas culinárias, 100% funcional no navegador sem necessidade de backend ou autenticação.

## ✨ Recursos

- 📝 Cadastro e edição de receitas (salgadas, doces, bebidas quentes e frias)
- 🔢 Multiplicador de porções (1x, 2x, 3x, 4x) na visualização da receita
- ⭐ Sistema de favoritos
- 🏷️ Tags personalizadas
- 📸 Upload de fotos
- 🛒 Lista de compras
- 🔍 Busca por título, ingredientes ou tags
- 💾 Armazenamento local (localStorage) - sem necessidade de servidor
- 📱 Interface responsiva e moderna

## 🎨 Design

- Paleta de cores vibrante e moderna
- Categorias com cores diferenciadas:
  - 🟠 Salgada: Laranja
  - 🌸 Doce: Rosa vibrante
  - 🔴 Bebida Quente: Laranja avermelhado
  - 🔵 Bebida Fria: Azul
- UX amigável com animações suaves

## 🚀 Como Usar

1. Abra o arquivo `index.html` no seu navegador
2. Comece a cadastrar suas receitas!
3. Todos os dados ficam salvos localmente no navegador

## 📦 Tecnologias

- HTML5
- CSS3 (Custom Properties, Grid, Flexbox)
- JavaScript (ES6+)
- localStorage API

## 💡 Novidades da Última Versão

- ✅ Removida necessidade de autenticação/senha
- ✅ Sistema 100% local com localStorage
- ✅ Paleta de cores renovada e mais vibrante
- ✅ Multiplicador de receita adicionado (1x-4x)
- ✅ Interface mais limpa e moderna
- ✅ Sem dependências externas

## 📝 Estrutura

```
receitas-app/
├── index.html              # Página inicial
├── cadastro.html           # Formulário de cadastro/edição
├── receita.html            # Visualização detalhada
├── salgadas.html           # Lista de receitas salgadas
├── doces.html              # Lista de receitas doces
├── bebidas-quentes.html    # Lista de bebidas quentes
├── bebidas-frias.html      # Lista de bebidas frias
├── ingredientes-comida.html    # Gerenciar ingredientes de comida
├── ingredientes-bebidas.html   # Gerenciar ingredientes de bebidas
├── lista-compras.html      # Lista de compras
├── css/
│   └── style.css          # Estilos principais
├── js/
│   ├── app.js             # Funções principais
│   ├── auth.js            # Sistema de autenticação (mock)
│   ├── storage.js         # Persistência localStorage
│   ├── ingredients.js     # Gerenciamento de ingredientes
│   ├── cadastro.js        # Lógica do formulário
│   └── translate.js       # Tradução de receitas
└── images/                # Ícones e logos
```

## 🎯 Funcionalidades Futuras

- [ ] Exportar/importar receitas em JSON
- [ ] Modo escuro
- [ ] Impressão otimizada de receitas
- [ ] Filtros avançados
- [ ] Cálculos nutricionais

---

Desenvolvido com ❤️ para amantes da culinária
