import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CASA,
  JogadaInvalida,
  VAZIO,
  VISITANTE,
  empatou,
  estadoInicial,
  jogar,
  melhorJogada,
  novaPartida,
  vencedor,
} from './jogo.mjs'

const t = (s) => s.split('')
/** sorte fixa: nunca cai no ramo aleatório, então a casa joga ótimo */
const semSorte = () => 0.99

test('detecta vitória na linha, coluna e diagonal', () => {
  assert.equal(vencedor(t('XXX......')).jogador, VISITANTE)
  assert.equal(vencedor(t('O..O..O..')).jogador, CASA)
  assert.equal(vencedor(t('X...X...X')).jogador, VISITANTE)
  assert.deepEqual(vencedor(t('..X.X.X..')).linha, [2, 4, 6])
})

test('não vê vitória onde não há', () => {
  assert.equal(vencedor(t('XOX.O.X..')), null)
  assert.equal(vencedor(t('.........')), null)
})

test('empate é tabuleiro cheio sem vencedor', () => {
  assert.equal(empatou(t('XXOOOXXOX')), true)
  assert.equal(empatou(t('XXX......')), false)
})

test('a casa fecha o jogo quando tem a vitória na mão', () => {
  // O em 0 e 1: a jogada óbvia é fechar em 2
  assert.equal(melhorJogada(t('OO.XX....'), CASA), 2)
})

test('a casa bloqueia a vitória do visitante', () => {
  // X ameaça fechar em 2; sem vitória própria disponível, precisa bloquear
  assert.equal(melhorJogada(t('XX.O.....'), CASA), 2)
})

test('jogando ótimo, a casa nunca perde', () => {
  // joga todas as aberturas possíveis do visitante até o fim
  const jogarTudo = (tabuleiro, vez) => {
    const v = vencedor(tabuleiro)
    if (v) {
      assert.notEqual(v.jogador, VISITANTE, `visitante venceu em ${tabuleiro.join('')}`)
      return
    }
    const livres = tabuleiro.map((c, i) => (c === VAZIO ? i : -1)).filter((i) => i >= 0)
    if (livres.length === 0) return

    if (vez === CASA) {
      const copia = [...tabuleiro]
      copia[melhorJogada(copia, CASA)] = CASA
      jogarTudo(copia, VISITANTE)
      return
    }
    for (const i of livres) {
      const copia = [...tabuleiro]
      copia[i] = VISITANTE
      jogarTudo(copia, CASA)
    }
  }
  jogarTudo(t('.........'), VISITANTE)
})

test('a jogada do visitante e a resposta da casa entram juntas', () => {
  const depois = jogar(estadoInicial(), 4, 'amigo', semSorte)
  assert.equal(depois.tabuleiro[4], VISITANTE)
  assert.equal(depois.tabuleiro.filter((c) => c === CASA).length, 1)
  assert.equal(depois.ultimo.usuario, 'amigo')
})

test('casa ocupada é recusada', () => {
  const depois = jogar(estadoInicial(), 0, 'amigo', semSorte)
  assert.throws(() => jogar(depois, 0, 'outro', semSorte), JogadaInvalida)
})

test('posição fora do tabuleiro é recusada', () => {
  for (const ruim of [-1, 9, 1.5, NaN, 'meio']) {
    assert.throws(() => jogar(estadoInicial(), ruim, 'amigo', semSorte), JogadaInvalida)
  }
})

test('não dá para jogar em partida encerrada', () => {
  const encerrada = { ...estadoInicial(), tabuleiro: t('XXX OO...'.replace(' ', '.')) }
  assert.throws(() => jogar(encerrada, 8, 'amigo', semSorte), JogadaInvalida)
})

test('o estado recebido não é modificado', () => {
  const antes = estadoInicial()
  const copia = JSON.parse(JSON.stringify(antes))
  jogar(antes, 0, 'amigo', semSorte)
  assert.deepEqual(antes, copia)
})

test('o placar conta a vitória do visitante', () => {
  // visitante prestes a fechar em 2; a casa não tem como impedir nem vencer
  const quase = { ...estadoInicial(), tabuleiro: t('XX.OO.X.O') }
  const depois = jogar(quase, 2, 'amigo', semSorte)
  assert.equal(depois.resultado, 'visitante')
  assert.equal(depois.placar.mundo, 1)
  assert.deepEqual(depois.linhaVencedora, [0, 1, 2])
})

test('nova partida limpa o tabuleiro e preserva o placar', () => {
  const jogado = jogar(estadoInicial(), 4, 'amigo', semSorte)
  const nova = novaPartida({ ...jogado, placar: { mundo: 3, casa: 2, empates: 1 } })
  assert.deepEqual(nova.tabuleiro, Array(9).fill(VAZIO))
  assert.deepEqual(nova.placar, { mundo: 3, casa: 2, empates: 1 })
})

test('uma vez ou outra a casa erra de propósito, senão ninguém ganha', () => {
  // sorte baixa cai no ramo aleatório
  const jogada = jogar(estadoInicial(), 0, 'amigo', () => 0.01)
  assert.equal(jogada.tabuleiro.filter((c) => c === CASA).length, 1)
})
