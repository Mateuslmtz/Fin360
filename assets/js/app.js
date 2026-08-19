/* Fin360 — bootstrap + roteamento por hash */

const ROUTES = {
  'dashboard': pageDashboard,
  'lancamentos': pageLancamentos,
  'bancos': pageBancos,
  'cofrinhos': pageCofrinhos,
  'cartoes': pageCartoes,
  'extrato': pageExtrato,
  'planejamento': pagePlanejamento,
  'importar': pageImportar,
  'configuracoes': pageConfiguracoes,
};

// as três abas antigas viraram uma só: quem tem link/favorito velho cai em Lançamentos.
// 'assistente' saiu do ar: a tela existia mas era só maquete, e prometia uma IA que não
// funciona — pageAssistente continua no pages.js pra quando o recurso for de verdade.
const ROTAS_ANTIGAS = {
  'recebimentos': 'lancamentos',
  'gastos-variaveis': 'lancamentos',
  'gastos-fixos': 'lancamentos',
  'assistente': 'dashboard',
  // Resumo e Extrato eram a mesma pergunta em duas telas; viraram uma so
  'resumo': 'extrato',
};

function currentRoute() {
  const hash = location.hash.replace('#/', '');
  if (ROTAS_ANTIGAS[hash]) return ROTAS_ANTIGAS[hash];
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
    // quem vem da página de boas-vindas acabou de comprar e ainda não tem conta:
    // abrir direto no cadastro poupa um clique e evita cair no "Entrar" por engano
    const querCadastro = new URLSearchParams(location.search).has('cadastro');
    showAuthScreen(querCadastro ? 'register' : 'login');
    return;
  }
  await bootApp();
});
