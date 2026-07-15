-- Cabeçalho editável do documento do Relatório de Projeto.
-- Por padrão (NULL) o frontend imprime "Relatório de Projeto"; o ADM pode
-- trocar livremente (ex.: "Termo de Entrega") e o texto fica salvo por
-- relatório/projeto.
--
-- Aplicar no Supabase (SQL editor):
ALTER TABLE project_reports
  ADD COLUMN IF NOT EXISTS doc_title VARCHAR(120);
