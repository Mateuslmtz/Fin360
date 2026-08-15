# Gera os HTMLs dos criativos de imagem do Meta Ads (1080x1350, 4:5).
# Paleta e componentes iguais aos de "Posts Instagram" — mesma identidade do app.
# Para mudar texto: editar aqui e rodar de novo (python gerar.py), depois render.py.
import io, os

SHELL = """<meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:1080px; height:1350px; overflow:hidden; }
body {
  background:#0a0e1f;
  font-family:"Segoe UI","Segoe UI Variable",Arial,sans-serif;
  color:#f5f7fa;
  -webkit-font-smoothing:antialiased;
}
.canvas {
  position:relative; width:1080px; height:1350px;
  padding:74px 76px 70px;
  display:flex; flex-direction:column;
  background:
    radial-gradient(900px 620px at 84% -8%, rgba(56,102,255,.30), transparent 62%),
    radial-gradient(760px 540px at -12% 104%, rgba(30,63,204,.24), transparent 60%),
    #0a0e1f;
  overflow:hidden;
}
.grid {
  position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,.032) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.032) 1px, transparent 1px);
  background-size:90px 90px;
  mask-image:radial-gradient(680px 620px at 50% 42%, #000 30%, transparent 78%);
}
.canvas > * { position:relative; z-index:1; }
.logo { width:126px; height:auto; display:block; }
.top { display:flex; align-items:center; justify-content:space-between; }
.tag {
  font-size:20px; font-weight:600; letter-spacing:.16em; text-transform:uppercase;
  color:#8b93ac; border:1px solid #232a4d; border-radius:999px; padding:11px 22px;
  background:rgba(19,26,54,.7);
}
h1 { font-size:86px; line-height:1.03; font-weight:800; letter-spacing:-.028em; }
h1 .az { color:#5b84ff; }
.sub { font-size:30px; line-height:1.42; color:#9aa3bd; font-weight:400; max-width:830px; }
.card { background:#131a36; border:1px solid #232a4d; border-radius:20px; }
.foot {
  margin-top:auto; padding-top:40px; display:flex; align-items:center;
  justify-content:space-between; border-top:1px solid #1a2140;
}
.site { font-size:29px; font-weight:700; color:#f5f7fa; letter-spacing:-.01em; }
.cta {
  font-size:26px; font-weight:800; color:#ffffff;
  background:#3866ff; border:1px solid #5b84ff;
  border-radius:999px; padding:17px 36px;
}
__EXTRA__
</style>
<div class="canvas">
  <div class="grid"></div>
  <div class="top">
    <img class="logo" src="logo-branca.png">
    <div class="tag">__TAG__</div>
  </div>
  __BODY__
  <div class="foot">
    <div class="site">fin360app.com.br</div>
    <div class="cta">__CTA__</div>
  </div>
</div>
<script>
/* medicao de estouro: o rodape tem que terminar dentro dos 1350px.
   ler com: chrome --headless --dump-dom | grep title  */
document.title = "FUNDO:" + Math.round(
  document.querySelector(".foot").getBoundingClientRect().bottom);
</script>
"""

ads = {}

# ------------------------------------------------------- ANÚNCIO 1 — fim do mês
# Ângulo: a projeção do saldo. Fala do que o app FAZ, não da situação de quem vê
# (política de atributos pessoais do Meta).
ads["ad-1-fim-do-mes"] = dict(
    tag="Controle financeiro",
    cta="Conhecer o Fin360",
    extra="""
.h { margin-top:70px; }
h1 { font-size:80px; }
.sub { margin-top:28px; }
.mock { margin-top:64px; display:grid; grid-template-columns:1fr 1fr; gap:22px; }
.kpi { padding:38px 34px 40px; }
.kpi .lab { font-size:21px; letter-spacing:.13em; text-transform:uppercase; color:#8b93ac; font-weight:600; }
.kpi .val { font-size:56px; font-weight:800; margin-top:16px; letter-spacing:-.02em; }
.kpi .hint { font-size:21px; color:#5b6489; margin-top:12px; }
.kpi.destaque { border-color:rgba(56,102,255,.55); background:rgba(56,102,255,.10); }
.g { color:#22c55e; } .r { color:#f04848; } .b { color:#5b84ff; } .c { color:#22d3ee; }
""",
    body="""
  <div class="h">
    <h1>Ele mostra quanto sobra<br><span class="az">antes do mês acabar.</span></h1>
    <div class="sub">O Fin360 junta o que entrou, o que já saiu e o que ainda vai sair —
    e projeta o saldo do dia 30 sozinho.</div>
  </div>
  <div class="mock">
    <div class="card kpi"><div class="lab">Saldo hoje</div>
      <div class="val c">R$ 8.027,30</div><div class="hint">Somando todas as contas</div></div>
    <div class="card kpi"><div class="lab">Ainda vai sair</div>
      <div class="val r">R$ 2.383,28</div><div class="hint">Fixos, faturas e agendados</div></div>
    <div class="card kpi"><div class="lab">Ainda vai entrar</div>
      <div class="val g">R$ 3.121,98</div><div class="hint">Salário e recebimentos</div></div>
    <div class="card kpi destaque"><div class="lab">Saldo no dia 30</div>
      <div class="val b">R$ 8.766,00</div><div class="hint">Projeção automática</div></div>
  </div>
""")

