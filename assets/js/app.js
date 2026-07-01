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
  'parcelamentos': pageParcelamentos,
  'extrato': pageExtrato,
  'conciliacao': pageConciliacao,
  'planejamento': pagePlanejamento,
  'importar': pageImportar,
  'vera': pageVera,
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

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  Store.load();
  applyShellState();
  if (!location.hash) location.hash = '#/dashboard';
  render();
});
