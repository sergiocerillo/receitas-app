// Camada fina sobre o Supabase Auth. O app usa uma única conta compartilhada
// (SHARED_ACCOUNT_EMAIL, definida em js/config.js) por trás da tela de
// login — quem acessa o app só vê e digita uma senha, nunca um e-mail.
const Auth = {
  async signInWithSitePassword(password) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: SHARED_ACCOUNT_EMAIL,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await sb.auth.signOut();
    window.location.href = "login.html";
  },

  async getUser() {
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  },

  // Chame no topo de toda página protegida: redireciona para o login se
  // ninguém estiver autenticado.
  async requireAuth() {
    const user = await this.getUser();
    if (!user) {
      window.location.href = "login.html";
      return null;
    }
    return user;
  }
};

// Liga o botão de sair, quando a página tiver esse elemento.
async function initAuthNav() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => Auth.signOut());
}
