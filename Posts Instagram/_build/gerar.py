# Gera os HTMLs dos posts do Instagram (1080x1350) com a identidade do app.
import io, os

SHELL = """<meta charset="utf-8">
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html,body {{ width:1080px; height:1350px; overflow:hidden; }}
body {{
  background:#0a0e1f;
  font-family:"Segoe UI","Segoe UI Variable",Arial,sans-serif;
  color:#f5f7fa;
  -webkit-font-smoothing:antialiased;
}}
.canvas {{
  position:relative; width:1080px; height:1350px;
  padding:74px 76px 70px;
  display:flex; flex-direction:column;
  background:
    radial-gradient(900px 620px at 84% -8%, rgba(56,102,255,.30), transparent 62%),
    radial-gradient(760px 540px at -12% 104%, rgba(30,63,204,.24), transparent 60%),
    #0a0e1f;
  overflow:hidden;
}}
.grid {{
  position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,.032) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.032) 1px, transparent 1px);
  background-size:90px 90px;
  mask-image:radial-gradient(680px 620px at 50% 42%, #000 30%, transparent 78%);
}}
.canvas > * {{ position:relative; z-index:1; }}
.logo {{ width:126px; height:auto; display:block; }}
.top {{ display:flex; align-items:center; justify-content:space-between; }}
.tag {{
  font-size:20px; font-weight:600; letter-spacing:.16em; text-transform:uppercase;
  color:#8b93ac; border:1px solid #232a4d; border-radius:999px; padding:11px 22px;
  background:rgba(19,26,54,.7);
}}
h1 {{ font-size:86px; line-height:1.03; font-weight:800; letter-spacing:-.028em; }}
h1 .az {{ color:#5b84ff; }}
.sub {{ font-size:30px; line-height:1.42; color:#9aa3bd; font-weight:400; max-width:820px; }}
.card {{ background:#131a36; border:1px solid #232a4d; border-radius:20px; }}
.foot {{
  margin-top:auto; padding-top:40px; display:flex; align-items:center;
  justify-content:space-between; border-top:1px solid #1a2140;
}}
.site {{ font-size:29px; font-weight:700; color:#f5f7fa; letter-spacing:-.01em; }}
.cta {{
  font-size:24px; font-weight:700; color:#cfd8ff;
  background:rgba(56,102,255,.16); border:1px solid rgba(56,102,255,.45);
  border-radius:999px; padding:15px 30px;
}}
{extra}
</style>
<div class="canvas">
  <div class="grid"></div>
  <div class="top">
    <img class="logo" src="logo-branca.png">
    <div class="tag">{tag}</div>
  </div>
  {body}
  <div class="foot">
    <div class="site">fin360app.com.br</div>
    <div class="cta">{cta}</div>
  </div>
</div>
"""

posts = {}

# ---------------------------------------------------------------- POST 1
posts["post-1-apresentacao"] = dict(
    tag="Controle financeiro",
    cta="Teste hoje",
    extra="""
.h {{ margin-top:76px; }}
h1 {{ font-size:92px; }}
.sub {{ margin-top:28px; }}
.mock {{ margin-top:70px; display:grid; grid-template-columns:1fr 1fr; gap:22px; }}
.kpi {{ padding:40px 34px 42px; }}
.kpi .lab {{ font-size:21px; letter-spacing:.13em; text-transform:uppercase; color:#8b93ac; font-weight:600; }}
.kpi .val {{ font-size:58px; font-weight:800; margin-top:16px; letter-spacing:-.02em; }}
.kpi .hint {{ font-size:21px; color:#5b6489; margin-top:12px; }}
.g {{ color:#22c55e; }} .r {{ color:#f04848; }} .b {{ color:#3866ff; }} .c {{ color:#22d3ee; }}
""",
    body="""
  <div class="h">
    <h1>Todo o seu dinheiro<br>em <span class="az">uma tela só.</span></h1>
    <div class="sub">Contas, cartões, gastos fixos, metas e contas divididas.
    Sem planilha, sem cinco aplicativos abertos.</div>
  </div>
  <div class="mock">
    <div class="card kpi"><div class="lab">Saldo atual</div>
      <div class="val c">R$ 8.027,30</div><div class="hint">No fim do mês: R$ 8.766,00</div></div>
    <div class="card kpi"><div class="lab">Gastos do mês</div>
      <div class="val r">R$ 6.367,98</div><div class="hint">Já pago + a pagar</div></div>
    <div class="card kpi"><div class="lab">Recebimentos</div>
      <div class="val g">R$ 11.150,00</div><div class="hint">Já recebido + a receber</div></div>
    <div class="card kpi"><div class="lab">Saldo do mês</div>
      <div class="val b">R$ 4.782,02</div><div class="hint">Se tudo entrar e for pago</div></div>
  </div>
""")

# ---------------------------------------------------------------- POST 2
CATS = [("Moradia","38.0","#f04848","2.587,30"),("Alimentação","24.6","#22c55e","1.670,39"),
        ("Transporte","11.4","#3866ff","775,30"),("Saúde","9.8","#22d3ee","666,41"),
        ("Educação","8.4","#a855f7","574,80"),("Lazer","5.8","#f5a623","393,08")]
stops, acc = [], 0.0
for _n, p, c, _v in CATS:
    stops.append(f"{c} {acc:.2f}% {acc + float(p):.2f}%")
    acc += float(p)
