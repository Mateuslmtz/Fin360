/* Fin360 — componentes de UI compartilhados */

const NAV_ITEMS = [
  { route: 'dashboard', label: 'Dashboard', icon: 'grid', subtitle: 'Como está o seu mês, em números' },
  { route: 'extrato', label: 'Extrato', icon: 'checkSquare', subtitle: 'O que falta pagar e receber, e tudo que já passou' },
  { route: 'lancamentos', label: 'Lançamentos', icon: 'layers', subtitle: 'Tudo o que entra e sai, no mesmo lugar' },
  { route: 'cartoes', label: 'Cartões de crédito', icon: 'card', subtitle: 'Limite, fatura e vencimento dos seus cartões' },
  { route: 'cofrinhos', label: 'Cofrinhos', icon: 'piggy', subtitle: 'Reserva de emergência e metas de poupança' },
  { route: 'planejamento', label: 'Planejamento', icon: 'target', subtitle: 'Metas e orçamento por categoria' },
  { route: 'bancos', label: 'Bancos', icon: 'bank', subtitle: 'Suas contas e o saldo de cada uma' },
  { route: 'importar', label: 'Importar dados', icon: 'upload', subtitle: 'Traga o extrato do banco em vez de digitar lançamento por lançamento' },
  { route: 'configuracoes', label: 'Configurações', icon: 'settings', subtitle: 'Sua conta, seu plano e as preferências do app' },
];

function navItemByRoute(route) {
  return NAV_ITEMS.find((n) => n.route === route) || NAV_ITEMS[0];
}

