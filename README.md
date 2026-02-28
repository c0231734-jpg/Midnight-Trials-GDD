# midnight-admin

Função serverless para o painel admin do **Midnight Trials GDD**.  
Recebe edições do painel admin e faz commit diretamente no repositório do GDD via GitHub API.

---

## Como fazer o deploy no Vercel

### 1. Suba este repositório no GitHub
- Crie um novo repositório (pode ser **privado**)
- Faça upload de todos os arquivos desta pasta

### 2. Conecte no Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **"Add New Project"**
3. Selecione este repositório na lista
4. Clique em **"Deploy"** — não precisa mudar nada

### 3. Configure as variáveis de ambiente
No painel do projeto no Vercel:  
**Settings → Environment Variables → Add**

| Variável | Valor |
|---|---|
| `GITHUB_TOKEN` | Seu Personal Access Token ([criar aqui](https://github.com/settings/tokens)) com scope **repo** |
| `GITHUB_OWNER` | Seu usuário GitHub (ex: `c0231734-jpg`) |
| `GITHUB_REPO` | Nome do repo do GDD (ex: `Midnight-Trials-GDD`) |
| `GDD_PASSWORD` | `MidnightDevSecretCode10002` |
| `ALLOWED_ORIGIN` | URL do seu GitHub Pages (ex: `https://c0231734-jpg.github.io`) |

Após adicionar as variáveis, clique em **Redeploy**.

### 4. Copie a URL do endpoint
Após o deploy, sua URL será algo como:
```
https://midnight-admin-abc123.vercel.app/api/save-html
```
Copie essa URL e cole no `index.html` do GDD na linha marcada com `TODO`.

---

## Estrutura do projeto

```
/
├── api/
│   └── save-html.js   ← função serverless
├── vercel.json        ← configuração do Vercel
└── README.md
```
