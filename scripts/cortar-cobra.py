"""
Corta a faixa de cima do GIF da cobra.

A ação que gera a animação estaciona a cobra numa faixa ACIMA da grade no
início e no fim do laço — ela "entra em cena" vinda de fora. Visto de
relance, parece que a cobra escapou dos quadradinhos. Recortar essa faixa
faz ela simplesmente surgir pela borda, que é o que se espera.

O corte é medido, não chutado: o script acha onde a primeira fileira de
quadradinhos começa e corta logo acima dela.
"""
import sys
from PIL import Image, ImageSequence

TOLERANCIA = 4  # px de folga acima da primeira fileira


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
               for q in ImageSequence.Iterator(im)]
    quadros[0].save(caminho, save_all=True, append_images=quadros[1:], loop=0,
                    duration=im.info.get("duration", 100), optimize=True)
    print(f"{caminho}: cortados {topo}px do topo, {len(quadros)} quadros")


if __name__ == "__main__":
    for caminho in sys.argv[1:]:
        cortar(caminho)
