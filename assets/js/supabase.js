/* Fin360 — cliente do Supabase (auth + estado), escrito à mão com fetch.
   Sem biblioteca externa de propósito: o resto do app é JS puro e a API do Supabase
   é HTTP simples. Evita CDN, versão que muda sozinha e arquivo pra baixar.

   A chave abaixo é PUBLICÁVEL — ela é feita para ficar no navegador. O que protege os
   dados é o RLS no banco (cada pessoa só lê e grava a própria linha), não o segredo
   da chave. A chave secreta (sb_secret_...) NUNCA entra aqui. */

const SB_URL = 'https://gcutaavpaboqvtzvknyj.supabase.co';
const SB_KEY = 'sb_publishable_8EdMFNGTRH9KjzfkNODfOA_bOg3ENsK';

const SB_SESSION_KEY = 'fin360_sb_session_v1';

const Sb = {
  session: null,

  // ---- sessão ----

  loadSession() {
    try {
      const raw = localStorage.getItem(SB_SESSION_KEY);
      this.session = raw ? JSON.parse(raw) : null;
    } catch (e) {
      this.session = null;
    }
    return this.session;
  },

  saveSession(s) {
    // o Supabase manda expires_in (segundos); guardamos o instante absoluto pra saber quando renovar
    if (s && s.access_token) {
      s.expires_at = Date.now() + (s.expires_in || 3600) * 1000;
      this.session = s;
      localStorage.setItem(SB_SESSION_KEY, JSON.stringify(s));
    } else {
      this.clearSession();
    }
    return this.session;
  },

  clearSession() {
    this.session = null;
    localStorage.removeItem(SB_SESSION_KEY);
  },

  isLoggedIn() {
    return !!(this.session && this.session.access_token);
  },

  user() {
    return (this.session && this.session.user) || null;
  },

  userId() {
    const u = this.user();
    return u ? u.id : null;
  },

  userName() {
    const u = this.user();
    if (!u) return '';
    return (u.user_metadata && u.user_metadata.nome) || u.email || '';
  },

  userEmail() {
    const u = this.user();
    return u ? u.email : '';
  },

  // ---- requisições ----

  headers(extra) {
    const h = Object.assign({ apikey: SB_KEY, 'Content-Type': 'application/json' }, extra || {});
    h.Authorization = 'Bearer ' + (this.isLoggedIn() ? this.session.access_token : SB_KEY);
    return h;
  },

  async raw(path, options) {
    const res = await fetch(SB_URL + path, options);
    let body = null;
    const texto = await res.text();
    if (texto) { try { body = JSON.parse(texto); } catch (e) { body = texto; } }
    return { ok: res.ok, status: res.status, body };
  },

  // renova o token quando falta menos de 5 min pra expirar; devolve false se não deu
  async refreshIfNeeded() {
    if (!this.session || !this.session.refresh_token) return false;
    if (this.session.expires_at && this.session.expires_at - Date.now() > 5 * 60 * 1000) return true;
    const r = await this.raw('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.session.refresh_token }),
    });
    if (r.ok && r.body && r.body.access_token) { this.saveSession(r.body); return true; }
    // refresh token inválido/expirado: a sessão morreu de verdade
    this.clearSession();
    return false;
  },

  // chamada autenticada, com uma tentativa de renovar em caso de 401
  async auth(path, options, jaRenovou) {
    if (!jaRenovou) await this.refreshIfNeeded();
    const opts = Object.assign({}, options, { headers: this.headers(options && options.headers) });
    const r = await this.raw(path, opts);
    if (r.status === 401 && !jaRenovou && this.session && this.session.refresh_token) {
      this.session.expires_at = 0; // força a renovação
      if (await this.refreshIfNeeded()) return this.auth(path, options, true);
    }
    return r;
  },

  // ---- autenticação ----

  // Mensagens de erro do Supabase vêm em inglês; traduzimos as comuns.
  erroLegivel(body, status) {
    const msg = (body && (body.msg || body.error_description || body.message || body.error)) || '';
    const m = String(msg).toLowerCase();
    if (m.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
    if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Veja sua caixa de entrada (e o spam).';
    if (m.includes('user already registered') || m.includes('already been registered')) return 'Já existe uma conta com esse e-mail.';
    if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (m.includes('unable to validate email')) return 'Informe um e-mail válido.';
    if (m.includes('for security purposes') || status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
    if (m.includes('same as the old password')) return 'A nova senha precisa ser diferente da atual.';
    return msg || 'Não foi possível completar a operação. Tente de novo.';
  },

  async signUp(nome, email, senha) {
    const r = await this.raw('/auth/v1/signup', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: senha, data: { nome: nome } }),
    });
    if (!r.ok) throw new Error(this.erroLegivel(r.body, r.status));
    // com confirmação de e-mail ligada, o cadastro NÃO devolve sessão
    if (r.body && r.body.access_token) this.saveSession(r.body);
    return { precisaConfirmar: !(r.body && r.body.access_token) };
  },

  async signIn(email, senha) {
    const r = await this.raw('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: senha }),
    });
    if (!r.ok || !r.body || !r.body.access_token) throw new Error(this.erroLegivel(r.body, r.status));
    return this.saveSession(r.body);
  },

  async signOut() {
    if (this.isLoggedIn()) {
      // se falhar (offline, token já morto) não importa: a sessão local sai de qualquer jeito
      try { await this.auth('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* ignora */ }
    }
    this.clearSession();
  },

  async resetPassword(email) {
    const r = await this.raw('/auth/v1/recover', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email }),
    });
    if (!r.ok) throw new Error(this.erroLegivel(r.body, r.status));
  },

  async updatePassword(novaSenha) {
    const r = await this.auth('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({ password: novaSenha }),
    });
    if (!r.ok) throw new Error(this.erroLegivel(r.body, r.status));
    return r.body;
  },

  // ---- estado financeiro ----

  // devolve { estado, versao } ou null se ainda não existe linha
  async fetchEstado() {
    const uid = this.userId();
    if (!uid) return null;
    const r = await this.auth(`/rest/v1/estado_usuario?user_id=eq.${uid}&select=estado,versao`, { method: 'GET' });
    if (!r.ok) throw new Error('Falha ao carregar seus dados do servidor.');
    if (!Array.isArray(r.body) || r.body.length === 0) return null;
    return { estado: r.body[0].estado, versao: r.body[0].versao };
  },

  // grava o estado. versaoEsperada = a que lemos por último.
  // Se o servidor estiver numa versão diferente, alguém gravou no meio: devolve conflito
  // em vez de sobrescrever (é o caso de duas abas ou dois aparelhos abertos).
  async saveEstado(estado, versaoEsperada) {
    const uid = this.userId();
    if (!uid) return { ok: false, motivo: 'sem-sessao' };

    // primeira gravação: a linha ainda não existe
    if (versaoEsperada === null || versaoEsperada === undefined) {
      const r = await this.auth('/rest/v1/estado_usuario', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: uid, estado: estado, versao: 1 }),
      });
      if (r.ok && Array.isArray(r.body) && r.body[0]) return { ok: true, versao: r.body[0].versao };
      if (r.status === 409) return { ok: false, motivo: 'conflito' }; // linha criada por outra aba
      return { ok: false, motivo: 'erro', detalhe: r.body };
    }

    const r = await this.auth(
      `/rest/v1/estado_usuario?user_id=eq.${uid}&versao=eq.${versaoEsperada}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ estado: estado, versao: versaoEsperada + 1, atualizado_em: new Date().toISOString() }),
      }
    );
    if (!r.ok) return { ok: false, motivo: 'erro', detalhe: r.body };
    // 0 linhas afetadas = a versão no servidor não é mais a que a gente tinha
    if (!Array.isArray(r.body) || r.body.length === 0) return { ok: false, motivo: 'conflito' };
    return { ok: true, versao: r.body[0].versao };
  },
};
