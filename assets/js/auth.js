/* Fin360 — autenticação via Supabase.
   A tela e as classes de CSS são as mesmas de antes; o que mudou é o que está por baixo:
   antes a senha era conferida por hash no próprio navegador (e a conta só existia naquele
   aparelho); agora quem valida é o servidor, então a mesma conta funciona em qualquer lugar. */

const Auth = {
  load() {
    Sb.loadSession();
    return Sb.session;
  },

  currentUserId() {
    return Sb.userId();
  },

  currentUser() {
    if (!Sb.isLoggedIn()) return null;
    return { id: Sb.userId(), name: Sb.userName(), email: Sb.userEmail() };
  },

  isLoggedIn() {
    return Sb.isLoggedIn();
  },

  async logout() {
    await Sb.signOut();
  },
};

/* ============ Tela de login / cadastro / recuperação ============ */

// modo: 'login' | 'register' | 'forgot' | 'reset'
function renderAuthScreen(mode) {
  mode = mode || 'login';
  const screen = document.getElementById('auth-screen');
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  const titulo = isReset ? 'Definir nova senha' : isForgot ? 'Recuperar senha' : '';
  const rotuloBotao = isLogin ? 'Entrar' : isRegister ? 'Criar conta' : isForgot ? 'Enviar link' : 'Salvar nova senha';

  screen.innerHTML = `
    <div class="auth-card">
      <img class="auth-logo-full auth-logo-escuro" src="assets/img/logo-completa.png" alt="Fin360° — Sua vida financeira em 360°" />
      <img class="auth-logo-full auth-logo-claro" src="assets/img/logo-completa-claro.png" alt="Fin360° — Sua vida financeira em 360°" />

      ${isForgot || isReset ? `<h2 class="auth-titulo">${titulo}</h2>` : `
      <div class="auth-tabs">
        <button class="auth-tab ${isLogin ? 'active' : ''}" data-mode="login">Entrar</button>
        <button class="auth-tab ${isRegister ? 'active' : ''}" data-mode="register">Criar conta</button>
      </div>`}

      <form id="auth-form" class="auth-form">
        ${isRegister ? `<div class="field"><label>Nome</label><input type="text" id="auth-name" placeholder="Seu nome" autocomplete="name" /></div>` : ''}
        ${!isReset ? `<div class="field"><label>E-mail</label><input type="email" id="auth-email" placeholder="voce@email.com" autocomplete="email" /></div>` : ''}
        ${!isForgot ? `<div class="field"><label>${isReset ? 'Nova senha' : 'Senha'}</label><input type="password" id="auth-password" placeholder="••••••••" autocomplete="${isLogin ? 'current-password' : 'new-password'}" /></div>` : ''}
        ${isRegister || isReset ? `<div class="field"><label>Confirmar senha</label><input type="password" id="auth-password2" placeholder="••••••••" autocomplete="new-password" /></div>` : ''}
        <p class="auth-error" id="auth-error" style="display:none"></p>
        <p class="auth-ok" id="auth-ok" style="display:none"></p>
        <button type="submit" class="btn btn-primary auth-submit">${rotuloBotao}</button>
      </form>

      ${isLogin ? `<p class="auth-hint"><a href="#" id="auth-forgot-link">Esqueci minha senha</a></p>` : ''}
      ${isForgot || isReset ? `<p class="auth-hint"><a href="#" id="auth-back-link">Voltar para o login</a></p>` : ''}
      ${isRegister ? `<p class="auth-hint">Você vai receber um e-mail para confirmar o cadastro.</p>` : ''}
    </div>
  `;

  screen.querySelectorAll('.auth-tab').forEach((btn) => {
    btn.addEventListener('click', () => renderAuthScreen(btn.dataset.mode));
  });
  const forgotLink = document.getElementById('auth-forgot-link');
  if (forgotLink) forgotLink.addEventListener('click', (e) => { e.preventDefault(); renderAuthScreen('forgot'); });
  const backLink = document.getElementById('auth-back-link');
  if (backLink) backLink.addEventListener('click', (e) => { e.preventDefault(); location.hash = ''; renderAuthScreen('login'); });

  const form = document.getElementById('auth-form');
  const errorEl = document.getElementById('auth-error');
  const okEl = document.getElementById('auth-ok');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    okEl.style.display = 'none';
    const submitBtn = form.querySelector('.auth-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Aguarde...';

    const mostrarErro = (msg) => {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = rotuloBotao;
    };

    try {
      const emailEl = document.getElementById('auth-email');
      const email = emailEl ? emailEl.value.trim() : '';
      const senhaEl = document.getElementById('auth-password');
      const senha = senhaEl ? senhaEl.value : '';
      const senha2El = document.getElementById('auth-password2');

      if (isForgot) {
        if (!email || !email.includes('@')) return mostrarErro('Informe um e-mail válido.');
        await Sb.resetPassword(email);
        // Mensagem igual exista ou não a conta: dizer "esse e-mail não existe" entrega
        // para um estranho quem é cliente e quem não é.
        okEl.textContent = 'Se existir uma conta com esse e-mail, o link de recuperação já está a caminho. Confira também o spam.';
        okEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = rotuloBotao;
        return;
      }

      if (isReset) {
        if (senha.length < 6) return mostrarErro('A senha precisa ter pelo menos 6 caracteres.');
        if (senha !== senha2El.value) return mostrarErro('As duas senhas não são iguais.');
        await Sb.updatePassword(senha);
        history.replaceState(null, '', location.pathname);
        okEl.textContent = 'Senha alterada. Entre com a senha nova.';
        okEl.style.display = 'block';
        await Sb.signOut();
        setTimeout(() => renderAuthScreen('login'), 1500);
        return;
      }

      if (isRegister) {
        const nome = document.getElementById('auth-name').value.trim();
        if (!nome) return mostrarErro('Informe seu nome.');
        if (!email || !email.includes('@')) return mostrarErro('Informe um e-mail válido.');
        if (senha.length < 6) return mostrarErro('A senha precisa ter pelo menos 6 caracteres.');
        if (senha !== senha2El.value) return mostrarErro('As duas senhas não são iguais.');
        const r = await Sb.signUp(nome, email, senha);
        if (r.precisaConfirmar) {
          okEl.innerHTML = 'Conta criada. Enviamos um e-mail de confirmação para <strong>' + email + '</strong>.<br>Confirme e depois entre. <strong>Confira o spam</strong> — o e-mail costuma cair lá.';
          okEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = rotuloBotao;
          return;
        }
        await bootApp();
        return;
      }

      // login
      if (!email || !senha) return mostrarErro('Preencha e-mail e senha.');
      await Sb.signIn(email, senha);
      await bootApp();
    } catch (err) {
      mostrarErro(err.message);
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

async function logout() {
  // a ordem importa: storageKey() depende da sessão, então limpar o cache tem que
  // vir ANTES de encerrar a sessão — senão apaga a chave errada e os dados
  // financeiros do usuário ficam para trás no aparelho
  localStorage.removeItem(storageKey());
  await Auth.logout();
  Store.versao = null;
  Store.conflito = false;
  showAuthScreen('login');
}

/* O link de recuperação que o Supabase envia volta com os tokens no fragmento da URL
   (#access_token=...&type=recovery). Consumimos aqui e limpamos a URL, para o token
   não ficar visível na barra de endereço nem no histórico. */
async function consumirTokenDaURL() {
  if (!location.hash || location.hash.indexOf('access_token=') === -1) return null;
  const p = new URLSearchParams(location.hash.slice(1));
  const tipo = p.get('type');
  const access = p.get('access_token');
  if (!access) return null;
  Sb.saveSession({
    access_token: access,
    refresh_token: p.get('refresh_token'),
    expires_in: parseInt(p.get('expires_in'), 10) || 3600,
    user: null,
  });
  history.replaceState(null, '', location.pathname);
  // sem isso o app fica "logado" sem saber quem é, e não acha os dados
  try { await Sb.fetchUser(); } catch (e) { /* segue: o reset de senha não depende disso */ }
  return tipo;
}
