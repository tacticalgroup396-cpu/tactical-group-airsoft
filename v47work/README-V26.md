# Tactical Group Airsoft V26

Correção do fluxo de perfil público quando acessado pela área do Comandante.

- O botão “Ver perfil” na equipe do Comandante informa a origem `from=commander`.
- O perfil público mostra o botão amarelo “← Voltar ao Comandante”.
- O retorno leva para `/comandante/equipe`.
- Mantém o botão público “Voltar para operadores”.
- app.js e public/app.js permanecem sincronizados.
