-- Deduplicação das notificações de vencimento (cron financeiro).
--
-- PROBLEMA
--
-- notificationService.notifyIfNew() faz check-then-insert:
--
--     const already = await repo.existsForEntity({...})   ← janela de corrida
--     if (already) return null
--     await repo.create({...})
--
-- Funciona hoje só porque existe UMA instância do Render rodando o cron. No dia
-- em que o serviço escalar para 2 instâncias, AS DUAS rodam o cron às 06:00 e
-- cada despesa vencida gera notificação duplicada para cada admin. É uma
-- bomba-relógio: o bug não existe hoje e aparece exatamente quando escalar.
--
-- POR QUE O ÍNDICE É PARCIAL (isto é o ponto importante)
--
-- Um UNIQUE genérico em (company_id, user_id, type, link) QUEBRARIA o sistema:
-- notify() cria uma notificação POR EVENTO e, no chat, todas as mensagens de
-- uma sala compartilham o mesmo link (/app/chat/:roomId). Com um UNIQUE amplo,
-- a segunda mensagem de qualquer conversa falharia. O mesmo vale para
-- post_comment (mesmo link do post) e task_assigned.
--
-- A deduplicação só é desejada no caso do cron de vencidos, que reprocessa o
-- MESMO item todo dia enquanto ele continuar em aberto. Por isso o índice é
-- restrito a type = 'financial_due'.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_financial_due_uniq
  ON notifications (company_id, user_id, type, link)
  WHERE type = 'financial_due';
