# Tactical Group Airsoft V14

Inclui:
- notificações internas quando um jogo é criado;
- infraestrutura de Web Push para celular;
- promoção de operador para comandante pelo comandante principal;
- comandante principal protegido contra remoção/rebaixamento;
- exclusão real de convites pendentes, removendo o cadastro da lista;
- pedido de visita diretamente no próximo jogo da página inicial;
- pedido de visita informa ao comandante qual jogo o visitante deseja;
- progressão automática de patente por participação mensal, no máximo 1 promoção por mês;
- contagem de jogos presentes atualizada ao registrar presença;
- mantém V13: páginas separadas, campos/Maps, financeiro, perfil do operador, fotos, PWA e correções de assets.

## Notificação de celular

O sistema já tem a infraestrutura. Para notificação em segundo plano no celular, configure no Vercel as variáveis:
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT

Gere o par com:
`npx web-push generate-vapid-keys`

A chave privada deve ficar somente nas Environment Variables da Vercel.