function renderSidebar(activeRoute) {
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV_ITEMS.filter((item) => !item.hidden).map((item, idx, arr) => `
    ${item.ia && (idx === 0 || !arr[idx - 1].ia) ? `<div class="nav-divider"><span>Inteligência artificial</span></div>` : ''}
    <button class="nav-item ${item.route === activeRoute ? 'active' : ''}" data-route="${item.route}">
      ${icon(item.icon)}
      <span class="nav-label">${item.label}</span>
      ${item.ia ? `<span class="nav-ia-badge">IA</span>` : ''}
    </button>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      // fecha a lateral no celular mesmo se a aba clicada for a atual (aí não há hashchange pra fechar)
      document.getElementById('app-shell').classList.remove('mobile-open');
      location.hash = '#/' + btn.dataset.route;
    });
  });
}

function renderTopbar(route) {
  const item = navItemByRoute(route);
  document.getElementById('page-title').textContent = item.label;
  document.getElementById('page-subtitle').textContent = item.subtitle;
  atualizarStatusSync();

  const menuBtn = document.getElementById('menu-btn');
  menuBtn.innerHTML = icon('menu');
  menuBtn.onclick = () => {
    const shell = document.getElementById('app-shell');
    if (window.innerWidth <= 720) {
      shell.classList.toggle('mobile-open');
    } else {
      shell.classList.toggle('collapsed');
      Store.state.collapsed = shell.classList.contains('collapsed');
      Store.save();
    }
  };

  const themeBtn = document.getElementById('theme-btn');
  themeBtn.innerHTML = icon(Store.state.theme === 'dark' ? 'moon' : 'sun');
  themeBtn.onclick = () => {
    Store.state.theme = Store.state.theme === 'dark' ? 'light' : 'dark';
    Store.save();
    document.documentElement.setAttribute('data-theme', Store.state.theme);
    themeBtn.innerHTML = icon(Store.state.theme === 'dark' ? 'moon' : 'sun');
  };

  const hideBtn = document.getElementById('hide-values-btn');
  hideBtn.innerHTML = icon(Store.state.hideValues ? 'eyeOff' : 'eye');
  hideBtn.classList.toggle('active', Store.state.hideValues);
  hideBtn.onclick = () => {
    Store.state.hideValues = !Store.state.hideValues;
    Store.save();
    render();
  };

  const avatar = document.getElementById('avatar-btn');
  avatar.textContent = (Store.state.profile.name || 'M').charAt(0).toUpperCase();
  avatar.onclick = () => goRoute('configuracoes');

  if (window.innerWidth <= 720) {
    document.getElementById('app-shell').classList.remove('mobile-open');
  }
}

/* Para onde o app manda quem precisa comprar ou renovar o acesso. Aponta para a
   seção de preços do site, e não para o checkout direto, porque é lá que estão o
   preço, a garantia e o que está incluído — cair direto na tela de pagamento sem
   ter lido nada faz a pessoa desistir com o cartão na mão.
   Fica numa constante só, com nome, porque é o endereço que aparece em todo lugar
   que oferece o acesso; espalhar a URL pelo código garante que um dia um deles
   fica pra trás e manda o cliente pra lugar nenhum. */
const CHECKOUT_FIN360 = 'https://fin360app.com.br/#preco';

/* Chamado quando a pessoa tenta lançar sem acesso em dia. É a única porta de
   saída da trava do Store, então é aqui que a oferta aparece — não adianta barrar
   sem dizer como resolver. Os dois casos são bem diferentes e a mensagem errada
   manda a pessoa procurar problema no lugar errado: quem nunca comprou precisa
   comprar; quem cadastrou com outro e-mail só precisa entrar com o e-mail certo. */
function avisarSemAssinatura() {
  // uma tela que altera vários registros de uma vez chamaria isto em sequência;
  // sem esta saída a pessoa fecharia a mesma janela cinco vezes seguidas
  const overlay = document.getElementById('modal-overlay');
  if (overlay && overlay.classList.contains('open')) return;
  const venceu = !!Store.assinatura;
  confirmModal({
    title: venceu ? 'Seu ano de acesso terminou' : 'Libere o Fin360° para lançar',
    text: venceu
      ? 'Nada foi apagado — você continua vendo tudo que já lançou. Mas não dá para criar nem alterar lançamentos enquanto o pagamento não entrar.\n\nRenovando, você ganha mais um ano e volta exatamente de onde parou: seus lançamentos, contas e cofrinhos continuam todos aqui. Assim que o pagamento cai, o app volta ao normal sozinho.'
      : 'Você está usando o Fin360° com o e-mail ' + (Sb.userEmail() || 'desta conta') + ', e não há nenhum acesso ligado a ele.\n\nSe você já comprou, o mais provável é que tenha usado outro e-mail na compra. Saia e entre com aquele e-mail — o acesso é liberado na hora, sem precisar comprar de novo.\n\nSe ainda não comprou, são R$ 47,90 uma vez só, com 1 ano de uso e 7 dias de garantia.',
    confirmLabel: venceu ? 'Renovar por mais um ano' : 'Liberar meu acesso',
    onConfirm: () => window.open(CHECKOUT_FIN360, '_blank', 'noopener'),
  });
}

/* A partir de quantos dias antes do fim o app começa a avisar. São dois números
   porque servem a coisas diferentes: o selo fica na tela o tempo todo e pode ser
   ignorado, então avisa cedo; a janela interrompe a pessoa, então só aparece quando
   já está em cima da hora.

   Os prazos são folgados porque NADA é automático: o acesso é de um ano, comprado
   de uma vez, e no fim dele a pessoa precisa comprar de novo por vontade própria.
   Avisar em cima da hora, como fazia sentido numa assinatura que renovava sozinha,
   só serviria para a pessoa ser travada num dia de uso normal. */
const RENOV_DIAS_SELO = 15;
const RENOV_DIAS_JANELA = 5;

/* Texto único do prazo, para o selo e a janela nunca discordarem entre si. */
function textoPrazoRenovacao(dias) {
  if (dias <= 0) return 'Hoje é o último dia';
  if (dias === 1) return 'Vence amanhã';
  return 'Vence em ' + dias + ' dias';
}

/* Aviso de fim do ano de acesso. Diz uma coisa só, porque agora só existe um
   caminho: comprar de novo. Antes o texto precisava cobrir cartão e Pix avulso ao
   mesmo tempo, já que a assinatura podia renovar sozinha — e mandar "pague agora"
   para quem estava no cartão fazia a pessoa comprar duas vezes. Isso acabou.

   A frase sobre não perder dias existe porque ela muda o comportamento: sem isso a
   pessoa espera vencer para não "desperdiçar", e quem espera acaba esquecendo. */
function avisarRenovacaoProxima() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay && overlay.classList.contains('open')) return;
  const dias = diasParaVencer(Store.assinatura);
  if (dias === null) return;
  const data = Store.assinatura.acesso_ate.split('-').reverse().join('/');
  confirmModal({
    title: textoPrazoRenovacao(dias),
    text: 'Seu ano de acesso ao Fin360° vai até ' + data + '.\n\n'
      + 'Para continuar lançando, é só comprar mais um ano. Não existe cobrança automática: nada é cobrado de você sem que você peça.\n\n'
      + 'Comprando agora você não perde os dias que faltam — eles são somados ao ano novo.\n\n'
      + 'Se a data passar, nada é apagado: você continua entrando e vendo tudo que já lançou, só não consegue lançar nada novo até renovar.',
    confirmLabel: 'Renovar por mais um ano',
    onConfirm: () => window.open(CHECKOUT_FIN360, '_blank', 'noopener'),
  });
}

/* Uma vez por dia, e não uma vez por carregamento: quem abre o app cinco vezes no
   dia não pode levar cinco janelas na cara. A marca é por conta, senão duas pessoas
   no mesmo aparelho abafariam o aviso uma da outra. */
function avisarRenovacaoNaEntrada() {
  const dias = diasParaVencer(Store.assinatura);
  if (dias === null || dias > RENOV_DIAS_JANELA) return;
  const chave = 'fin360_aviso_renov_' + ((typeof Sb !== 'undefined' && Sb.userId()) || 'default');
  const hoje = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(chave) === hoje) return;
    localStorage.setItem(chave, hoje);
  } catch (e) {
    /* modo privado ou cota cheia: melhor avisar de novo do que não avisar */
  }
  avisarRenovacaoProxima();
}

/* Estado da sincronização, sempre visível quando há problema.
   Some quando tudo está no lugar — aviso que fica na tela sem motivo vira ruído
   e a pessoa passa a ignorar o que importa. */
function atualizarStatusSync() {
  const el = document.getElementById('sync-badge');
  if (!el) return;

  // Acesso vencido vem primeiro: é o motivo mais específico e o único que a
  // pessoa resolve pagando. Mostrar "sem conexão" aqui mandaria ela pro lugar errado.
  if (Store.semAssinatura) {
    // Dois casos bem diferentes. Quem comprou e cadastrou com outro e-mail precisa
    // saber disso — dizer "vencido" para quem nunca comprou manda a pessoa
    // procurar problema no cartão quando o problema é o e-mail.
    const venceu = !!Store.assinatura;
    el.style.display = '';
    el.className = 'sync-badge erro';
    el.innerHTML = '<span>' + (venceu ? 'Acesso vencido' : 'Sem acesso') + '</span>';
    el.title = venceu
      ? 'Seu ano de acesso terminou. Você continua vendo todos os seus dados, mas não consegue lançar nada novo até renovar.'
      : 'Não encontramos acesso para este e-mail. Se você já comprou, entre com o mesmo e-mail que usou na compra.';
    // mesma janela da trava de lançamento: um texto só, e com o caminho pra resolver.
    // Antes aqui havia um "Entendi" que só fechava — informava o problema e abandonava
    // a pessoa nele.
    el.onclick = avisarSemAssinatura;
    return;
  }

  if (Store.conflito) {
    el.style.display = '';
    el.className = 'sync-badge erro';
    el.innerHTML = '<span>Não está salvando</span>';
    el.title = 'Seus dados foram alterados em outro aparelho. Clique para recarregar e ver a versão mais recente. O que você lançou desde então pode não ter sido salvo.';
    el.onclick = () => {
      confirmModal({
        title: 'Recarregar para sincronizar',
        text: 'Seus dados foram alterados em outro aparelho ou em outra aba. Recarregar traz a versão mais recente do servidor — o que você lançou nesta aba depois disso pode não ter sido salvo e talvez precise ser lançado de novo.',
        confirmLabel: 'Recarregar', danger: true,
        onConfirm: () => location.reload(),
      });
    };
    return;
  }

  if (Store.offline && Sb.isLoggedIn()) {
    el.style.display = '';
    el.className = 'sync-badge aviso';
    el.innerHTML = '<span>Sem conexão</span>';
    el.title = 'Sem conexão com o servidor. Você pode continuar usando: está tudo salvo neste aparelho e sobe sozinho quando a internet voltar.';
    el.onclick = () => {
      toast('Está tudo salvo neste aparelho. Assim que a internet voltar, sobe sozinho.', 'info');
      Store.agendarSync(0);
    };
    return;
  }

  // Por último: os de cima são problemas acontecendo agora, este é um prazo chegando.
  // Fica no selo porque a janela aparece só uma vez por dia — sem isso, quem fechou
  // a janela de manhã não teria mais nenhum lembrete do vencimento.
  const diasRenov = diasParaVencer(Store.assinatura);
  if (diasRenov !== null && diasRenov <= RENOV_DIAS_SELO) {
    el.style.display = '';
    el.className = 'sync-badge aviso';
    el.innerHTML = '<span>' + textoPrazoRenovacao(diasRenov) + '</span>';
    el.title = 'Seu acesso vai até ' + Store.assinatura.acesso_ate.split('-').reverse().join('/') + '. Clique para ver o que fazer.';
    el.onclick = avisarRenovacaoProxima;
    return;
  }

  el.style.display = 'none';
  el.className = 'sync-badge';
  el.innerHTML = '';
  el.title = '';
  el.onclick = null;
}

function applyShellState() {
  document.documentElement.setAttribute('data-theme', Store.state.theme);
  document.getElementById('app-shell').classList.toggle('collapsed', !!Store.state.collapsed);
  document.getElementById('collapse-btn').onclick = () => {
    document.getElementById('app-shell').classList.toggle('collapsed');
    Store.state.collapsed = document.getElementById('app-shell').classList.contains('collapsed');
    Store.save();
  };
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.onclick = () => document.getElementById('app-shell').classList.remove('mobile-open');
}

/* ============ Stat card ============ */
function statCard({ label, value, sub, tone, iconName }) {
  return `
    <div class="stat-card tone-${tone || 'blue'}">
      <div class="stat-top">
        <span class="stat-label">${label}</span>
        <span class="stat-icon">${icon(iconName || 'wallet')}</span>
      </div>
      <div class="stat-value">${value}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
    </div>
  `;
}

/* ============ Empty state ============ */
function emptyState({ iconName, title, text, actionLabel, actionId }) {
  return `
    <div class="empty-state">
      ${icon(iconName || 'inbox')}
      <strong>${title}</strong>
      ${text ? `<span>${text}</span>` : ''}
      ${actionLabel ? `<button class="btn btn-primary btn-sm" id="${actionId}">${icon('plus')} ${actionLabel}</button>` : ''}
    </div>
  `;
}

/* ============ Category / bank select options ============ */
function categoryOptions(selected, tipo) {
  const list = tipo ? Store.state.categories.filter((c) => (c.tipo || 'despesa') === tipo) : Store.state.categories;
  return `<option value="" ${!selected ? 'selected' : ''}>Informar categoria...</option>` +
    list.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('');
}
function bankOptions(selected) {
  if (!Store.state.banks.length) return `<option value="">Nenhum banco cadastrado</option>`;
  return `<option value="">Selecione o banco...</option>` + Store.state.banks.map((b) => `<option value="${b.id}" ${b.id === selected ? 'selected' : ''}>${b.name}</option>`).join('');
}
function categoryTag(catId) {
  const cat = Store.categoryById(catId);
  if (!cat) return `<span class="category-tag" style="background:var(--bg-input);color:var(--text-muted)">Sem categoria</span>`;
  return `<span class="category-tag" style="background:var(--bg-input);color:var(--text)">${cat.emoji} ${cat.name}</span>`;
}
function categoryAvatar(catId) {
  const cat = Store.categoryById(catId);
  const emoji = cat ? cat.emoji : '📦';
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--bg-input);font-size:16px;flex-shrink:0">${emoji}</span>`;
}
function hexToSoft(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},0.14)`;
}

/* ============ Modal (confirm) ============ */
function confirmModal({ title, text, confirmLabel, danger, onConfirm }) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${title}</h3>
      <p>${text}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger-ghost' : 'btn-primary'} btn-sm" id="modal-confirm">${confirmLabel || 'Confirmar'}</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#modal-confirm').onclick = () => {
    overlay.classList.remove('open');
    onConfirm();
  };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
}

/* ============ Toast ============ */
function toast(message, type) {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = `toast ${type === 'danger' ? 'danger' : type === 'success' ? 'success' : ''}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .2s';
    setTimeout(() => el.remove(), 200);
  }, 2600);
}

