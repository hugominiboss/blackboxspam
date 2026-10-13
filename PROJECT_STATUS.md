# Status do Projeto: blackboxspam

> Relatório técnico gerado a partir da análise direta dos arquivos em disco e do
> schema do banco Supabase em produção. Data da análise: **13/10/2026**.
> **Não há suposições** — cada item abaixo corresponde a um arquivo/tabela verificado.

- **Produto:** BlackBox Vault — plataforma SaaS (academia + ferramentas + créditos).
- **Repositório:** `C:\Projetos\blackboxspam` (branch `master`, commit `5d8c2e9`).
- **Produção:** https://blackboxspam-web.vercel.app (projeto Vercel `blackboxspam-web`).
- **Banco:** Supabase — ref `rsrndqhmswzluzadzbtw`, região Canadá (Central), Postgres 17.

---

## 🛠 Stack Técnica

**Confirmada via `package.json` (versões declaradas) e arquivos de config:**

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | `16.3.8` |
| UI Runtime | React / React DOM | `19.2.8` |
| Linguagem | TypeScript | `^5` |
| Estilo | Tailwind CSS | `^4` (`@tailwindcss/postcss`) |
| Ícones | lucide-react | `^1.52.0` |
| Backend/DB | Supabase (`supabase-js`) | `^2.117.2` |
| Supabase SSR/Helpers | `@supabase/ssr` / `auth-helpers-nextjs` | `^0.12.7` / `^0.15.0` |
| CLI DB | Supabase CLI | `2.119.0` (Postgres `major_version = 17`) |
| Deploy | Vercel | CLI `62.4.0`, projeto `prj_qk7Ix2cVraq1gzJ4qVTUjWzPXWCT` |

**Particularidades desta stack (evidências em disco):**
- **Middleware:** arquivo `proxy.ts` na **raiz** (não `middleware.ts`) — convenção do Next 16 deste projeto. Valida o cookie `license_key` a cada request e aplica RBAC (`user` não acessa `/admin`). O `matcher` **exclui `/api`**, então as API Routes ficam acessíveis publicamente.
- **Autenticação:** por **License Key** em cookie `httpOnly` (`license_key` + `license_role`), **não** usa Supabase Auth para o app.
- **`params` de rota dinâmica** são `Promise` (ex.: `academia/modulo/[id]`, `licenses/[key]`, `ferramentas/gratuitas/[slug]`).
- **Fontes:** Inter + JetBrains Mono via `next/font/google` (`app/layout.tsx`).
- **Projeto externo integrado:** Proxy Scraper (Python/asyncio) em `C:\Users\PcPower\Desktop\scripts\Proxy`, que consome a API `/api/tools/proxy-scraper/validate`.

---

## ✅ Implementado e Funcional

Itens com código presente em disco **e** confirmados operantes em produção (schema e rotas validadas via API real).

### Autenticação & Sessão
- **Login por License Key** (cookie httpOnly + RBAC) — `app/login/page.tsx`, `app/api/auth/set-license-cookie/route.ts`, `app/api/auth/clear-license-cookie/route.ts`, `proxy.ts`.
- **Middleware de proteção de rotas** com redirecionamento para `/login` e derivação de role no servidor — `proxy.ts`.

### Vitrine & Navegação
- **Home (vitrine)** com 4 hubs (Academia, Ferramentas, Minha Conta, Recursos Gratuitos) e widget de saldo/login dinâmico — `app/page.tsx`.
- **Layout raiz** com fontes e metadata — `app/layout.tsx`, `app/globals.css`.

### Sistema de Créditos
- **Saldo via API** (`GET /api/credits`) — `app/api/credits/route.ts`, `app/lib/license-guard.ts`.
- **Débito atômico** de créditos (`POST /api/credits`, proteção `.gte` anti-corrida) — mesma rota.
- **Recarga (topup) simulada** com planos Starter/Growth/Premium — `app/api/credits/topup/route.ts`.
- **Checkout de pagamentos** (PIX/USDT/BTC simulados, timer 15min, QR, bônus) — `app/perfil/pagamentos/page.tsx`.

### Progressão de Níveis (Status)
- **Níveis Bronze→Black** derivados de créditos gastos (`total_spent`) — `app/lib/levels.ts`, `app/perfil/_components/level-card.tsx`.
- ⚠️ **Correção aplicada em produção (13/10):** a migration `20261007200000_add_level_progression.sql` (colunas `total_spent`/`level`) **não estava aplicada** no banco; foi aplicada via Management API, destravando o `/api/credits` e o botão de login da home.

### Academia
- **Listagem de módulos** (Obtenção, Spam, Negociação) — `app/academia/page.tsx`.
- **Episódios por módulo** com desbloqueio pago (10 CR) via `POST /api/credits`, filtro por palavras-chave e persistência em `localStorage` — `app/academia/modulo/[id]/page.tsx`. Tabela `aulas` **existe e possui 8 registros** em produção.

