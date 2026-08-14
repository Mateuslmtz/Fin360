/* Fin360 — painel de admin (dono do produto).
   Sessão compartilhada com o app principal (mesma chave em localStorage): quem já
   está logado em app.fin360app.com.br entra aqui direto. A trava de verdade é a
   função admin_listar_usuarios() no banco — o e-mail abaixo é só pra decidir o que
   MOSTRAR, não protege nada sozinho. */

const ADMIN_EMAIL = 'email-do-dono-removido';

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

function fmtData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function fmtDataHora(iso) {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function badgeStatus(status) {
  if (status === 'ativa') return '<span class="badge badge-success">Ativa</span>';
  if (status === 'atrasada') return '<span class="badge badge-warning">Atrasada</span>';
  if (status === 'cancelada') return '<span class="badge badge-muted">Cancelada</span>';
  return '<span class="badge badge-muted">Sem assinatura</span>';
}

function elAcoes() { return document.getElementById('admin-acoes'); }
function elSub() { return document.getElementById('admin-sub'); }
function elConteudo() { return document.getElementById('admin-conteudo'); }

function render() {
  Sb.loadSession();
  if (!Sb.isLoggedIn()) return renderLogin();
  const email = (Sb.userEmail() || '').toLowerCase();
  if (email !== ADMIN_EMAIL) return renderNegado(email);
  renderPainel();
}

function renderLogin() {
  elSub().textContent = 'Entre com sua conta Fin360.';
  elAcoes().innerHTML = '';
  elConteudo().innerHTML = `
    <div class="admin-panel admin-login" style="padding:26px 28px 30px">
      <form id="admin-login-form" class="auth-form">
        <div class="field"><label>E-mail</label><input type="email" id="admin-email" placeholder="voce@email.com" autocomplete="email" /></div>
        <div class="field"><label>Senha</label><input type="password" id="admin-senha" placeholder="••••••••" autocomplete="current-password" /></div>
        <p class="auth-error" id="admin-login-erro" style="display:none"></p>
        <button type="submit" class="btn btn-primary btn-block">Entrar</button>
      </form>
    </div>
  `;
  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erroEl = document.getElementById('admin-login-erro');
    erroEl.style.display = 'none';
    const email = document.getElementById('admin-email').value.trim();
    const senha = document.getElementById('admin-senha').value;
    if (!email || !senha) {
      erroEl.textContent = 'Preencha e-mail e senha.';
      erroEl.style.display = 'block';
      return;
    }
    try {
      await Sb.signIn(email, senha);
      render();
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}

function renderNegado(email) {
  elSub().textContent = 'Acesso restrito.';
  elAcoes().innerHTML = '<button class="btn btn-ghost btn-sm" id="admin-sair">Sair</button>';
  document.getElementById('admin-sair').addEventListener('click', sair);
  elConteudo().innerHTML = `
    <div class="admin-panel">
      <div class="admin-estado">
        <div>A conta <strong>${email}</strong> não tem acesso a este painel.</div>
        <button class="btn btn-ghost btn-sm" id="admin-trocar">Entrar com outra conta</button>
      </div>
    </div>
  `;
  document.getElementById('admin-trocar').addEventListener('click', sair);
}

async function sair() {
  await Sb.signOut();
  render();
}

async function renderPainel() {
  elSub().textContent = 'Assinantes do Fin360.';
  elAcoes().innerHTML = `
    <button class="btn btn-ghost btn-sm" id="admin-atualizar">Atualizar</button>
    <button class="btn btn-ghost btn-sm" id="admin-sair">Sair</button>
  `;
  document.getElementById('admin-atualizar').addEventListener('click', renderPainel);
  document.getElementById('admin-sair').addEventListener('click', sair);

  elConteudo().innerHTML = '<div class="admin-panel"><div class="admin-center">Carregando…</div></div>';

  let usuarios;
  try {
    usuarios = await carregarUsuarios();
  } catch (err) {
    elConteudo().innerHTML = `<div class="admin-panel"><div class="admin-estado">Não foi possível carregar: ${err.message}</div></div>`;
    return;
  }

  if (!usuarios.length) {
    elConteudo().innerHTML = '<div class="admin-panel"><div class="admin-estado">Nenhum assinante ainda.</div></div>';
    return;
  }

  const linhas = usuarios.map((u) => `
    <tr data-email="${u.email}">
      <td>
        <div class="admin-email">${u.email}</div>
        <div class="admin-muted">${u.email_confirmado ? 'e-mail confirmado' : 'e-mail não confirmado'}</div>
      </td>
      <td>${fmtData(u.criado_em)}</td>
      <td>${fmtDataHora(u.ultimo_acesso)}</td>
      <td>
        ${badgeStatus(u.assinatura_status)}
        ${u.assinatura_plataforma ? `<span class="admin-plataforma">${u.assinatura_plataforma}</span>` : ''}
      </td>
      <td>${fmtData(u.acesso_ate)}</td>
      <td><button class="btn btn-ghost btn-sm admin-reenviar">Reenviar link de senha</button></td>
    </tr>
  `).join('');

  elConteudo().innerHTML = `
    <div class="admin-panel">
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Cliente</th><th>Desde</th><th>Último acesso</th><th>Assinatura</th><th>Válido até</th><th></th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </div>
  `;

  elConteudo().querySelectorAll('.admin-reenviar').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.closest('tr').dataset.email;
      btn.disabled = true;
      const textoOriginal = btn.textContent;
      try {
        await Sb.resetPassword(email);
        btn.textContent = 'Enviado ✓';
        toast('Link de redefinição enviado para ' + email + '.', 'success');
      } catch (err) {
        btn.disabled = false;
        btn.textContent = textoOriginal;
        toast(err.message, 'danger');
      }
    });
  });
}

async function carregarUsuarios() {
  const r = await Sb.auth('/rest/v1/rpc/admin_listar_usuarios', { method: 'POST', body: JSON.stringify({}) });
  if (!r.ok) {
    const msg = (r.body && (r.body.message || r.body.msg)) || 'Falha ao carregar a lista.';
    throw new Error(msg === 'acesso negado' ? 'esta conta não tem permissão.' : msg);
  }
  return Array.isArray(r.body) ? r.body : [];
}

render();
