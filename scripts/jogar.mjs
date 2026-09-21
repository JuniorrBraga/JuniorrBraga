/**
 * Ponte entre a issue e o jogo: lê o título, aplica a jogada, salva o
 * estado e reescreve o tabuleiro nos READMEs.
 *
 *   TITULO="jogada 4" USUARIO=fulano node scripts/jogar.mjs
 *
 * Sai com código 1 e uma mensagem legível quando a jogada não vale — a
 * Action usa isso para comentar na issue em vez de falhar em silêncio.
 */
import { existsSync } from 'node:fs'
import { JogadaInvalida, jogar, novaPartida } from './jogo.mjs'
import { aplicarNoArquivo, blocoDoJogo, lerEstado, salvarEstado } from './build-jogo.mjs'

const titulo = (process.env.TITULO ?? '').trim().toLowerCase()
const usuario = (process.env.USUARIO ?? '').trim()

function publicar(estado) {
  salvarEstado(estado)
  aplicarNoArquivo('README.md', blocoDoJogo(estado, 'pt'))
  if (existsSync('README.en.md')) aplicarNoArquivo('README.en.md', blocoDoJogo(estado, 'en'))
}

try {
  const estado = lerEstado()

  if (/^nova partida$/.test(titulo)) {
    publicar(novaPartida(estado))
    console.log('Tabuleiro limpo. Boa partida!')
    process.exit(0)
  }

  const m = /^jogada\s+([0-8])$/.exec(titulo)
  if (!m) {
    throw new JogadaInvalida(
      'Não entendi o título. Use "jogada N" com N de 0 a 8, ou "nova partida".',
    )
  }

  const depois = jogar(estado, Number(m[1]), usuario)
  publicar(depois)

  const recado =
    depois.resultado === 'visitante' ? 'Você venceu! 🏆'
    : depois.resultado === 'casa'    ? 'Dessa vez a casa levou.'
    : depois.resultado === 'empate'  ? 'Deu velha.'
    : `A casa respondeu na casa ${depois.respostaDaCasa}. Sua vez.`
  console.log(recado)
} catch (erro) {
  if (erro instanceof JogadaInvalida) {
    console.error(erro.message)
    process.exit(1)
  }
  throw erro
}