### Ferramentas Gratuitas (processamento client-side)
- **5 ferramentas** (Email Extractor, Email Cleaner, Columns Filter, Words Filter, Password Filter) com lógica pura e de alta performance — `app/ferramentas/gratuitas/_lib/processors.ts`.
- **Catálogo + runner** com páginas estáticas por slug (SSG via `generateStaticParams`) — `app/ferramentas/gratuitas/_lib/tools.ts`, `_components/tool-runner.tsx`, `[slug]/page.tsx`.

### Proxy Scraper PRO (licença por validade + dispositivo) — **mais recente**
- **Tabela `product_licenses`** (separada do login) com planos 7/15/30d, HWID, `expires_at` — migration `20261013000000_add_product_licenses.sql` (aplicada em produção).
- **API de compra** com débito atômico e geração de chave `PXY-…` — `app/api/tools/proxy-scraper/purchase/route.ts`.
- **API de validação pública** (usada pelo app Python; amarra HWID na 1ª ativação) com rate-limit — `app/api/tools/proxy-scraper/validate/route.ts`.
- **Reset de dispositivo** (troca de máquina, máx. 5) — `app/api/tools/proxy-scraper/reset-device/route.ts`.
- **Listagem de licenças do usuário** — `app/api/tools/proxy-scraper/list/route.ts`.
- **Painel de compra/gestão** em `/ferramentas` — `app/ferramentas/_components/proxy-scraper-panel.tsx` (integrado em `app/ferramentas/page.tsx`).
- **Lib de licenças** (planos, gerador de chave, helpers) — `app/lib/product-licenses.ts`.
- **App Python** (fora deste repo): HWID + validação online + gate obrigatório — `C:\Users\PcPower\Desktop\scripts\Proxy\{license.py, main.py}`.

### Admin
- **CRUD de License Keys** (criar/editar/ativar/desativar/deletar) — `app/admin/page.tsx`, `app/api/licenses/route.ts`, `app/api/licenses/[key]/route.ts`, com guard `requireAdmin` (`app/lib/license-guard.ts`).

---

## 🚧 Em Desenvolvimento / Incompleto

Itens com código iniciado, porém **não finalizados** ou **parcialmente funcionais**:

- **CMS de Conteúdo (Admin):** o card existe em `app/admin/page.tsx` (linhas ~403-412), mas o botão "Editar Conteúdo" é um `Link href="#"` **sem destino** — não há tela de CMS implementada.
- **Controle Global / Modo Manutenção (Admin):** botão "Modo Manutenção" presente (`app/admin/page.tsx`, ~414-425) **sem nenhuma ação** (`onClick` ausente) e sem backend/flag de manutenção.
- **Tabela `ferramentas` (banco):** existe no schema, mas está **com 0 registros** em produção. A home de Ferramentas (`app/ferramentas/page.tsx`) compensa exibindo uma lista `SIMULADAS` fixa no código quando o banco está vazio — o desbloqueio real de ferramentas pagas depende do vínculo License Key↔ferramenta que **não existe** como tabela própria (usa apenas `localStorage` no cliente).
- **Migração unlocks → servidor (EM ANDAMENTO — Onda 2):** a tabela `unlocks` **já foi criada e aplicada em produção** (migration `20261014000000_create_unlocks_table.sql`), com `id` uuid PK, `license_key` (FK → `licenses(key)` ON DELETE CASCADE), `content_id`, `content_type` (CHECK `aula`/`ferramenta`), `unlocked_at`, **UNIQUE (license_key, content_id)** e RLS (leitura pública só p/ key válida; escrita só service_role). **Falta migrar o código cliente:** hoje `app/academia/modulo/[id]/page.tsx` e `app/ferramentas/page.tsx` ainda persistem "desbloqueado" em `localStorage` — o próximo passo é trocar por leitura/gravação via API servidor usando `unlocks`.
- **Desbloqueio ainda é client-side (a ser eliminado):** enquanto a migração acima não conclui, o "direito de acesso" a aulas/ferramentas vive apenas no `localStorage` do navegador (o débito de créditos ocorre, mas não há vínculo servidor por usuário).
- **Provedores de login social (Supabase Auth):** `supabase/config.toml` traz dezenas de provedores (Apple, Google, GitHub, Firebase, Auth0, etc.) **todos `enabled = false`** — o app hoje usa somente License Key.
- **App Python do Proxy Scraper** vive **fora do repo** (`C:\Users\PcPower\Desktop\scripts\Proxy`) e **não está versionado** no Git deste projeto.

---

## 📋 Backlog de Pendências

