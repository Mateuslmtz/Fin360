/* Fin360 — autenticação local (protótipo sem backend)
   Cada conta cadastrada neste navegador tem seus próprios dados financeiros
   (chave de armazenamento isolada por usuário), preparando o terreno para
   quando o sistema tiver um backend real e puder ser vendido para vários clientes. */

const AUTH_KEY = 'fin360_auth_v1';
const SESSION_KEY = 'fin360_session_v1';

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes))).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder().encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const Auth = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      this.data = raw ? JSON.parse(raw) : { accounts: [] };
    } catch (e) {
      this.data = { accounts: [] };
    }
    return this.data;
  },

  persist() {
    localStorage.setItem(AUTH_KEY, JSON.stringify(this.data));
  },

  findByEmail(email) {
    const e = email.trim().toLowerCase();
    return this.data.accounts.find((a) => a.email.toLowerCase() === e);
  },

  async register(name, email, password) {
    if (!name.trim()) throw new Error('Informe seu nome.');
    if (!email.trim() || !email.includes('@')) throw new Error('Informe um e-mail válido.');
    if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    if (this.findByEmail(email)) throw new Error('Já existe uma conta com esse e-mail neste dispositivo.');
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const account = { id: uid(), name: name.trim(), email: email.trim(), salt, passwordHash, createdAt: Date.now() };
    this.data.accounts.push(account);
    this.persist();
    this.setSession(account.id);
    return account;
  },

  async login(email, password) {
    const account = this.findByEmail(email);
    if (!account) throw new Error('E-mail ou senha inválidos.');
    const hash = await hashPassword(password, account.salt);
    if (hash !== account.passwordHash) throw new Error('E-mail ou senha inválidos.');
    this.setSession(account.id);
    return account;
  },

  setSession(userId) {
    localStorage.setItem(SESSION_KEY, userId);
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  currentUserId() {
    return localStorage.getItem(SESSION_KEY);
  },

  currentUser() {
    const id = this.currentUserId();
    if (!id) return null;
    return this.data.accounts.find((a) => a.id === id) || null;
  },

  isLoggedIn() {
    return !!this.currentUser();
  },
};

/* ============ Tela de login / cadastro ============ */
function renderAuthScreen(mode) {
  mode = mode || 'login';
  const screen = document.getElementById('auth-screen');
  const isLogin = mode === 'login';

  screen.innerHTML = `
    <div class="auth-card">
      <img class="auth-logo-full auth-logo-escuro" src="assets/img/logo-completa.png" alt="Fin360° — Sua vida financeira em 360°" />
      <img class="auth-logo-full auth-logo-claro" src="assets/img/logo-completa-claro.png" alt="Fin360° — Sua vida financeira em 360°" />

      <div class="auth-tabs">
        <button class="auth-tab ${isLogin ? 'active' : ''}" data-mode="login">Entrar</button>
        <button class="auth-tab ${!isLogin ? 'active' : ''}" data-mode="register">Criar conta</button>
      </div>

      <form id="auth-form" class="auth-form">
        ${!isLogin ? `<div class="field"><label>Nome</label><input type="text" id="auth-name" placeholder="Seu nome" autocomplete="name" /></div>` : ''}
        <div class="field"><label>E-mail</label><input type="email" id="auth-email" placeholder="voce@email.com" autocomplete="email" /></div>
        <div class="field"><label>Senha</label><input type="password" id="auth-password" placeholder="••••••••" autocomplete="${isLogin ? 'current-password' : 'new-password'}" /></div>
        <p class="auth-error" id="auth-error" style="display:none"></p>
        <button type="submit" class="btn btn-primary auth-submit">${isLogin ? 'Entrar' : 'Criar conta'}</button>
      </form>

      <p class="auth-hint">Seus dados ficam salvos apenas neste navegador.</p>
    </div>
  `;

  screen.querySelectorAll('.auth-tab').forEach((btn) => {
    btn.addEventListener('click', () => renderAuthScreen(btn.dataset.mode));
  });

  const form = document.getElementById('auth-form');
  const errorEl = document.getElementById('auth-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const submitBtn = form.querySelector('.auth-submit');
    submitBtn.disabled = true;
    try {
      if (isLogin) {
        await Auth.login(email, password);
      } else {
        const name = document.getElementById('auth-name').value;
        await Auth.register(name, email, password);
      }
      bootApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
    }
  });
}

function showAuthScreen(mode) {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';
  renderAuthScreen(mode);
}

function hideAuthScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell').style.display = '';
}

function logout() {
  Auth.logout();
  showAuthScreen('login');
}
