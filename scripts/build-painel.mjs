#!/usr/bin/env node
// Gera assets/painel.svg com números reais da API do GitHub.
// Roda diariamente pela Action em .github/workflows/painel.yml.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USUARIO = process.env.GH_USUARIO || "JuniorrBraga";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = resolve(RAIZ, "assets/painel.svg");

const COR = {
  fundo: "#0A0E1A",
  fio: "#243350",
  sinal: "#FFB020",
  dado: "#4DD8C0",
  tinta: "#E8EDF7",
  mudo: "#6E7E99",
};

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

async function consultar(query, variables) {
  if (!TOKEN) throw new Error("Faltou GH_TOKEN/GITHUB_TOKEN no ambiente.");
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "painel-producao",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`GitHub respondeu ${r.status}: ${await r.text()}`);
  const json = await r.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

async function coletar() {
  const agora = new Date();
  const de = new Date(Date.UTC(agora.getUTCFullYear() - 1, agora.getUTCMonth(), agora.getUTCDate()));

  const dados = await consultar(
    `query($usuario:String!, $de:DateTime!, $ate:DateTime!, $cursor:String) {
      user(login:$usuario) {
        contributionsCollection(from:$de, to:$ate) {
          totalCommitContributions
          totalPullRequestContributions
          contributionCalendar { totalContributions }
        }
        repositories(first:100, ownerAffiliations:OWNER, after:$cursor) {
          totalCount
          pageInfo { hasNextPage endCursor }
          nodes { createdAt }
        }
      }
    }`,
    { usuario: USUARIO, de: de.toISOString(), ate: agora.toISOString(), cursor: null }
  );

  const u = dados.user;
  const criados = u.repositories.nodes.map((n) => n.createdAt);

  // Pagina o resto dos repositórios, se houver.
  let pagina = u.repositories.pageInfo;
  while (pagina.hasNextPage) {
    const extra = await consultar(
      `query($usuario:String!, $cursor:String) {
        user(login:$usuario) {
          repositories(first:100, ownerAffiliations:OWNER, after:$cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { createdAt }
          }
        }
      }`,
      { usuario: USUARIO, cursor: pagina.endCursor }
    );
    const r = extra.user.repositories;
    criados.push(...r.nodes.map((n) => n.createdAt));
    pagina = r.pageInfo;
  }

  // Doze meses fechados, do mais antigo ao atual.
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 1));
    meses.push({
      chave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      rotulo: MES_CURTO[d.getUTCMonth()],
      ano: d.getUTCFullYear(),
      total: 0,
    });
  }
  const porChave = new Map(meses.map((m) => [m.chave, m]));
  for (const iso of criados) {
    const alvo = porChave.get(iso.slice(0, 7));
    if (alvo) alvo.total++;
  }

  const c = u.contributionsCollection;
  return {
    meses,
    repos: u.repositories.totalCount,
    noAno: criados.filter((iso) => Number(iso.slice(0, 4)) === agora.getUTCFullYear()).length,
    contribuicoes: c.contributionCalendar.totalContributions,
    prs: c.totalPullRequestContributions,
    anoAtual: agora.getUTCFullYear(),
    atualizado: `${String(agora.getUTCDate()).padStart(2, "0")} ${MES_CURTO[agora.getUTCMonth()]} ${agora.getUTCFullYear()}`,
  };
}

