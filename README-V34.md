# Tactical Group Airsoft V34

## Patentes e Elos

Nova aba horizontal **Patentes e Elos** no painel do Comandante.

### Progressão
- Elo 3 · Bronze → Elo 2 · Prata → Elo 1 · Ouro.
- Presença confirmada no jogo avança o operador um nível de Elo.
- Ao alcançar Elo 1 e confirmar nova presença, sobe uma patente e volta ao Elo 3.
- O campo **Elo por participação** do jogo permite avançar 1, 2 ou 3 níveis de uma vez.
- A página do Operador mostra `Você está na patente ...` e o Elo atual.

### Disciplina
O comando pode:
- marcar presença/falta na página de Jogos;
- aplicar penalidade por falta;
- registrar **Highlander** (não se entregar após ser eliminado) e conduta indevida;
- definir a intensidade da perda de Elo e dias de suspensão para Highlander/conduta;
- ajustar manualmente o Elo de qualquer operador;
- ver o histórico de mudanças de Elo.

Para manter a lógica de progressão consistente, perder Elo significa retroceder de Elo 1 → 2 → 3. O nível 3 é o piso e não pode cair abaixo dele.

## Banco
A API cria automaticamente:
- `operators.elo_level`
- `elo_settings`
- `elo_history`

Também foi incluída `db/migration-v34-patentes-elos.sql` para registro da evolução do schema.

## Commit sugerido
`Adiciona Patentes e Elos e disciplina por participação`