### 🔴 Prioridade Alta
1. **Versionar remoto:** o repo é **só local** — não há remote Git configurado e o projeto Vercel **não está ligado a repositório** (deploy é manual via CLI). Sem backup remoto do código.
2. **Sincronizar migrations↔produção:** descobriu-se que a migration de níveis (`20261007200000`) **não estava aplicada** e causou falha no login. Auditar e aplicar **todas** as migrations pendentes; considerar adotar `supabase db push` no fluxo.
3. **Gateway de pagamento real:** o checkout (`app/perfil/pagamentos/page.tsx`) e o topup (`app/api/credits/topup/route.ts`) são **simulados** — sem cobrança real.

### 🟡 Prioridade Média
4. **Popular `ferramentas` e remover dados simulados:** cadastrar as ferramentas reais no banco e eliminar a lista `SIMULADAS` fixa em `app/ferramentas/page.tsx`.
5. **Implementar o CMS de Conteúdo** (Admin) e o **Modo Manutenção** (hoje placeholders em `app/admin/page.tsx`).
6. **Histórico de consumo:** exibir no Perfil o extrato de débitos (aulas/ferramentas/licenças) por License Key.
7. **Documentação do próprio produto:** `README.md` ainda é o texto padrão do `create-next-app` (não descreve o BlackBox). `docs/PROJETO.md` é a fonte de arquitetura.
8. **Testes automatizados:** não há nenhuma suíte de testes no projeto.

### 🟢 Prioridade Baixa
9. **Domínio próprio:** produção usa o domínio padrão Vercel (`blackboxspam-web.vercel.app`).
10. **Deployment Protection:** `ssoProtection = all_except_custom_domains` está ativo — revisar se deseja manter/exigir auth da Vercel nas páginas.
11. **Rate limiting persistente:** o limite do `/validate` é em memória (por instância serverless) — insuficiente sob escala; considerar Upstash/Redis.
12. **Limpeza de schema:** tabelas legadas podem existir (`licencas`, `user_credits`) — revisar consolidação.
13. **Ofuscação do app Python:** a licença client-side é patchável; avaliar medidas extras se necessário.

---

## 📍 Último Ponto de Parada

**Commit HEAD:** `5d8c2e9` — *"feat(tools): licenca por validade do Proxy Scraper com consumo de creditos e vinculo por dispositivo"* (8 arquivos, +844 linhas), que entregou todo o subsistema **Proxy Scraper PRO**: tabela `product_licenses`, 4 rotas de API (`validate`, `purchase`, `reset-device`, `list`), lib `product-licenses.ts` e o painel em `/ferramentas`.

**Ações em produção/banco realizadas após esse commit (via Management API, pois o deploy é por CLI):**
1. **Migration `product_licenses` aplicada** e validada (11 colunas, constraint de plano 7d/15d/30d, RLS).
2. **Bug de login corrigido:** identificado que a migration `20261007200000_add_level_progression.sql` **não estava aplicada** no banco — a rota `GET /api/credits` quebrava ao selecionar as colunas `total_spent`/`level` inexistentes, o que fazia o botão **"Entrar"** reaparecer na home mesmo com sessão ativa. A migration foi aplicada em produção e o `/api/credits` voltou a responder `200`.
3. **Créditos adicionados:** `BBX-USER-0001` creditado com **+10.000** (saldo atual **10.240**).
4. **Onda 2 — tabela `unlocks` criada e aplicada em produção** (migration `20261014000000_create_unlocks_table.sql`): `id` uuid PK, `license_key` (FK → `licenses(key)` ON DELETE CASCADE), `content_id`, `content_type` (CHECK `aula`/`ferramenta`), `unlocked_at`, **UNIQUE (license_key, content_id)** e RLS. Validada com 8 testes reais (INSERT, unique, check, FK, limpeza) — todos OK. **Próximo subpasso:** migrar o código cliente (`academia/modulo/[id]`, `ferramentas/page`) de `localStorage` para a API servidor usando `unlocks`.

**Estado de saúde (verificado via API do Supabase, 14/10/2026):**
- Schema `public` contém: `aulas` (8), `ferramentas` (0), `licencas`, `licenses` (2), `mentorias`, `perfis`, `product_licenses` (1), `unlocks` (0), `user_credits`.
- `licenses` com as chaves: `BBX-MASTER-0001` (admin, 9999 CR) e `BBX-USER-0001` (user, 10240 CR).
- `ssoProtection = all_except_custom_domains` ativo no projeto Vercel; **as rotas `/api/*` são públicas** (o `matcher` do middleware exclui `/api`).

**Próximo passo natural (sugerido):** concluir a Onda 2 (API + UI servidor de unlocks) e, na Onda 1, criar remote Git + integrar o Vercel ao repositório para deploy automatizado (ou manter deploy manual via CLI).