/* ============ Emoji picker (dropdown com opções curadas, sem depender do picker do SO) ============ */
const CATEGORY_EMOJIS = [
  '🏷️', '🍽️', '🛒', '☕', '🍺', '🍕',
  '🏠', '💡', '💧', '🔥', '📶', '🛠️',
  '🚗', '⛽', '🚌', '🚕', '🚲', '🅿️',
  '💊', '🏥', '🦷', '🧴', '💇', '🏋️',
  '🎓', '📚', '🖥️', '🎮', '🎬', '🎵',
  '🛍️', '👕', '👟', '📱', '💳', '🏦',
  '✈️', '🏖️', '🧳', '🎁', '💐', '🐶',
  '🐱', '👶', '🧹', '📺', '💰', '📦',
];
const CATEGORY_COLOR_PALETTE = ['#3866ff', '#22c55e', '#a855f7', '#f5a623', '#f04848', '#22d3ee', '#ec4899', '#eab308', '#14b8a6', '#8b93ac'];
function nextCategoryColor() {
  return CATEGORY_COLOR_PALETTE[Store.state.categories.length % CATEGORY_COLOR_PALETTE.length];
}
function renderEmojiPicker(id, value) {
  const val = value || '🏷️';
  return `
    <div class="dropdown emoji-dropdown" id="${id}-dd">
      <button type="button" class="dropdown-trigger emoji-trigger">
        <span class="emoji-preview">${val}</span>${icon('chevronDown', 'chevron')}
      </button>
      <div class="dropdown-panel emoji-panel">
        <div class="emoji-grid">
          ${CATEGORY_EMOJIS.map((e) => `<button type="button" class="emoji-cell ${e === val ? 'active' : ''}" data-emoji="${e}">${e}</button>`).join('')}
        </div>
      </div>
    </div>
    <input type="hidden" id="${id}" value="${val}" />
  `;
}
function wireEmojiPicker(id) {
  const dd = document.getElementById(`${id}-dd`);
  if (!dd) return;
  wireDropdownToggle(dd);
  const hiddenInput = document.getElementById(id);
  dd.querySelectorAll('.emoji-cell').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      hiddenInput.value = btn.dataset.emoji;
      dd.querySelector('.emoji-preview').textContent = btn.dataset.emoji;
      dd.querySelectorAll('.emoji-cell').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      dd.classList.remove('open');
    };
  });
}

