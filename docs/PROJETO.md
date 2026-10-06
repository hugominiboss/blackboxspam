# Documentação do Projeto BlackboxSpam

## Resumo Técnico e Estratégico

### 1. Visão Geral
O BlackBoxSpam é uma plataforma SaaS focada em educação, mentoria e ferramentas de automação. O objetivo é centralizar a entrega de conteúdo (Academia) e o acesso a ferramentas exclusivas através de um sistema de permissões e créditos.

### 2. Estrutura de Acesso e Usuários
**Autenticação:** Gerenciada via Supabase Auth.
**Perfis:** O sistema deve diferenciar usuários comuns de alunos e mentorados.
**Permissões (RBAC):** O acesso às pastas `app/academia` e `app/ferramentas` deve ser validado pelo status do usuário no banco de dados.

### 3. Economia de Créditos (Credit-based Access)
**Lógica:** O acesso a ferramentas específicas ou módulos avançados da academia não será apenas por assinatura, mas por consumo de créditos.
**Fluxo:** O usuário possui um saldo de créditos no perfil. Ao tentar acessar uma ferramenta, o sistema verifica se há saldo suficiente, debita o valor e libera o acesso.
**Persistência:** Os créditos devem ser gerenciados em uma tabela no Supabase (`user_credits`), com atualizações em tempo real.

### 4. Módulos Principais
**Academia (`app/academia`):** Área de aulas e treinamentos. Deve ter controle de progresso e liberação de módulos conforme a categoria do aluno.
**Ferramentas (`app/ferramentas`):** Hub de softwares e scripts. Acesso condicionado ao sistema de créditos.
**Perfil (`app/perfil`):** Gestão de conta, visualização de saldo de créditos e histórico de consumo.

### 5. Stack Tecnológica e Regras de Código
**Frontend:** Next.js 15 (App Router, TypeScript, Tailwind CSS).
**Backend/DB:** Supabase (Auth, Database, RLS).
**Padronização:** Usar imports absolutos (`@/app/` (see below for folder content)...) e manter a lógica de servidor (Server Components) sempre que possível para maior performance e segurança.

**Instrução para o Agente:** Use este documento como a "Fonte da Verdade" para todas as decisões de arquitetura, criação de novas rotas e implementação de lógica de banco de dados. Sempre consulte este arquivo antes de sugerir mudanças estruturais.
