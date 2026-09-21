"""
Ajusta o GIF da cobra: corta a faixa de cima e acelera o laço.

A ação que gera a animação estaciona a cobra numa faixa ACIMA da grade no
início e no fim do laço — ela "entra em cena" vinda de fora. Visto de
relance, parece que a cobra escapou dos quadradinhos. Recortar essa faixa
faz ela simplesmente surgir pela borda, que é o que se espera.

O laço original tem 339 quadros de 100ms — 34 segundos, tão devagar que
parece travado. Metade dos quadros a 55ms deixa em torno de 9 segundos.

O corte é medido, não chutado: o script acha onde a primeira fileira de
quadradinhos começa e corta logo acima dela.
"""
import os
import sys
from PIL import Image, ImageSequence

TOLERANCIA = 0   # zero: qualquer folga deixa aparecer a cobra estacionada
PULO = 2         # fica com 1 de cada 2 quadros
DURACAO = 55     # ms por quadro — o padrão da ação dá um laço de 34s, lento demais


def primeira_fileira(quadro):
    """Linha em que a grade de contribuições começa."""
    largura, altura = quadro.size
    fundo = quadro.getpixel((2, 2))
    for y in range(altura):
        diferentes = sum(1 for x in range(0, largura, 3) if quadro.getpixel((x, y)) != fundo)
        # a grade ocupa a largura inteira; a cobra sozinha são poucos pixels
        if diferentes > largura // 12:
            return y
    return 0


def cortar(caminho):
    im = Image.open(caminho)
    meio = im.n_frames // 2
    im.seek(meio)
    topo = max(0, primeira_fileira(im.convert("RGB")) - TOLERANCIA)
    if topo == 0:
        print(f"{caminho}: nada para cortar")
        return

    im.seek(0)
    quadros = [q.convert("RGB").crop((0, topo, im.width, im.height))
               for i, q in enumerate(ImageSequence.Iterator(im)) if i % PULO == 0]

    # Escreve num temporário e substitui. A ação que gera o GIF roda em
    # contêiner e deixa o arquivo sem permissão de escrita para o runner;
    # gravar por cima falha, mas trocar o arquivo na pasta funciona.
    temporario = caminho + ".tmp.gif"
    quadros[0].save(temporario, save_all=True, append_images=quadros[1:], loop=0,
                    duration=DURACAO, optimize=True)
    im.close()
    os.replace(temporario, caminho)
    print(f"{caminho}: cortados {topo}px, {len(quadros)} quadros, "
          f"laço de {len(quadros) * DURACAO / 1000:.1f}s")


if __name__ == "__main__":
    for caminho in sys.argv[1:]:
        cortar(caminho)