function desenhar(d) {
  const X0 = 130;
  const LARGURA = 960;
  const BASE = 404;
  const ALTURA_MAX = 104;

  const pico = Math.max(1, ...d.meses.map((m) => m.total));
  const vao = 26;
  const larguraBarra = (LARGURA - vao * (d.meses.length - 1)) / d.meses.length;

  const barras = d.meses
    .map((m, i) => {
      const x = X0 + i * (larguraBarra + vao);
      const alt = m.total === 0 ? 3 : Math.max(8, Math.round((m.total / pico) * ALTURA_MAX));
      const y = BASE - alt;
      const atual = i === d.meses.length - 1;
      const preenche = m.total === 0 ? COR.fio : atual ? "url(#barraAtual)" : "url(#barra)";
      const valor =
        m.total === 0
          ? ""
          : `<text class="mono valor" x="${x + larguraBarra / 2}" y="${y - 11}" text-anchor="middle" fill="${
              atual ? COR.sinal : COR.mudo
            }">${m.total}</text>`;
      return `    <rect x="${x}" y="${y}" width="${larguraBarra.toFixed(1)}" height="${alt}" rx="3" fill="${preenche}"/>
    <rect class="brilho" style="animation-delay:${(i * 0.16).toFixed(2)}s" x="${x}" y="${y}" width="${larguraBarra.toFixed(
        1
      )}" height="${alt}" rx="3" fill="url(#pulso)"/>
${valor}
    <text class="mono mes" x="${x + larguraBarra / 2}" y="${BASE + 26}" text-anchor="middle" fill="${
        atual ? COR.tinta : COR.mudo
      }">${m.rotulo}</text>`;
    })
    .join("\n");

  const metricas = [
    { n: d.noAno, r: `PROJETOS EM ${d.anoAtual}`, destaque: true },
    { n: d.repos, r: "REPOSITÓRIOS" },
    { n: d.contribuicoes, r: "CONTRIBUIÇÕES · 12M" },
    { n: d.prs, r: "PULL REQUESTS · 12M" },
  ]
    .map((m, i) => {
      const x = X0 + i * 240;
      return `  <text class="sans numero" x="${x}" y="${152}" fill="${m.destaque ? COR.sinal : COR.tinta}">${m.n}</text>
  <text class="mono rotulo" x="${x + 2}" y="${180}">${m.r}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 460" width="1200" height="460" role="img" aria-label="Painel de produção: ${d.noAno} projetos iniciados em ${d.anoAtual}, ${d.repos} repositórios, ${d.contribuicoes} contribuições em 12 meses.">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="${COR.fio}"/>
    </pattern>
    <radialGradient id="vinheta" cx="40%" cy="45%" r="82%">
      <stop offset="0%" stop-color="${COR.fundo}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${COR.fundo}" stop-opacity="0.7"/>
    </radialGradient>
    <linearGradient id="barra" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3C5480"/>
      <stop offset="100%" stop-color="#243350"/>
    </linearGradient>
    <linearGradient id="barraAtual" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COR.sinal}"/>
      <stop offset="100%" stop-color="#B87610"/>
    </linearGradient>
    <linearGradient id="pulso" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COR.sinal}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${COR.sinal}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="regua" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COR.sinal}"/>
      <stop offset="6%" stop-color="${COR.sinal}"/>
      <stop offset="14%" stop-color="${COR.fio}"/>
      <stop offset="88%" stop-color="${COR.fio}"/>
      <stop offset="100%" stop-color="${COR.fio}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <style>
    .mono { font-family: "SF Mono", SFMono-Regular, ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace; }
    .sans { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
    .numero { font-size: 54px; font-weight: 800; letter-spacing: -1.6px; }
    .rotulo { fill: ${COR.mudo}; font-size: 11px; letter-spacing: 2.2px; }
    .titulo { fill: ${COR.mudo}; font-size: 11px; letter-spacing: 2.4px; }
    .mes    { font-size: 11px; letter-spacing: 1.6px; }
    .valor  { font-size: 12px; letter-spacing: 0.5px; }

    /* Um pulso âmbar varre as barras da esquerda para a direita, no mesmo sentido da
       esteira do header. A animação só acende um overlay sobre a barra: se o
       renderizador congelar no primeiro quadro, o gráfico aparece inteiro em vez de sumir. */
    .brilho { opacity: 0; animation: varre 5s linear infinite; }
    @keyframes varre {
      0%        { opacity: 0; }
      4%        { opacity: 0.5; }
      13%, 100% { opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) { .brilho { animation: none; } }
  </style>

  <rect x="1" y="1" width="1198" height="458" rx="22" fill="${COR.fundo}"/>
  <rect x="1" y="1" width="1198" height="458" rx="22" fill="url(#grid)"/>
  <rect x="1" y="1" width="1198" height="458" rx="22" fill="url(#vinheta)"/>
  <rect x="1.5" y="1.5" width="1197" height="457" rx="21.5" fill="none" stroke="${COR.fio}" stroke-width="1"/>

  <rect x="130" y="53" width="9" height="9" fill="${COR.sinal}"/>
  <text class="mono rotulo" x="152" y="62">PAINEL DE PRODUÇÃO</text>
  <text class="mono rotulo" x="1090" y="62" text-anchor="end">ATUALIZADO ${d.atualizado}</text>

${metricas}

  <rect x="130" y="212" width="960" height="2" fill="url(#regua)"/>

  <text class="mono titulo" x="130" y="256">PROJETOS INICIADOS POR MÊS · ÚLTIMOS 12 MESES</text>
  <line x1="130" y1="${BASE + 1}" x2="1090" y2="${BASE + 1}" stroke="${COR.fio}" stroke-width="1"/>

${barras}
</svg>
`;
}

const dados = await coletar();
mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, desenhar(dados));
console.log(
  `painel.svg gerado · ${dados.noAno} projetos em ${dados.anoAtual} · ${dados.repos} repos · ${dados.contribuicoes} contribuições`
);
