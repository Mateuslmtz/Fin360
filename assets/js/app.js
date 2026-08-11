/* Fin360 — bootstrap + roteamento por hash */

const ROUTES = {
  'dashboard': pageDashboard,
  'resumo': pageResumo,
  'gastos-fixos': pageGastosFixos,
  'gastos-variaveis': pageGastosVariaveis,
  'bancos': pageBancos,
  'recebimentos': pageRecebimentos,
  'cofrinhos': pageCofrinhos,
  'cartoes': pageCartoes,
  'extrato': pageExtrato,
  'planejamento': pagePlanejamento,
  'importar': pageImportar,
  'assistente': pageAssistente,
  'configuracoes': pageConfiguracoes,
};

function currentRoute() {
  const hash = location.hash.replace('#/', '');
  return ROUTES[hash] ? hash : 'dashboard';
}

function render() {
  const route = currentRoute();
  renderSidebar(route);
  renderTopbar(route);
  const container = document.getElementById('page-content');
  ROUTES[route](container);
}

async function bootApp() {
  hideAuthScreen();
  await Store.load();

  // sessão morreu enquanto o app carregava: mandar pro login em vez de deixar a
  // pessoa usando um app que não salva nada
  if (Store.sessaoExpirou) {
    showAuthScreen('login');
    const erro = document.getElementById('auth-error');
    if (erro) {
      erro.textContent = 'Sua sessão expirou. Entre de novo.';
      erro.style.display = 'block';
    }
    return;
  }

  const user = Auth.currentUser();
  if (user) {
    // o nome e o e-mail moram na conta do servidor; o perfil local só espelha
    if (Store.state.profile.name !== user.name || Store.state.profile.email !== user.email) {
      Store.state.profile.name = user.name;
      Store.state.profile.email = user.email;
      Store.save();
    }
  }
  applyShellState();
  if (!location.hash) location.hash = '#/dashboard';
  render();
  if (Store.offline) {
    toast('Sem conexão com o servidor. Você pode usar o app normalmente — as alterações sobem quando a internet voltar.', 'info');
  }
  const aportes = Store.processAportesAutomaticos();
  if (aportes.length) {
    aportes.forEach((a) => toast(`Aporte automático de ${formatCurrency(a.valor)} feito em "${a.nome}"`, 'success'));
    render();
  }

  // depois do render, para a janela não aparecer sobre uma tela ainda em branco
  avisarRenovacaoNaEntrada();
}

window.addEventListener('hashchange', render);

// gravação pendente não pode morrer junto com a aba
window.addEventListener('pagehide', () => Store.flushAoSair());

window.addEventListener('DOMContentLoaded', async () => {
  Auth.load();

  // link de e-mail (confirmação de cadastro ou recuperação de senha)
  const tipoLink = await consumirTokenDaURL();
  if (tipoLink === 'recovery') {
    showAuthScreen('reset');
    return;
  }

  if (!Auth.isLoggedIn()) {
    showAuthScreen('login');
    return;
  }
  await bootApp();
});
