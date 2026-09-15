// Sistema local - sem autenticação necessária
const Auth = {
  async requireAuth() {
    // Retorna usuário mock para compatibilidade com código existente
    return { id: 'local-user', email: 'user@local' };
  },

  async getUser() {
    return { id: 'local-user', email: 'user@local' };
  }
};

// Remove o botão de logout se existir, já que não é mais necessário
async function initAuthNav() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.style.display = 'none';
}
