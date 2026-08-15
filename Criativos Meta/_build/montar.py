# Monta os videos verticais (1080x1920, 30fps) a partir da gravacao de tela,
# das camadas de texto (_overlay) e da narracao em blocos (_voz).
#
# Rodar:  python montar.py v1        (ou v2, v3, ou "todos")
#
# Regras de enquadramento, ja verificadas frame a frame:
#   - y 0..900   fica atras do veu escuro do texto  -> nao colocar numero importante ai
#   - y 900..1230 e a FAIXA LIMPA -> e onde o numero que fecha a frase tem que estar
#   - y 1230..1920 o Reels tapa com perfil/legenda/botoes
# Por isso cada cena tem um "ss" escolhido a dedo: e o instante da rolagem em que o
# card certo esta na faixa limpa. Mudar o ss sem conferir o frame quebra a peca.

import json, os, subprocess, sys, tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ...\Criativos Meta
PROJ = os.path.dirname(RAIZ)
GRAV = os.path.join(PROJ, "VÍDEO PARA MARKETING", "DADOS PARA USO", "gravação tela 2.mp4")
OVER = os.path.join(RAIZ, "_overlay")
VOZ = os.path.join(RAIZ, "_voz")
SAIDA = RAIZ

# Nao usar a "gravação tela 1.mp4": ela mostra mateuslmtz.github.io na barra do
# navegador, que e o endereco antigo do app.

VIDEOS = {
    "v1": dict(
        nome="video-1-fim-do-mes",
        cenas=[
            # (overlay,      ss da gravacao, duracao)
            ("ov-v1-a", 24.5, 4.75),   # Ultimos lancamentos rolando
            ("ov-v1-b", 10.8, 5.35),   # Projecao do mes: gastos, recebimentos, saldo
            ("ov-v1-c",  2.5, 3.95),   # Saldo atual + "No fim do mes: R$ 8.766,00"
        ],
        fim=4.55,
        # (arquivo de voz, instante em que entra)
        voz=[("v1-c1", 0.20), ("v1-c2", 4.95), ("v1-c3", 10.35), ("v1-c4", 14.45)],
    ),
    "v2": dict(
        nome="video-2-cartoes",
        cenas=[
            ("ov-v2-a", 49.0, 3.60),   # Seus cartoes / A pagar no mes R$ 3.840,34
            ("ov-v2-b", 52.0, 6.60),   # Cartoes, parcelas ativas, limite total
            ("ov-v2-c", 58.8, 4.30),   # Rosca "Total R$ 2.473,19" da fatura
        ],
        fim=4.60,
        voz=[("v2-c1", 0.20), ("v2-c2", 3.75), ("v2-c3", 10.50), ("v2-c4", 14.95)],
    ),
    "v3": dict(
        nome="video-3-tudo-em-um",
        cenas=[
            ("ov-v3-a", 43.05, 3.05),  # Menu lateral aberto (so fica aberto 43-46)
            ("ov-v3-b", 101.20, 4.30), # Gastos fixos: totais + lista com PAGO/A PAGAR
            ("ov-v3-c", 17.80, 4.00),  # Rosca de gastos por categoria subindo
        ],
        fim=4.85,
        voz=[("v3-c1", 0.15), ("v3-c2", 3.95), ("v3-c3", 8.25), ("v3-c4", 11.95)],
    ),
}


def rodar(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print("FALHOU:", " ".join(args[:6]), "...")
        print(r.stderr[-1500:])
        sys.exit(1)


def duracao(caminho):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", caminho], capture_output=True, text=True)
    return float(r.stdout.strip())


def montar(chave):
    v = VIDEOS[chave]
    tmp = tempfile.mkdtemp(prefix="fin360-")
    partes = []

    # --- cenas com a gravacao por baixo e o texto por cima
    for i, (ov, ss, dur) in enumerate(v["cenas"]):
        alvo = os.path.join(tmp, f"cena{i}.mp4")
        rodar(["ffmpeg", "-v", "error", "-ss", str(ss), "-t", str(dur), "-i", GRAV,
               "-i", os.path.join(OVER, ov + ".png"),
               "-filter_complex",
               "[0:v]scale=1080:-2,crop=1080:1920:0:0,fps=30,setsar=1[bg];"
               "[bg][1:v]overlay=0:0,format=yuv420p[v]",
               "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "20",
               "-preset", "medium", alvo, "-y"])
        partes.append(alvo)

    # --- cartao final (imagem parada)
    alvo = os.path.join(tmp, "fim.mp4")
    rodar(["ffmpeg", "-v", "error", "-loop", "1", "-t", str(v["fim"]),
           "-i", os.path.join(OVER, "fim.png"),
           "-vf", "fps=30,format=yuv420p,setsar=1", "-c:v", "libx264", "-crf", "20",
           "-preset", "medium", alvo, "-y"])
    partes.append(alvo)

    # --- junta as partes
    lista = os.path.join(tmp, "lista.txt")
    with open(lista, "w", encoding="utf-8") as f:
        for p in partes:
            f.write("file '%s'\n" % p.replace("\\", "/"))
    mudo = os.path.join(tmp, "mudo.mp4")
    rodar(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", lista,
           "-c", "copy", mudo, "-y"])

    total = duracao(mudo)

    # --- narracao: cada bloco entra no seu instante
    entradas, filtros, rotulos = [], [], []
    for i, (arq, t) in enumerate(v["voz"]):
        entradas += ["-i", os.path.join(VOZ, arq + ".mp3")]
        ms = int(round(t * 1000))
        filtros.append(f"[{i+1}:a]adelay={ms}|{ms}[a{i}]")
        rotulos.append(f"[a{i}]")
    filtros.append("".join(rotulos) +
                   f"amix=inputs={len(rotulos)}:normalize=0,"
                   f"apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[voz]")

    final = os.path.join(SAIDA, v["nome"] + ".mp4")
    rodar(["ffmpeg", "-v", "error", "-i", mudo] + entradas +
          ["-filter_complex", ";".join(filtros),
           "-map", "0:v", "-map", "[voz]",
           "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
           "-movflags", "+faststart", "-shortest", final, "-y"])

    print(f"{v['nome']}.mp4  —  {duracao(final):.1f}s")


if __name__ == "__main__":
    alvo = sys.argv[1] if len(sys.argv) > 1 else "todos"
    for k in (VIDEOS if alvo == "todos" else [alvo]):
        montar(k)
