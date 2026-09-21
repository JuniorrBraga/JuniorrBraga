"""
Apara a moldura do SVG da cobra.

A ação desenha a grade a partir de y=0 e reserva 32 unidades acima dela no
viewBox. É nessa faixa que a cobra fica antes de entrar e depois de sair —
vista de relance, parece que ela escapou dos quadradinhos.

Aqui não se mexe na animação nem nas cores: só se encolhe a área visível,
de forma que a cobra desapareça pela borda de cima, como em qualquer jogo.

Falha alto se o formato do viewBox mudar, em vez de seguir adiante fingindo
que aparou.
"""
import re
import sys

MARGEM = 4  # unidades mantidas acima da primeira fileira


def aparar(caminho):
    svg = open(caminho, encoding="utf-8").read()

    m = re.search(r'viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"', svg)
    if not m:
        raise SystemExit(f"{caminho}: não achei o viewBox — formato mudou?")

    x, topo, largura, altura = (float(v) for v in m.groups())
    if topo >= -MARGEM:
        print(f"{caminho}: já está aparado")
        return

    corte = -topo - MARGEM
    novo_topo, nova_altura = -MARGEM, altura - corte

    svg = svg.replace(
        m.group(0),
        f'viewBox="{x:g} {novo_topo:g} {largura:g} {nova_altura:g}"',
        1,
    )
    svg = re.sub(r'height="%g"' % altura, f'height="{nova_altura:g}"', svg, count=1)

    open(caminho, "w", encoding="utf-8").write(svg)
    print(f"{caminho}: aparadas {corte:g} unidades do topo "
          f"({altura:g} -> {nova_altura:g} de altura)")


if __name__ == "__main__":
    for caminho in sys.argv[1:]:
        aparar(caminho)
