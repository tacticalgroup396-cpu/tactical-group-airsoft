# Migração de mídia para Vercel Blob

Destino da nova arquitetura:
- Neon: dados estruturados (operadores, jogos, presença, patentes, financeiro, missões, ranking).
- Vercel Blob: fotos de perfil, equipamentos, galeria, partidas e missões.

Regras de migração:
1. Não apagar mídia legada antes de confirmar upload e URL no Blob.
2. Preservar IDs e referências do banco antigo.
3. Migrar dados estruturados antes da troca da DATABASE_URL.
4. Trocar uploads novos para Blob antes do corte definitivo.
5. Após validação, remover Base64 legado em uma etapa separada.
