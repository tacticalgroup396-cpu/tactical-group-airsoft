# Tactical Group Airsoft — Neon + Vertex AI + GitHub + Vercel

Este projeto transforma o protótipo enviado em uma aplicação web responsiva instalável como **PWA** no celular.

## Arquitetura

- **Frontend:** React 19 + Vite + Tailwind CSS.
- **Banco:** Neon PostgreSQL.
- **Backend:** Vercel Functions em `/api`.
- **IA:** Google Vertex AI / Gemini.
- **Código:** GitHub.
- **Deploy:** Vercel.
- **Celular:** PWA, com `manifest.webmanifest`.

O Neon possui integração nativa com Vercel e pode criar branches isoladas para previews, o que é ideal para trabalhar com GitHub sem misturar dados de desenvolvimento e produção.

## 1. Criar o banco Neon

No Neon, crie um projeto PostgreSQL e execute `src/db/schema.sql` no SQL Editor.

Depois copie a connection string e configure:

```env
DATABASE_URL=postgresql://...
```

No Vercel, a integração Neon também pode injetar as variáveis de banco automaticamente. Para previews, a integração suporta branches separados.

## 2. Configurar Vertex AI

No Google Cloud:

1. Crie/selecione um projeto.
2. Ative a Vertex AI API.
3. Crie uma conta de serviço com permissão para usar Vertex AI.
4. Para desenvolvimento local, use Application Default Credentials.
5. Na Vercel, configure as variáveis:

```env
GOOGLE_CLOUD_PROJECT=seu-projeto
GOOGLE_CLOUD_LOCATION=global
VERTEX_MODEL=gemini-2.5-flash
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", ...}
```

O backend grava somente o prompt/resposta no banco para auditoria; a chave/credencial nunca é enviada ao navegador.

## 3. GitHub

Crie um repositório, por exemplo `tactical-group-airsoft`, e envie todos os arquivos deste projeto.

Não envie `.env` nem credenciais do Google.

## 4. Vercel

Importe o repositório do GitHub na Vercel.

Build:

```bash
npm run build
```

Framework: Vite.

Adicione as variáveis de ambiente da seção Neon e Vertex nos ambientes **Preview** e **Production**.

## 5. Teste local

```bash
npm install
npm run dev
```

Para testar as funções `/api` localmente como Vercel Functions, use a Vercel CLI:

```bash
npx vercel dev
```

## Banco incluído

O schema cria:

- `operators` — usuários, patentes, funções e participação.
- `games` — operações/jogos.
- `game_participants` — presença e função em cada jogo.
- `rules` — regulamento editável.
- `ai_logs` — auditoria das consultas do assistente Vertex AI.

## Importante sobre autenticação

O protótipo usa login persistido no navegador para o MVP. As senhas são armazenadas no banco somente como hash bcrypt.

Para produção com equipe real, recomendo evoluir o login para sessões HTTP-only/JWT e autorização por função no backend antes de liberar ações administrativas.

## Aplicativo para celular

A interface é responsiva e pode ser instalada pelo navegador como PWA. Em Android/Chrome, abra o site e use "Instalar aplicativo". No iPhone, use "Adicionar à Tela de Início".

Para publicar posteriormente como aplicativo nativo Android/iOS, o mesmo frontend pode ser empacotado com Capacitor.

## Endpoints

- `GET/POST /api/operators`
- `POST /api/login`
- `GET/POST /api/games`
- `GET /api/rules`
- `POST /api/ai`



## Segurança
O primeiro operador cadastrado recebe automaticamente a função `commander`; os demais recebem `operator`. O login cria sessão HttpOnly por 7 dias e a criação de jogos exige sessão de comandante.
