/**
 * Escreve o bloco do jogo dentro dos READMEs, entre os marcadores
 * <!-- JOGO:INICIO --> e <!-- JOGO:FIM -->.
 *
 * Cada casa vazia vira um link que abre uma issue com a jogada no título.
 * É o único jeito de ter interação num README: o GitHub não executa script,
 * mas executa Action — e Action responde a issue.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { estadoInicial } from './jogo.mjs'

const REPO = process.env.GH_REPO ?? 'JuniorrBraga/JuniorrBraga'
const ARQUIVO_ESTADO = 'jogo/estado.json'

export function lerEstado() {
  if (!existsSync(ARQUIVO_ESTADO)) return estadoInicial()
  return { ...estadoInicial(), ...JSON.parse(readFileSync(ARQUIVO_ESTADO, 'utf8')) }
}

export function salvarEstado(estado) {
  mkdirSync(dirname(ARQUIVO_ESTADO), { recursive: true })
  writeFileSync(ARQUIVO_ESTADO, JSON.stringify(estado, null, 2) + '\n')
}

const linkJogada = (i) =>
  `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(`jogada ${i}`)}` +
  `&body=${encodeURIComponent('É só enviar. A jogada entra sozinha e a issue fecha em seguida.')}`

const linkNova = () =>
  `https://github.com/${REPO}/issues/new?title=${encodeURIComponent('nova partida')}` +
  `&body=${encodeURIComponent('É só enviar para limpar o tabuleiro.')}`

const TEXTOS = {
  pt: {
    suaVez: 'Clique numa casa vazia. Você é o ✕.',
    venceu: (u) => `${u ? '@' + u + ' ' : ''}venceu. 🏆`,
    perdeu: (u) => `${u ? '@' + u + ' ' : ''}perdeu essa.`,
    empate: 'Deu velha.',
    nova: 'Começar outra',
    placar: (p) => `visitantes ${p.mundo} · casa ${p.casa} · empates ${p.empates}`,
    ultimo: (u) => `última jogada: @${u}`,
  },
  en: {
    suaVez: 'Click an empty square. You are ✕.',
    venceu: (u) => `${u ? '@' + u + ' ' : ''}won. 🏆`,
    perdeu: (u) => `${u ? '@' + u + ' ' : ''}lost this one.`,
    empate: 'Draw.',
    nova: 'Start another',
    placar: (p) => `visitors ${p.mundo} · house ${p.casa} · draws ${p.empates}`,
    ultimo: (u) => `last move: @${u}`,
  },
}

function imagemDaCasa(estado, i) {
  const valor = estado.tabuleiro[i]
  const venceu = estado.linhaVencedora?.includes(i)
  if (valor === 'X') return venceu ? 'x-venceu' : 'x'
  if (valor === 'O') return venceu ? 'o-venceu' : 'o'
  return 'vazia'
}

export function blocoDoJogo(estado, idioma = 'pt') {
  const txt = TEXTOS[idioma]
  const acabou = Boolean(estado.resultado)

  const linhas = []
  for (let l = 0; l < 3; l++) {
    const casas = []
    for (let c = 0; c < 3; c++) {
      const i = l * 3 + c
      const img = `<img src="./assets/jogo/${imagemDaCasa(estado, i)}.svg" width="84" alt="">`
      const jogavel = !acabou && estado.tabuleiro[i] === '.'
      casas.push(`<td>${jogavel ? `<a href="${linkJogada(i)}">${img}</a>` : img}</td>`)
    }
    linhas.push(`    <tr>${casas.join('')}</tr>`)
  }

  let recado = txt.suaVez
  if (estado.resultado === 'visitante') recado = txt.venceu(estado.ultimo?.usuario)
  if (estado.resultado === 'casa') recado = txt.perdeu(estado.ultimo?.usuario)
  if (estado.resultado === 'empate') recado = txt.empate

  const rodape = [
    `<sub>${txt.placar(estado.placar)}</sub>`,
    estado.ultimo?.usuario && !acabou ? `<sub>${txt.ultimo(estado.ultimo.usuario)}</sub>` : null,
  ].filter(Boolean).join(' · ')

  return [
    '<!-- JOGO:INICIO -->',
    '<div align="center">',
    '  <table>',
    ...linhas,
    '  </table>',
    '',
    `  <b>${recado}</b>`,
    '',
    acabou ? `  <a href="${linkNova()}"><b>${txt.nova}</b></a>` : '',
    '',
    `  ${rodape}`,
    '</div>',
    '<!-- JOGO:FIM -->',
  ].filter((l) => l !== null).join('\n')
}

export function aplicarNoArquivo(caminho, bloco) {
  const texto = readFileSync(caminho, 'utf8')
  const inicio = texto.indexOf('<!-- JOGO:INICIO -->')
  const fim = texto.indexOf('<!-- JOGO:FIM -->')
  if (inicio === -1 || fim === -1) {
    throw new Error(`Marcadores do jogo não encontrados em ${caminho}.`)
  }
  const novo = texto.slice(0, inicio) + bloco + texto.slice(fim + '<!-- JOGO:FIM -->'.length)
  writeFileSync(caminho, novo)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const estado = lerEstado()
  aplicarNoArquivo('README.md', blocoDoJogo(estado, 'pt'))
  if (existsSync('README.en.md')) aplicarNoArquivo('README.en.md', blocoDoJogo(estado, 'en'))
  console.log('Tabuleiro atualizado.')
}
