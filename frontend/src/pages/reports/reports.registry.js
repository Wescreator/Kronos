import { Clock, DollarSign, FileText } from 'lucide-react'
import HoursReport from './HoursReport'
import ProjectReport from './ProjectReport'
import FinancialReport from './FinancialReport'

/*
 * Registry dos tipos de relatório do módulo de Relatórios.
 *
 * Para adicionar um novo tipo de relatório no futuro:
 *   1. crie o componente do relatório em pages/reports/<Novo>Report.jsx;
 *   2. adicione uma entrada aqui com { key, label, description, icon, Component }.
 * A ReportsPage renderiza as abas e o relatório ativo automaticamente a
 * partir desta lista — não precisa mexer na página.
 */
export const REPORT_TYPES = [
  {
    key:         'hours',
    label:       'Relatórios de Horas',
    description: 'Horas apontadas por dia, semana, mês, projeto, tarefa ou membro',
    icon:        Clock,
    Component:   HoursReport,
  },
  {
    key:         'project',
    label:       'Relatório de Projeto',
    description: 'Documento imprimível com etapas, fases, observações e assinaturas',
    icon:        FileText,
    Component:   ProjectReport,
  },
  {
    key:         'financial',
    label:       'Relatório Financeiro',
    description: 'Recebimentos e pagamentos do período, fluxo de caixa e resultado por projeto',
    icon:        DollarSign,
    Component:   FinancialReport,
  },
]
