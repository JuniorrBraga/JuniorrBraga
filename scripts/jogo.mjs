/**
 * Jogo da velha jogável direto no README.
 *
 * Quem visita clica numa célula, o link abre uma issue com a jogada no
 * título, e a Action deste repositório aplica a jogada, responde pela casa
 * e reescreve o tabuleiro. Sem JavaScript na página: o GitHub não executa
 * script em markdown, então a interatividade vem de link + Action.
 *
 * Este arquivo é só a lógica — pura, sem rede e sem disco, para poder ser
 * testada sozinha.
 */

export const VAZIO = '.'
export const VISITANTE = 'X'
export const CASA = 'O'

const LINHAS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // horizontais
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // verticais
  [0, 4, 8], [2, 4, 6],            // diagonais
]

export function tabuleiroVazio() {
  return Array(9).fill(VAZIO)
}

/** Devolve { jogador, linha } quando alguém fechou três, senão null. */
export function vencedor(tabuleiro) {
  for (const linha of LINHAS) {
    const [a, b, c] = linha
    if (tabuleiro[a] !== VAZIO && tabuleiro[a] === tabuleiro[b] && tabuleiro[b] === tabuleiro[c]) {
      return { jogador: tabuleiro[a], linha }
    }
  }
  return null
}

export function livres(tabuleiro) {
  return tabuleiro.map((c, i) => (c === VAZIO ? i : -1)).filter((i) => i >= 0)
}

export function empatou(tabuleiro) {
  return !vencedor(tabuleiro) && livres(tabuleiro).length === 0
}

export function terminou(tabuleiro) {
  return Boolean(vencedor(tabuleiro)) || empatou(tabuleiro)
}

/** Minimax completo: devolve a pontuação da posição para `quem`. */
function pontuar(tabuleiro, quem, vez, profundidade) {
  const v = vencedor(tabuleiro)
  if (v) return v.jogador === quem ? 10 - profundidade : profundidade - 10
  if (livres(tabuleiro).length === 0) return 0

  const proximo = vez === VISITANTE ? CASA : VISITANTE
  const notas = livres(tabuleiro).map((i) => {
    tabuleiro[i] = vez
    const nota = pontuar(tabuleiro, quem, proximo, profundidade + 1)
    tabuleiro[i] = VAZIO
    return nota
  })
  return vez === quem ? Math.max(...notas) : Math.min(...notas)
}

export function melhorJogada(tabuleiro, quem = CASA) {
  const opcoes = livres(tabuleiro)
  if (opcoes.length === 0) return null

  let melhor = opcoes[0]
  let melhorNota = -Infinity
  for (const i of opcoes) {
    tabuleiro[i] = quem
    const nota = pontuar(tabuleiro, quem, quem === CASA ? VISITANTE : CASA, 0)
    tabuleiro[i] = VAZIO
    if (nota > melhorNota) {
      melhorNota = nota
      melhor = i
    }
  }
  return melhor
}

/**
 * A jogada da casa.
 *
 * O minimax puro é imbatível, e um jogo que ninguém nunca ganha deixa de
 * ser jogo. Uma vez a cada seis, a casa joga aleatório — continua difícil,
 * mas dá para vencer. `sorte` é injetável para o teste ser determinístico.
 */
export function jogadaDaCasa(tabuleiro, sorte = Math.random) {
  const opcoes = livres(tabuleiro)
  if (opcoes.length === 0) return null
  if (sorte() < 1 / 6) return opcoes[Math.floor(sorte() * opcoes.length)]
  return melhorJogada(tabuleiro, CASA)
}

export class JogadaInvalida extends Error {}

/**
 * Aplica a jogada do visitante e a resposta da casa, devolvendo o estado
 * novo. Não muta o estado recebido.
 */
export function jogar(estado, posicao, usuario, sorte = Math.random) {
  if (!Number.isInteger(posicao) || posicao < 0 || posicao > 8) {
    throw new JogadaInvalida(`Posição ${posicao} não existe: use de 0 a 8.`)
  }
  if (terminou(estado.tabuleiro)) {
    throw new JogadaInvalida('A partida já acabou. Comece uma nova.')
  }
  if (estado.tabuleiro[posicao] !== VAZIO) {
    throw new JogadaInvalida(`A casa ${posicao} já está ocupada.`)
  }

  const tabuleiro = [...estado.tabuleiro]
  tabuleiro[posicao] = VISITANTE

  let respostaDaCasa = null
  if (!terminou(tabuleiro)) {
    respostaDaCasa = jogadaDaCasa(tabuleiro, sorte)
    if (respostaDaCasa !== null) tabuleiro[respostaDaCasa] = CASA
  }

  const placar = { ...estado.placar }
  const v = vencedor(tabuleiro)
  let resultado = null
  if (v) {
    resultado = v.jogador === VISITANTE ? 'visitante' : 'casa'
    if (v.jogador === VISITANTE) placar.mundo += 1
    else placar.casa += 1
  } else if (empatou(tabuleiro)) {
    resultado = 'empate'
    placar.empates += 1
  }

  return {
    ...estado,
    tabuleiro,
    resultado,
    linhaVencedora: v ? v.linha : null,
    ultimo: { usuario, posicao, quando: new Date().toISOString() },
    respostaDaCasa,
    placar,
    partidas: resultado ? estado.partidas + 1 : estado.partidas,
  }
}

export function novaPartida(estado) {
  return {
    ...estado,
    tabuleiro: tabuleiroVazio(),
    resultado: null,
    linhaVencedora: null,
    respostaDaCasa: null,
  }
}

export function estadoInicial() {
  return {
    tabuleiro: tabuleiroVazio(),
    resultado: null,
    linhaVencedora: null,
    ultimo: null,
    respostaDaCasa: null,
    placar: { mundo: 0, casa: 0, empates: 0 },
    partidas: 0,
  }
}