# ------------------------------------------------------- ANÚNCIO 2 — cartões
ads["ad-2-cartoes"] = dict(
    tag="Cartões de crédito",
    cta="Conhecer o Fin360",
    extra="""
.h { margin-top:40px; }
h1 { font-size:76px; }
.sub { margin-top:22px; }
.list { margin-top:40px; display:flex; flex-direction:column; gap:16px; }
.row { padding:24px 32px; display:flex; align-items:center; gap:24px; }
.chip { width:62px; height:44px; border-radius:9px; flex:none; }
.nm { font-size:31px; font-weight:700; }
.dt { font-size:21px; color:#8b93ac; margin-top:7px; }
.amt { margin-left:auto; text-align:right; }
.amt b { font-size:37px; font-weight:800; letter-spacing:-.02em; display:block; }
.amt span { font-size:19px; color:#5b6489; letter-spacing:.1em; text-transform:uppercase; font-weight:600; }
.tot { margin-top:20px; padding:24px 32px; border-radius:20px;
  background:rgba(56,102,255,.10); border:1px solid rgba(56,102,255,.40);
  display:flex; align-items:center; justify-content:space-between; }
.tot .l { font-size:27px; font-weight:700; color:#cfd8ff; }
.tot .v { font-size:46px; font-weight:800; letter-spacing:-.02em; color:#f5f7fa; }
""",
    body="""
  <div class="h">
    <h1>3 cartões.<br>3 vencimentos.<br><span class="az">1 número só.</span></h1>
    <div class="sub">A fatura vai somando enquanto ela fecha. O total aparece antes
    de chegar, não no dia do vencimento.</div>
  </div>
  <div class="list">
    <div class="card row">
      <div class="chip" style="background:linear-gradient(135deg,#8b3df5,#5b1fb0)"></div>
      <div><div class="nm">Nubank Roxinho</div><div class="dt">Fecha 03/09 · vence 10/09</div></div>
      <div class="amt"><b style="color:#f5a623">R$ 1.284,63</b><span>Fatura aberta</span></div>
    </div>
    <div class="card row">
      <div class="chip" style="background:linear-gradient(135deg,#ff8a3d,#d95b12)"></div>
      <div><div class="nm">Inter Gold</div><div class="dt">Fecha 28/08 · vence 05/09</div></div>
      <div class="amt"><b style="color:#f5a623">R$ 612,40</b><span>Fatura aberta</span></div>
    </div>
    <div class="card row">
      <div class="chip" style="background:linear-gradient(135deg,#3866ff,#12318f)"></div>
      <div><div class="nm">Caixa Elo</div><div class="dt">Fechou 20/08 · vence 27/08</div></div>
      <div class="amt"><b style="color:#f04848">R$ 389,17</b><span>A pagar</span></div>
    </div>
  </div>
  <div class="tot"><div class="l">Total comprometido</div><div class="v">R$ 2.286,20</div></div>
""")

# ------------------------------------------------------- ANÚNCIO 3 — preço
ads["ad-3-preco"] = dict(
    tag="Pagamento único",
    cta="Quero por R$ 47,90",
    extra="""
.h { margin-top:58px; }
.price { display:flex; align-items:baseline; gap:16px; }
.price b { font-size:126px; font-weight:800; letter-spacing:-.045em; line-height:1; }
.price i { font-style:normal; font-size:36px; color:#8b93ac; font-weight:600; }
h1 { font-size:60px; margin-top:24px; }
.list { margin-top:48px; display:flex; flex-direction:column; gap:16px; }
.it { display:flex; align-items:center; gap:20px; padding:24px 30px; font-size:29px; font-weight:600; }
.ck { width:38px; height:38px; border-radius:50%; flex:none; background:rgba(34,197,94,.15);
  border:1px solid rgba(34,197,94,.5); color:#22c55e; font-size:22px; font-weight:800;
  display:flex; align-items:center; justify-content:center; }
.gar { margin-top:38px; padding:26px 32px; border-radius:20px; font-size:26px; line-height:1.45;
  color:#cfd8ff; background:rgba(56,102,255,.10); border:1px solid rgba(56,102,255,.35); }
""",
    body="""
  <div class="h">
    <div class="price"><b>R$ 47,90</b><i>uma vez só</i></div>
    <h1>1 ano de acesso.<br><span class="az">Sem mensalidade.</span></h1>
  </div>
  <div class="list">
    <div class="card it"><div class="ck">✓</div>Cartões, gastos fixos e variáveis</div>
    <div class="card it"><div class="ck">✓</div>Metas de poupança e reserva de emergência</div>
    <div class="card it"><div class="ck">✓</div>Contas divididas com outras pessoas</div>
    <div class="card it"><div class="ck">✓</div>Funciona no celular e no computador</div>
  </div>
  <div class="gar"><b>7 dias de garantia.</b> Não gostou, devolvemos o valor.
  Paga uma vez e pronto — não vem cobrança nenhuma depois.</div>
""")

# ----------------------------------------------------------------
here = os.path.dirname(os.path.abspath(__file__))
for nome, p in ads.items():
    html = (SHELL.replace("__EXTRA__", p["extra"])
                 .replace("__TAG__", p["tag"])
                 .replace("__CTA__", p["cta"])
                 .replace("__BODY__", p["body"]))
    with io.open(os.path.join(here, nome + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("ok", nome)
