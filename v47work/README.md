# Tactical Group Airsoft V16

Base limpa consolidada para substituir V14/V15 sem misturar arquivos.

## Incluído
- Área do Comandante preservada e separada por páginas: Equipe, Jogos, Histórico, Financeiro, Visitas e Configurações.
- Comandante principal protegido; pode promover/remover outros comandantes.
- Convite por apelido; excluir convite remove também o cadastro pendente.
- Operador com primeiro acesso por código, depois login por e-mail ou apelido.
- Operador pode marcar Vou ou Não vou e alterar a resposta depois até o prazo.
- Jogo com mínimo/máximo de operadores, data/hora e prazo de confirmação.
- Cancelamento automático quando o prazo vence e o mínimo não foi atingido.
- Campos cadastrados com Google Maps e seleção no jogo.
- Visitante vê o próximo jogo ativo e pode solicitar visita vinculada ao jogo.
- Progressão automática de patente por participações mensais.
- Notificações internas e Web Push.
- PWA instalável para Operador e Comandante; visitante não recebe botão de instalação.
- Arquivos estáticos servidos a partir de /public e rewrites para rotas internas.
- Service Worker sem cache de /api e com cache atualizado para V16.

## Web Push na Vercel
Configure no Environment Variables de Production e Preview, conforme necessário:
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT (ex.: mailto:admin@seu-dominio.com)

Depois do deploy, o operador entra em sua conta e clica em **Ativar notificações**. O navegador precisa permitir notificações.

## Deploy
1. Extraia por cima do repositório atual sem apagar .git.
2. Faça commit: `Consolida V16 com comandante, jogos, notificacoes e prazos`.
3. Push para `main`.
4. Aguarde o Production Deployment ficar Ready.
5. Acesse o domínio de produção: `https://tactical-group-airsoft.vercel.app`.

## V17 — Vercel Hobby sem Cron periódico

- Removido o Cron de 5 minutos, incompatível com o plano Hobby.
- O cancelamento por prazo e mínimo de operadores é reconciliado no início de cada requisição da API.
- O endpoint de cron foi removido para evitar falha de build/deploy.

**Importante:** sem um agendador externo, o cancelamento acontece na primeira interação com o aplicativo após o prazo; não há execução em segundo plano a cada poucos minutos.
