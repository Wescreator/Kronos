# 🚀 KRONOS — SISTEMA DE GESTÃO EMPRESARIAL

> Plataforma moderna para gestão de projetos, tarefas, comunicação interna e controle financeiro, desenvolvida para escritórios de arquitetura, engenharia e equipes de projetos.

---

# 📋 SOBRE O PROJETO

O **Kronos** é um sistema SaaS corporativo desenvolvido para centralizar a operação de escritórios de arquitetura, engenharia e equipes de projetos em uma única plataforma.

O sistema resolve problemas comuns dessas equipes:

* Dificuldade em acompanhar o andamento de múltiplos projetos simultaneamente
* Falta de visibilidade sobre o controle financeiro por projeto
* Comunicação fragmentada entre membros da equipe
* Ausência de controle estruturado de tarefas com prioridades e prazos
* Dificuldade em gerar uma visão executiva consolidada do negócio

O Kronos oferece uma interface moderna com tema escuro e identidade visual premium, projetada para uso profissional no dia a dia.

---

# 🛠️ TECNOLOGIAS UTILIZADAS

## FRONTEND

| Tecnologia        | Descrição                             |
| ----------------- | ------------------------------------- |
| React.js          | Biblioteca principal de interface     |
| Vite              | Bundler e servidor de desenvolvimento |
| JavaScript ES6+   | Linguagem principal                   |
| React Router      | Navegação entre módulos               |
| Axios             | Comunicação com a API                 |
| Zustand           | Gerenciamento de estado global        |
| Recharts          | Gráficos e visualizações financeiras  |
| TailwindCSS       | Estilização utilitária                |
| Plus Jakarta Sans | Tipografia do sistema                 |

## BACKEND

| Tecnologia     | Descrição                      |
| -------------- | ------------------------------ |
| Node.js        | Ambiente de execução           |
| Express.js     | Framework de API REST          |
| JWT            | Autenticação e autorização     |
| bcryptjs       | Criptografia de senhas         |
| WebSocket (ws) | Comunicação em tempo real      |
| Nodemailer     | Envio de e-mails transacionais |
| Multer         | Upload de arquivos             |
| Joi            | Validação de dados de entrada  |

## BANCO DE DADOS E INFRAESTRUTURA

| Tecnologia | Descrição                    |
| ---------- | ---------------------------- |
| PostgreSQL | Banco de dados relacional    |
| Supabase   | Hospedagem do banco de dados |
| Vercel     | Hospedagem do frontend       |
| Render     | Hospedagem do backend        |
| GitHub     | Versionamento do código      |

---

# ✨ FUNCIONALIDADES DO SISTEMA

## 📊 DASHBOARD EXECUTIVO

* Visão consolidada de métricas do negócio
* Resumo financeiro do mês
* Fluxo de caixa anual em gráfico
* Lista de projetos ativos e tarefas abertas

## 📁 GESTÃO DE PROJETOS

* Criação e edição de projetos com capa, orçamento e datas
* Etapas padrão por projeto:

  * Estudo Preliminar
  * Projeto Básico
  * Ante Projeto
  * Projeto Executivo
  * Entrega Final
* Fases dentro de cada etapa com checklist e comentários
* Histórico de mudanças de status
* Gerenciamento de membros por projeto
* Anexo de arquivos por projeto

## ✅ GESTÃO DE TAREFAS

* Criação de tarefas com prioridade, prazo e responsáveis
* Filtros por status e prioridade
* Comentários por tarefa
* Indicador de dias em aberto

## 💬 CHAT INTERNO

* Conversas privadas entre membros
* Grupos de discussão
* Comunicação em tempo real via WebSocket
* Seletor de emojis integrado
* Indicador de digitação
* Histórico de mensagens persistido

## 💰 CONTROLE FINANCEIRO

* Dashboard financeiro com KPIs e gráficos
* Contas a pagar com filtro mensal e por categoria
* Contas a receber com parcelamento independente por parcela
* DRE — Demonstrativo de Resultado do Exercício
* Análise financeira por projeto
* Despesas recorrentes
* Paginação e filtros combinados

## 👥 EQUIPE E USUÁRIOS

* Gerenciamento de membros com perfis:

  * Administrador
  * Arquiteto
  * Estagiário
* Sistema de permissões granular por módulo e ação
* Upload de foto de perfil
* Ativação e desativação de membros

## 🔐 AUTENTICAÇÃO E SEGURANÇA

* Login com JWT (Access Token + Refresh Token)
* Recuperação de senha por e-mail
* Persistência de sessão com "Lembre-me"
* Senhas criptografadas com bcrypt
* Controle de acesso por perfil de usuário

---

# ⚙️ CONFIGURAÇÃO DO PROJETO

## PRÉ-REQUISITOS

* Node.js v18 ou superior
* npm v9 ou superior
* Conta Supabase com projeto PostgreSQL criado

## INSTALAÇÃO

```bash
npm install
```

## EXECUTAR O FRONTEND

```bash
npm run dev
```

## GERAR BUILD DE PRODUÇÃO

```bash
npm run build
```

---

# 🌐 ESTRUTURA DE DEPLOY

| Serviço        | Plataforma |
| -------------- | ---------- |
| Frontend       | Vercel     |
| Backend        | Render     |
| Banco de Dados | Supabase   |
| Versionamento  | GitHub     |

---

# 🔒 SEGURANÇA

* Autenticação baseada em JWT
* Refresh Tokens para renovação de sessão
* Criptografia de senhas com bcrypt
* Recuperação de senha por e-mail
* Controle de permissões por perfil
* Proteção de rotas autenticadas

---

# 💻 IDE RECOMENDADA

* Visual Studio Code (VS Code)

---

# 📄 LICENÇA

Este projeto é de propriedade de seus respectivos desenvolvedores e não pode ser distribuído, reproduzido ou comercializado sem autorização prévia.

---

# 👨‍💻 KRONOS

Sistema desenvolvido para centralizar a gestão operacional de escritórios de arquitetura, engenharia e equipes de projetos, oferecendo produtividade, organização e comunicação em uma única plataforma.
