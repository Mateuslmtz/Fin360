/* Fin360 — estado da aplicação + persistência local (protótipo, sem backend) */

const STORAGE_KEY = 'fin360_state_v1';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function defaultState() {
  return {
    theme: 'dark',
    hideValues: false,
    context: 'pessoal',
    collapsed: false,
    profile: { name: 'Mateus' },
    categories: [
      { id: 'cat-alimentacao', name: 'Alimentação', color: '#22c55e', emoji: '🍽️' },
      { id: 'cat-assinaturas', name: 'Assinaturas', color: '#a855f7', emoji: '📺' },
      { id: 'cat-cofrinho', name: 'Cofrinho', color: '#22d3ee', emoji: '🐷' },
      { id: 'cat-educacao', name: 'Educação', color: '#3866ff', emoji: '🎓' },
      { id: 'cat-lazer', name: 'Lazer', color: '#f5a623', emoji: '🎮' },
      { id: 'cat-moradia', name: 'Moradia', color: '#f04848', emoji: '🏠' },
      { id: 'cat-saude', name: 'Saúde', color: '#22c55e', emoji: '💊' },
      { id: 'cat-transporte', name: 'Transporte', color: '#3866ff', emoji: '🚗' },
      { id: 'cat-outros', name: 'Outros', color: '#8b93ac', emoji: '📦' },
    ],
    banks: [],
    gastosFixos: [],
    gastosVariaveis: [],
    recebimentos: [],
    cofrinhos: [],
    cartoes: [],
    investimentos: [],
  };
}

const Store = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.state = raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
    } catch (e) {
      this.state = defaultState();
    }
    return this.state;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },

  reset() {
    this.state = defaultState();
    this.save();
  },

  // ---- generic collection helpers ----
  add(collection, item) {
    item.id = item.id || uid();
    item.createdAt = item.createdAt || Date.now();
    this.state[collection].push(item);
    this.save();
    return item;
  },
  update(collection, id, patch) {
    const list = this.state[collection];
    const idx = list.findIndex((i) => i.id === id);
    if (idx > -1) {
      list[idx] = Object.assign({}, list[idx], patch);
      this.save();
      return list[idx];
    }
    return null;
  },
  remove(collection, id) {
    this.state[collection] = this.state[collection].filter((i) => i.id !== id);
    this.save();
  },
  get(collection, id) {
    return this.state[collection].find((i) => i.id === id) || null;
  },

  categoryById(id) {
    return this.state.categories.find((c) => c.id === id) || null;
  },
  bankById(id) {
    return this.state.banks.find((b) => b.id === id) || null;
  },
};

/* ============ Format helpers ============ */
function formatCurrency(value) {
  const v = Number(value) || 0;
  if (Store.state && Store.state.hideValues) return 'R$ •••••';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function monthLabel(monthIdx) {
  const labels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return labels[monthIdx];
}

function isSameMonth(iso, monthStr) {
  // monthStr format: 'YYYY-MM'
  return !!iso && iso.slice(0, 7) === monthStr;
}

function isSameYear(iso, year) {
  return !!iso && iso.slice(0, 4) === String(year);
}

function currentMonthStr() {
  return todayISO().slice(0, 7);
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