/* ============ Prompt simples para criar categoria/banco inline ============ */
function quickAddCategory(onAdded, tipo) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Nova categoria</h3>
      <div class="field"><label>Nome</label><input type="text" id="qc-name" placeholder="Ex.: Pet" /></div>
      <div class="field"><label>Emoji</label>${renderEmojiPicker('qc-emoji', '🏷️')}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="modal-confirm">Adicionar</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  wireEmojiPicker('qc-emoji');
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#modal-confirm').onclick = () => {
    const name = document.getElementById('qc-name').value.trim();
    if (!name) { toast('Dê um nome para a categoria', 'danger'); return; }
    const cat = Store.add('categories', { name, color: nextCategoryColor(), emoji: document.getElementById('qc-emoji').value || '🏷️', tipo: tipo || 'despesa' });
    if (!cat) return; // sem assinatura: o aviso já apareceu, não confirmar sucesso
    overlay.classList.remove('open');
    toast('Categoria adicionada', 'success');
    onAdded && onAdded(cat.id);
  };
}

function quickAddBank(onAdded) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Novo banco / conta</h3>
      <div class="field"><label>Nome</label><input type="text" id="qb-name" placeholder="Ex.: Nubank" /></div>
      <div class="field"><label>Saldo inicial</label><input type="number" step="0.01" id="qb-balance" placeholder="0,00" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="modal-confirm">Adicionar</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#modal-confirm').onclick = () => {
    const name = document.getElementById('qb-name').value.trim();
    if (!name) { toast('Dê um nome para o banco', 'danger'); return; }
    const bank = Store.add('banks', { name, balance: parseFloat(document.getElementById('qb-balance').value) || 0 });
    if (!bank) return;
    overlay.classList.remove('open');
    toast('Banco adicionado', 'success');
    onAdded && onAdded(bank.id);
  };
}
