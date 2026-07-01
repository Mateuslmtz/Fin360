/* Fin360 — componentes de UI compartilhados */

const NAV_ITEMS = [
  { route: 'dashboard', label: 'Dashboard', icon: 'grid', subtitle: 'Visão geral · Este mês' },
  { route: 'resumo', label: 'Resumo', icon: 'checkSquare', subtitle: 'Central operacional · Hoje' },
  { route: 'gastos-fixos', label: 'Gastos fixos', icon: 'repeat', subtitle: 'Cadastre custos recorrentes e acompanhe vencimentos' },
  { route: 'gastos-variaveis', label: 'Gastos variáveis', icon: 'bag', subtitle: 'Criar, editar, excluir e filtrar lançamentos em tempo real' },
  { route: 'parcelamentos', label: 'Parcelamentos', icon: 'layers', subtitle: 'Compras parceladas em acompanhamento' },
  { route: 'cartoes', label: 'Cartões de crédito', icon: 'card', subtitle: 'Limite, fatura e vencimento dos seus cartões' },
  { route: 'recebimentos', label: 'Recebimentos', icon: 'download', subtitle: 'Entradas previstas e recebidas' },
  { route: 'cofrinhos', label: 'Cofrinhos', icon: 'piggy', subtitle: 'Reserva de emergência e metas de poupança' },
  { route: 'bancos', label: 'Bancos', icon: 'bank', subtitle: 'Contas e saldos vinculados' },
  { route: 'extrato', label: 'Extrato', icon: 'list', subtitle: 'Espelha o Dashboard com os mesmos filtros e regras' },
  { route: 'investimentos', label: 'Investimentos', icon: 'trendUp', subtitle: 'Carteira ativa, aportes e rentabilidade' },
  { route: 'conciliacao', label: 'Conciliação', icon: 'checkCircle', subtitle: 'Confira lançamentos com seu extrato bancário' },
  { route: 'planejamento', label: 'Planejamento', icon: 'target', subtitle: 'Metas e orçamento por categoria' },
  { route: 'importar', label: 'Importar dados', icon: 'upload', subtitle: 'A Vera lê seu PDF e cadastra tudo automaticamente', ia: true },
  { route: 'vera', label: 'Vera', icon: 'sparkles', subtitle: 'Converse, peça relatórios em PDF e gere análises com seus dados reais', ia: true },
  { route: 'configuracoes', label: 'Configurações', icon: 'settings', subtitle: 'Gerencie sua conta e preferências', hidden: true },
];

function navItemByRoute(route) {
  return NAV_ITEMS.find((n) => n.route === route) || NAV_ITEMS[0];
}

function renderSidebar(activeRoute) {
  const logoEl = document.getElementById('brand-logo');
  if (logoEl && !logoEl.dataset.filled) {
    logoEl.innerHTML = icon('logo');
    logoEl.dataset.filled = '1';
  }

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
    btn.addEventListener('click', () => { location.hash = '#/' + btn.dataset.route; });
  });
}

function renderTopbar(route) {
  const item = navItemByRoute(route);
  document.getElementById('page-title').textContent = item.label;
  document.getElementById('page-subtitle').textContent = item.subtitle;

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

function applyShellState() {
  document.documentElement.setAttribute('data-theme', Store.state.theme);
  document.getElementById('app-shell').classList.toggle('collapsed', !!Store.state.collapsed);
  document.getElementById('collapse-btn').onclick = () => {
    document.getElementById('app-shell').classList.toggle('collapsed');
    Store.state.collapsed = document.getElementById('app-shell').classList.contains('collapsed');
    Store.save();
  };
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
function categoryOptions(selected) {
  return Store.state.categories.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('');
}
function bankOptions(selected) {
  if (!Store.state.banks.length) return `<option value="">Nenhum banco cadastrado</option>`;
  return `<option value="">Selecione o banco...</option>` + Store.state.banks.map((b) => `<option value="${b.id}" ${b.id === selected ? 'selected' : ''}>${b.name}</option>`).join('');
}
function categoryTag(catId) {
  const cat = Store.categoryById(catId);
  if (!cat) return `<span class="category-tag" style="background:var(--bg-input);color:var(--text-muted)">Sem categoria</span>`;
  return `<span class="category-tag" style="background:${hexToSoft(cat.color)};color:${cat.color}">${cat.emoji} ${cat.name}</span>`;
}
function categoryAvatar(catId) {
  const cat = Store.categoryById(catId);
  const bg = cat ? hexToSoft(cat.color) : 'var(--bg-input)';
  const emoji = cat ? cat.emoji : '📦';
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${bg};font-size:16px;flex-shrink:0">${emoji}</span>`;
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

/* ============ Prompt simples para criar categoria/banco inline ============ */
function quickAddCategory(onAdded) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Nova categoria</h3>
      <div class="field"><label>Nome</label><input type="text" id="qc-name" placeholder="Ex.: Pet" /></div>
      <div class="field"><label>Cor</label><input type="text" id="qc-color" value="#3866ff" /></div>
      <div class="field"><label>Emoji</label><input type="text" id="qc-emoji" value="🏷️" maxlength="2" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="modal-confirm">Adicionar</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('open');
  overlay.querySelector('#modal-confirm').onclick = () => {
    const name = document.getElementById('qc-name').value.trim();
    if (!name) { toast('Dê um nome para a categoria', 'danger'); return; }
    const cat = Store.add('categories', { name, color: document.getElementById('qc-color').value || '#3866ff', emoji: document.getElementById('qc-emoji').value || '🏷️' });
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
    overlay.classList.remove('open');
    toast('Banco adicionado', 'success');
    onAdded && onAdded(bank.id);
  };
}
