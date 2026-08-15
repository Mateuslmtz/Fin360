# Gera as camadas de texto dos videos (1080x1920, fundo transparente) e os cartoes finais.
# Renderizar com Chrome headless usando --default-background-color=00000000.
#
# SAFE ZONE do Reels/Stories: nada importante acima de y=280 nem abaixo de y=1230.
# O rodape do Reels (perfil, legenda, botoes) come os ultimos ~35% da altura.
import io, os

BASE = """<meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:1080px; height:1920px; }
body { background:transparent; font-family:"Segoe UI","Segoe UI Variable",Arial,sans-serif;
       color:#f5f7fa; -webkit-font-smoothing:antialiased; }
.frame { position:relative; width:1080px; height:1920px; }
/* faixa escura que garante leitura do texto por cima da gravacao */
.veu { position:absolute; left:0; right:0; top:0; height:900px;
  background:linear-gradient(180deg, rgba(6,9,22,.96) 0%, rgba(6,9,22,.95) 70%,
             rgba(6,9,22,.45) 85%, rgba(6,9,22,0) 100%); }
.bloco { position:absolute; left:70px; right:70px; top:290px; }
.logo { width:120px; height:auto; display:block; margin-bottom:34px; }
.tt { font-size:76px; line-height:1.05; font-weight:800; letter-spacing:-.03em;
      text-shadow:0 6px 34px rgba(0,0,0,.65); }
.tt .az { color:#5b84ff; }
.sb { margin-top:20px; font-size:34px; line-height:1.34; color:#c3cbe2; font-weight:500;
      text-shadow:0 4px 22px rgba(0,0,0,.7); }
__EXTRA__
</style>
<div class="frame">__BODY__</div>
"""

telas = {}

def cena(nome, titulo, sub=""):
    telas[nome] = dict(extra="", body=f"""
  <div class="veu"></div>
  <div class="bloco">
    <img class="logo" src="logo-branca.png">
    <div class="tt">{titulo}</div>
    {f'<div class="sb">{sub}</div>' if sub else ''}
  </div>""")

# ---------------------------------------------------------------- VIDEO 1
cena("ov-v1-a", 'Todo mês acaba<br>na mesma <span class="az">pergunta.</span>',
     "Sobrou alguma coisa?")
cena("ov-v1-b", 'Ele soma tudo<br><span class="az">sozinho.</span>',
     "O que entrou, o que saiu e o que ainda vem")
cena("ov-v1-c", 'O saldo do dia 30,<br><span class="az">antes do dia 30.</span>',
     "Projeção automática, sem planilha")

# ---------------------------------------------------------------- VIDEO 2
cena("ov-v2-a", 'A fatura não devia<br>ser <span class="az">surpresa.</span>',
     "3 cartões, 3 vencimentos")
cena("ov-v2-b", 'Ela vai somando<br><span class="az">enquanto fecha.</span>',
     "Você cadastra o cartão uma vez")
cena("ov-v2-c", 'Um número só,<br><span class="az">antes de chegar.</span>',
     "Limite, fatura e parcelas na mesma tela")

# ---------------------------------------------------------------- VIDEO 3
cena("ov-v3-a", 'Tudo em <span class="az">um<br>aplicativo só.</span>',
     "Sem planilha e sem cinco apps abertos")
cena("ov-v3-b", 'Os fixos entram<br><span class="az">sozinhos.</span>',
     "Aluguel, internet, academia — com o status de cada um")
cena("ov-v3-c", 'Você lança.<br><span class="az">Ele calcula.</span>',
     "Os gráficos se montam sozinhos")

# ---------------------------------------------------------------- CARTAO FINAL
# Opaco: e o ultimo trecho do video, nao fica gravacao por baixo.
FIM_EXTRA = """
body { background:#0a0e1f; }
.frame { background:
    radial-gradient(900px 700px at 84% 4%, rgba(56,102,255,.30), transparent 62%),
    radial-gradient(760px 600px at -12% 82%, rgba(30,63,204,.24), transparent 60%),
    #0a0e1f;
  display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
  padding-top:330px; }
.grid { position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size:96px 96px;
  mask-image:radial-gradient(620px 560px at 50% 34%, #000 30%, transparent 78%); }
.frame > *:not(.grid) { position:relative; z-index:1; }
.marca { width:290px; height:auto; }
.preco { margin-top:64px; display:flex; align-items:baseline; gap:16px; }
.preco b { font-size:150px; font-weight:800; letter-spacing:-.045em; line-height:1; }
.preco i { font-style:normal; font-size:42px; color:#8b93ac; font-weight:600; }
.gar { margin-top:34px; font-size:40px; font-weight:700; color:#cfd8ff;
  background:rgba(56,102,255,.12); border:1px solid rgba(56,102,255,.45);
  border-radius:999px; padding:24px 46px; }
.site { margin-top:58px; font-size:46px; font-weight:800; letter-spacing:-.01em; }
.cta { margin-top:26px; font-size:34px; color:#8b93ac; font-weight:600; }
"""
telas["fim"] = dict(extra=FIM_EXTRA, body="""
  <div class="grid"></div>
  <img class="marca" src="logo-branca.png">
  <div class="preco"><b>R$ 19,90</b><i>por mês</i></div>
  <div class="gar">7 dias de garantia</div>
  <div class="site">fin360app.com.br</div>
  <div class="cta">Cancele quando quiser</div>
""")

# ----------------------------------------------------------------
here = os.path.dirname(os.path.abspath(__file__))
for nome, p in telas.items():
    html = BASE.replace("__EXTRA__", p["extra"]).replace("__BODY__", p["body"])
    with io.open(os.path.join(here, nome + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("ok", nome)
