#!/usr/bin/env node
// Gera assets/painel.svg com números reais da API do GitHub.
// Roda diariamente pela Action em .github/workflows/painel.yml.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USUARIO = process.env.GH_USUARIO || "JuniorrBraga";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = resolve(RAIZ, "assets/painel.svg");

const COR = {
  fundo: "#060608", // vazio
  tinta: "#ECE8DC", // osso
  sinal: "#C8FF2E", // o único destaque
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

// Um token que não seja do próprio dono do perfil enxerga só os repositórios
// públicos — e o painel sairia subestimado sem nenhum sinal de erro. Melhor
// falhar alto do que publicar número menor do que a realidade.
async function conferirToken() {
  const { viewer } = await consultar("{ viewer { login } }", {});
  if (viewer.login.toLowerCase() !== USUARIO.toLowerCase()) {
    throw new Error(
      `O token autentica como "${viewer.login}", não como "${USUARIO}". ` +
        `Ele só veria os repositórios públicos e o painel sairia subestimado. ` +
        `Configure o secret PAINEL_TOKEN com um PAT do dono do perfil (escopos repo + read:user).`
    );
  }
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

// Fontes embutidas (o GitHub mostra o SVG como <img>: fonte externa não carrega).
const fonte = (arq) => readFileSync(resolve(RAIZ, "assets/fontes", arq)).toString("base64");

function desenhar(d) {
  // vazio preto, linhas cor de osso, UM verde-ácido (o mês atual e o sinal que varre as barras)
  const X0 = 64, LARGURA = 1072, BASE = 452, ALTURA_MAX = 130;
  const pico = Math.max(1, ...d.meses.map((m) => m.total));
  const vao = 22, lb = (LARGURA - vao * (d.meses.length - 1)) / d.meses.length;
  const barras = d.meses.map((m, i) => {
    const x = X0 + i * (lb + vao), alt = m.total === 0 ? 1 : Math.max(6, Math.round((m.total / pico) * ALTURA_MAX));
    const y = BASE - alt, atual = i === d.meses.length - 1;
    return `<rect x="${x.toFixed(1)}" y="${y}" width="${lb.toFixed(1)}" height="${alt}" fill="${atual ? COR.sinal : "none"}" stroke="${atual ? COR.sinal : COR.tinta}" stroke-opacity="${atual ? 1 : 0.5}"/>
<rect class="var" style="animation-delay:${(i * 0.18).toFixed(2)}s" x="${x.toFixed(1)}" y="${y}" width="${lb.toFixed(1)}" height="${alt}" fill="${COR.sinal}"/>
${m.total ? `<text class="j" x="${(x + lb / 2).toFixed(1)}" y="${y - 10}" text-anchor="middle" font-size="15" fill="${atual ? COR.sinal : COR.tinta}" fill-opacity="${atual ? 1 : 0.6}">${m.total}</text>` : ""}
<text class="j" x="${(x + lb / 2).toFixed(1)}" y="${BASE + 28}" text-anchor="middle" font-size="14" fill="${COR.tinta}" fill-opacity="${atual ? 0.9 : 0.4}">${m.rotulo}</text>`;
  }).join("\n");
  const met = [
    { n: d.contribuicoes, r: "contribuições · 12 meses" },
    { n: d.noAno, r: `projetos iniciados em ${d.anoAtual}` },
    { n: d.repos, r: "repositórios" },
    { n: d.prs, r: "pull requests · 12 meses" },
  ].map((m, i) => {
    const x = 64 + i * 276;
    return `<g class="st" style="animation-delay:${(0.1 + i * 0.12).toFixed(2)}s"><text class="s" x="${x}" y="190" font-size="104" fill="${COR.tinta}">${m.n}</text>
<text class="j" x="${x + 4}" y="224" font-size="15" fill="${COR.tinta}" fill-opacity=".5">${m.r}</text></g>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 520" width="1200" height="520" role="img" aria-label="Produção: ${d.contribuicoes} contribuições e ${d.prs} pull requests em 12 meses, ${d.noAno} projetos iniciados em ${d.anoAtual}, ${d.repos} repositórios.">
<style>
@font-face{font-family:S;src:url(data:font/woff2;base64,${fonte("InstrumentSerif-italic.woff2")}) format('woff2');font-style:italic}
@font-face{font-family:J;src:url(data:font/woff2;base64,${fonte("JetBrainsMono-300.woff2")}) format('woff2')}
.s{font-family:S,Georgia,serif;font-style:italic}.j{font-family:J,ui-monospace,monospace;font-weight:300}
.st{animation:st 1s cubic-bezier(.16,1,.3,1) backwards}@keyframes st{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
/* um sinal verde-ácido varre as barras da esquerda para a direita (se congelar, o gráfico aparece inteiro) */
.var{opacity:0;animation:var 4.2s steps(1) infinite}@keyframes var{0%{opacity:.85}4.6%,100%{opacity:0}}
.pisca{animation:pisca 1.2s steps(1) infinite}@keyframes pisca{50%{opacity:.15}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect width="1200" height="520" fill="${COR.fundo}"/>
${Array.from({ length: 21 }, (_, k) => `<line x1="${k * 60}" y1="0" x2="${k * 60}" y2="520" stroke="${COR.tinta}" stroke-opacity=".03"/>`).join("")}
<text class="j" x="64" y="64" font-size="16" fill="${COR.tinta}" fill-opacity=".5">// produção · lido da API do GitHub, redesenhado todo dia às 03:00</text>
<circle cx="1128" cy="59" r="4" fill="${COR.sinal}" class="pisca"/>
<text class="j" x="1112" y="64" text-anchor="end" font-size="16" fill="${COR.tinta}" fill-opacity=".5">${d.atualizado}</text>
${met}
<text class="j" x="64" y="296" font-size="14" fill="${COR.tinta}" fill-opacity=".4">projetos iniciados por mês · últimos 12 meses</text>
<line x1="${X0}" y1="${BASE}" x2="${X0 + LARGURA}" y2="${BASE}" stroke="${COR.tinta}" stroke-opacity=".5"/>
${barras}
</svg>
`;
}

await conferirToken();
const dados = await coletar();
mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, desenhar(dados));
console.log(
  `painel.svg gerado · ${dados.noAno} projetos em ${dados.anoAtual} · ${dados.repos} repos · ${dados.contribuicoes} contribuições`
);