stops.append(f"#5b6489 {acc:.2f}% 100%")
CONIC = ", ".join(stops)
LEG = "".join(
    f'<div class="lg"><span class="dot" style="background:{c}"></span>'
    f'<span class="nm">{n}</span><span class="pc">{p}%</span>'
    f'<span class="vl">R$ {v}</span></div>' for n, p, c, v in CATS)

posts["post-2-para-onde-foi"] = dict(
    tag="Gastos por categoria",
    cta="Descubra",
    extra="""
.h {{ margin-top:58px; }}
.big {{ font-size:104px; font-weight:800; color:#f04848; letter-spacing:-.03em; line-height:1; }}
.cap {{ font-size:26px; letter-spacing:.13em; text-transform:uppercase; color:#8b93ac; font-weight:600; margin-bottom:16px; }}
h1 {{ font-size:64px; margin-top:26px; }}
.wrap {{ margin-top:60px; display:flex; gap:46px; align-items:center; }}
.donut {{ position:relative; width:392px; height:392px; border-radius:50%;
  background:conic-gradient(%CONIC%); flex:none; }}
.donut::after {{ content:""; position:absolute; inset:90px; border-radius:50%;
  background:#0d1226; box-shadow:inset 0 0 0 1px #232a4d; }}
.leg {{ flex:1; display:flex; flex-direction:column; gap:17px; }}
.lg {{ display:flex; align-items:center; font-size:27px; }}
.dot {{ width:16px; height:16px; border-radius:50%; margin-right:16px; flex:none; }}
.nota {{ margin-top:44px; font-size:27px; line-height:1.45; color:#cfd8ff;
  background:rgba(56,102,255,.10); border:1px solid rgba(56,102,255,.35);
  border-radius:20px; padding:26px 32px; }}
.nm {{ color:#f5f7fa; font-weight:600; }}
.pc {{ color:#8b93ac; margin-left:11px; }}
.vl {{ margin-left:auto; color:#9aa3bd; font-variant-numeric:tabular-nums; }}
""".replace("%CONIC%", CONIC),
    body="""
  <div class="h">
    <div class="cap">Saíram do seu bolso este mês</div>
    <div class="big">R$ 6.803,98</div>
    <h1>Você consegue dizer<br><span class="az">pra onde foram?</span></h1>
  </div>
  <div class="wrap">
    <div class="donut"></div>
    <div class="leg">""" + LEG + """</div>
  </div>
  <div class="nota">Esse gráfico se monta sozinho conforme você lança os gastos.
  <b>Você não precisa somar nada.</b></div>
""")

# ---------------------------------------------------------------- POST 3
posts["post-3-cartoes"] = dict(
    tag="Cartões de crédito",
    cta="Ver como",
    extra="""
.h {{ margin-top:64px; }}
h1 {{ font-size:88px; }}
.sub {{ margin-top:28px; }}
.list {{ margin-top:56px; display:flex; flex-direction:column; gap:20px; }}
.row {{ padding:28px 32px; display:flex; align-items:center; gap:24px; }}
.chip {{ width:62px; height:44px; border-radius:9px; flex:none; }}
.nm {{ font-size:31px; font-weight:700; }}
.dt {{ font-size:21px; color:#8b93ac; margin-top:7px; }}
.amt {{ margin-left:auto; text-align:right; }}
.amt b {{ font-size:37px; font-weight:800; letter-spacing:-.02em; display:block; }}
.amt span {{ font-size:19px; color:#5b6489; letter-spacing:.1em; text-transform:uppercase; font-weight:600; }}
""",
    body="""
  <div class="h">
    <h1>3 cartões.<br>3 vencimentos.<br><span class="az">1 susto por mês.</span></h1>
    <div class="sub">O Fin360 soma a fatura enquanto ela fecha — e não no dia
    em que ela chega.</div>
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
""")

# ---------------------------------------------------------------- POST 4
posts["post-4-preco"] = dict(
    tag="Pagamento único",
    cta="Quero o meu",
    extra="""
.h {{ margin-top:60px; }}
.price {{ display:flex; align-items:baseline; gap:16px; }}
.price b {{ font-size:132px; font-weight:800; letter-spacing:-.045em; line-height:1; }}
.price i {{ font-style:normal; font-size:36px; color:#8b93ac; font-weight:600; }}
h1 {{ font-size:62px; margin-top:26px; }}
.list {{ margin-top:52px; display:flex; flex-direction:column; gap:16px; }}
.it {{ display:flex; align-items:center; gap:20px; padding:24px 30px; font-size:29px; font-weight:600; }}
.ck {{ width:38px; height:38px; border-radius:50%; flex:none; background:rgba(34,197,94,.15);
  border:1px solid rgba(34,197,94,.5); color:#22c55e; font-size:22px; font-weight:800;
  display:flex; align-items:center; justify-content:center; }}
.gar {{ margin-top:40px; padding:26px 32px; border-radius:20px; font-size:26px; line-height:1.45;
  color:#cfd8ff; background:rgba(56,102,255,.10); border:1px solid rgba(56,102,255,.35); }}
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
for nome, p in posts.items():
    # o CSS de `extra` entra depois do .format(), entao usa chave simples
    extra = p["extra"].replace("{{", "{").replace("}}", "}")
    html = SHELL.format(extra=extra, tag=p["tag"], cta=p["cta"], body=p["body"])
    with io.open(os.path.join(here, nome + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("ok", nome)
