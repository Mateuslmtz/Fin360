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
  'investimentos': pageInvestimentos,
  'parcelamentos': (c) => pagePlaceholder(c, 'parcelamentos'),
  'extrato': (c) => pagePlaceholder(c, 'extrato'),
  'conciliacao': (c) => pagePlaceholder(c, 'conciliacao'),
  'planejamento': (c) => pagePlaceholder(c, 'planejamento'),
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

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  Store.load();
  applyShellState();
  if (!location.hash) location.hash = '#/dashboard';
  render();
});
