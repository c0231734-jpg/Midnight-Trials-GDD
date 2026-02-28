// api/save-html.js — Vercel Serverless Function
//
// Variáveis de ambiente necessárias (configurar no Vercel):
//   GITHUB_TOKEN   — Personal Access Token (scope: repo)
//   GITHUB_OWNER   — seu usuário GitHub
//   GITHUB_REPO    — nome do repositório do GDD
//   GDD_PASSWORD   — senha de validação
//   ALLOWED_ORIGIN — URL do seu GitHub Pages (ex: https://usuario.github.io)

module.exports = async function handler(req, res) {

  // CORS — obrigatório porque GitHub Pages e Vercel ficam em domínios diferentes
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-GDD-PASSWORD');

  // Preflight (o browser envia OPTIONS antes do POST real)
  if (req.method === 'OPTIONS') return res.status(204).end();

  const reply = (status, body) => res.status(status).json(body);

  // 1. Só aceita POST
  if (req.method !== 'POST') {
    return reply(405, { success: false, error: 'Method Not Allowed' });
  }

  // 2. Valida senha
  const clientPw = (req.headers['x-gdd-password'] || '').trim();
  const serverPw = (process.env.GDD_PASSWORD || '').trim();
  if (!serverPw) return reply(500, { success: false, error: 'GDD_PASSWORD não configurada no servidor' });
  if (clientPw !== serverPw) return reply(403, { success: false, error: 'Forbidden' });

  // 3. Lê o payload
  const { path: filePath = 'index.html', main_html, message = 'GDD edit via admin UI' } = req.body || {};
  if (typeof main_html !== 'string' || !main_html.trim()) {
    return reply(400, { success: false, error: 'Campo main_html ausente ou vazio' });
  }

  // 4. Variáveis do GitHub
  const OWNER = process.env.GITHUB_OWNER;
  const REPO  = process.env.GITHUB_REPO;
  const TOKEN = process.env.GITHUB_TOKEN;
  if (!OWNER || !REPO || !TOKEN) {
    return reply(500, { success: false, error: 'Variáveis GITHUB_OWNER, GITHUB_REPO ou GITHUB_TOKEN ausentes' });
  }

  const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const GH = {
    'Authorization': `token ${TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'GDD-AdminPanel/1.0',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // 5. Busca SHA e conteúdo atual
  let sha, currentContent;
  try {
    const getRes = await fetch(API_URL, { headers: GH });
    if (getRes.status === 404) return reply(404, { success: false, error: `Arquivo '${filePath}' não encontrado` });
    if (getRes.status === 401) return reply(502, { success: false, error: 'GITHUB_TOKEN inválido ou expirado' });
    if (getRes.status === 403) {
      const b = await getRes.json().catch(() => ({}));
      const isRL = (b.message || '').toLowerCase().includes('rate limit');
      return reply(502, { success: false, error: isRL ? 'GitHub rate limit — tente em alguns minutos' : 'Token sem permissão (403)' });
    }
    if (!getRes.ok) {
      const t = await getRes.text();
      return reply(502, { success: false, error: `GitHub GET ${getRes.status}: ${t.slice(0, 200)}` });
    }
    const data = await getRes.json();
    if (!data.sha) return reply(502, { success: false, error: 'GitHub não retornou SHA' });
    sha = data.sha;
    currentContent = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  } catch (err) {
    return reply(502, { success: false, error: 'Erro de rede (GET): ' + err.message });
  }

  // 6. Substitui innerHTML de <main> preservando atributos da tag
  const mainRegex = /(<main(?:\s[^>]*)?>)([\s\S]*?)(<\/main>)/i;
  if (!mainRegex.test(currentContent)) {
    return reply(422, { success: false, error: 'Tag <main> não encontrada no arquivo' });
  }
  const newContent = currentContent.replace(mainRegex, `$1${main_html}$3`);

  // 7. Faz o commit no GitHub
  const encoded = Buffer.from(newContent, 'utf8').toString('base64');
  try {
    const putRes = await fetch(API_URL, {
      method: 'PUT',
      headers: { ...GH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: encoded, sha })
    });
    if (putRes.status === 409) return reply(409, { success: false, error: 'Conflito de SHA — recarregue e tente novamente' });
    if (putRes.status === 422) {
      const d = await putRes.json().catch(() => ({}));
      return reply(422, { success: false, error: 'GitHub rejeitou o commit: ' + (d.message || '') });
    }
    if (!putRes.ok) {
      const t = await putRes.text();
      return reply(502, { success: false, error: `GitHub PUT ${putRes.status}: ${t.slice(0, 200)}` });
    }
    const putData = await putRes.json();
    return reply(200, { success: true, commit: putData.commit?.sha || 'ok' });
  } catch (err) {
    return reply(502, { success: false, error: 'Erro de rede (PUT): ' + err.message });
  }
};
