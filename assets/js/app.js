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
  'conciliacao': pageConciliacao,
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

function bootApp() {
  hideAuthScreen();
  Store.load();
  const user = Auth.currentUser();
  if (user) {
    Store.state.profile.name = user.name;
    Store.state.profile.email = user.email;
    Store.save();
  }
  applyShellState();
  if (!location.hash) location.hash = '#/dashboard';
  render();
  const aportes = Store.processAportesAutomaticos();
  if (aportes.length) {
    aportes.forEach((a) => toast(`Aporte automático de ${formatCurrency(a.valor)} feito em "${a.nome}"`, 'success'));
    render();
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  Auth.load();
  if (!Auth.isLoggedIn()) {
    showAuthScreen(Auth.data.accounts.length ? 'login' : 'register');
    return;
  }
  bootApp();
});
