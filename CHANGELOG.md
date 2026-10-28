# Changelog — Gerador de Certificados

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [v1.3.0] — 2026-10-28

### 🚀 Novidades — Sistema de Contas + Backup E2E + Email Real

#### Sistema de coordenadas centrado
- **Centro absoluto da imagem como origem** para todos os eixos de posição (X, Y, largura). Independente das dimensões do template, `posX=0` significa "centro horizontal da imagem".
- **Sliders substituem inputs numéricos** para posição de texto, assinatura e QR code. Ranges: X `[-1000, +1000]`, Y `[-700, +700]`, Largura `[0, 2000]`.
- **Migração automática** de eventos antigos do sistema absoluto (top-left) para o centrado, preservando a posição visual dos elementos.
- **Componente `LabeledSlider`** reutilizável com valor em badge monospace e hint opcional.

#### Sistema de autenticação (VPS)
- **Tabela `users`** no SQLite — email, name, password_hash (bcrypt 12 rounds), kdf_salt, status, timestamps.
- **JWT HS256** com segredo auto-gerado (30 dias de validade, timing-safe compare na assinatura).
- **Endpoints:** `POST /api/auth/register`, `/login`, `/change-password`, `GET /api/auth/me`.
- **Anti-enumeration:** login responde igual para email existente/inexistente (dummy bcrypt compare).
- **Rate limiting** no login (lockout após 5 tentativas em 15 min).

#### Backup E2E (ponta-a-ponta criptografado)
- **Tabela `backups`** — blobs cifrados com histórico (até 20 por usuário).
- **Criptografia client-side:** PBKDF2(password, salt, 150000 iterações) → AES-256-GCM via Web Crypto API. A VPS nunca vê a chave derivada nem o events.json em texto.
- **Endpoints:** `POST /api/backups` (upload), `GET /api/backups/latest` (download), `GET /api/backups` (lista), `DELETE /api/backups/:id`.
- **Backup automático** debounced (5s) a cada mudança se toggle ligado.
- **Restore** com verificação de checksum SHA-256 e mescla de eventos (não sobrescreve).

#### Associação access keys ↔ contas de usuário
- **Coluna `user_id`** em `access_keys` (nullable — chaves legacy ficam sem user).
- **Claim automático:** quando o user faz login com uma chave manual no app, ela se associa permanentemente ao email dele.
- **1 chave ativa por email:** admin "Substituir key" revoga anterior + cria nova (histórico preservado).
- **Chave de email anula manual:** campo de validação fica disabled quando o user tem chave associada.
- **Endpoint `POST /api/auth/claim-access-key`** — associa standalone, rejeita se pertence a outro user.
- **Endpoint `GET /api/auth/my-access-key`** — app busca key associada e auto-preenche o campo.

#### Perfil próprio + LoginScreen
- **Avatar no header** (inicial do nome) com dropdown: Meu perfil, Meus eventos, Sair.
- **Botão "Entrar"** no header quando não autenticado → abre dialog de login.
- **ProfileScreen** centraliza: conta, trocar senha, chave de acesso, backup E2E.
- **LoginScreen** como dialog (não bloqueia o app) com tabs Entrar/Criar conta.

#### Esqueci minha senha + Email real (Resend)
- **Tabela `password_resets`** — token 32 bytes hex, 1h de validade, uso único.
- **Endpoints:** `POST /api/auth/forgot-password`, `/reset-password`, `GET /reset/:token` (página web).
- **Anti-enumeration:** responde sempre `{ ok: true }` (não revela se email existe).
- **Integração Resend** (https://resend.com, 3000 emails/mês grátis) — envia email real com link de reset.
- **Fallback admin:** sem `RESEND_API_KEY`, tokens aparecem em `/admin/resets` para admin copiar e enviar manualmente.
- **Página web `/reset/:token`** hospedada na VPS (funciona sem o app instalado).

#### Painel admin expandido
- **Dashboard** com 6 stats: Eventos, Certificados, Revogados, Usuários, Backups, Chaves ativas.
- **Página "Usuários"** — lista contas com status, count de backups, key ativa, último login. Ações: Substituir key, Revogar ativa, Suspender/Reativar, ver Histórico.
- **Página "Histórico de chaves"** por user — todas as chaves (ativas + revogadas) com copy-to-clipboard.
- **Página "Backups"** — histórico global de backups E2E (user, eventos, tamanho, checksum).
- **Página "Resets"** — tokens de reset pendentes (fallback quando email não configurado).
- **Fuso horário Brasília** corrigido em todas as datas do painel e validação pública.

#### Migração para domínio próprio
- **URL de produção** mudou de `certificados-yann.duckdns.org` para `https://dezedias.me`.
- **`apiConfig.ts`** resolve URL por env var (`NEXT_PUBLIC_API_URL`) > sandbox (`NEXT_PUBLIC_SANDBOX=1`) > produção (default).
- **Caddyfile** atualizado para `dezedias.me` (+ www + cert subdomain).
- **DEPLOY.md** reescrito com passo a passo Cloudflare + Resend (sem mais DuckDNS).
- **`.env.example`** documenta `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BASE_URL`, `APP_BASE_URL`.

### 🐛 Correções
- **Dialogs não abriam:** `.glass`/`.glass-strong` em globals.css definiam `position: relative` fora de `@layer`, sobrescrevendo `position: fixed` dos dialogs. Removido `position` das classes; `GlassPanel` ganhou `relative` explícito.
- **`AlertDialogContent`** padronizado com `DialogContent` (`top-6 left-[50%] -translate-x-1/2`, sem `sm:max-w-lg`).
- **`Bun.serve()`** explícito em vez de `export default { port, fetch }` (não funcionava na versão do Bun da VPS).
- **Backup download** convertia `Uint8Array` para array de números em vez de base64 — corrigido com `Buffer.from(row.blob).toString("base64")`.

### 🔧 Técnico
- **Novos arquivos VPS:** `src/lib/jwt.ts`, `src/lib/user-auth.ts`, `src/lib/email.ts`, `src/env.ts`, `src/routes/auth.ts`, `src/routes/backups.ts`, `.env.example`.
- **Novos arquivos app:** `src/lib/auth/backup-crypto.ts`, `src/lib/auth/backup-service.ts`, `src/store/user-auth.ts`, `src/components/auth/LoginScreen.tsx`, `src/components/auth/ProfileScreen.tsx`, `src/components/auth/BackupPanel.tsx`, `src/components/ui/labeled-slider.tsx`.
- **`tryMigrate()`** no schema — adiciona colunas novas via `ALTER TABLE` idempotente.
- **Versão da API:** 0.3.0 → 0.4.0.

---

## [v1.2.6] — 2025-01-27

### ✨ Melhorias
- **Nome do app exibido com espaços no Windows:** o atalho no menu Iniciar e no desktop agora aparece como "Gerador de Certificados" (com espaços), enquanto o `productName` continua "GdC" (sem espaços, safe para o instalador/binário/URL do updater). Implementado via `installerHooks` NSIS (`NSIS_HOOK_POSTINSTALL`) que remove o atalho "GdC.lnk" e cria "Gerador de Certificados.lnk" apontando para o executável correto.
- **Instalador NSIS em modo perMachine:** o app agora instala para todos os usuários da máquina.
- **Variáveis NSIS corrigidas:** `PRODUCTNAME` e `MAINBINARYNAME` (do template oficial do Tauri 2) em vez de `PRODUCTFILENAME` que não existia.

---

## [v1.2.5] — 2025-01-27

### ✨ Novidades
- **Animações de transição de view:** home → wizard → event → settings agora têm fade + slide suave (easing macOS, 0.25s) via `AnimatePresence` do framer-motion.
- **Animação de cards de eventos (Home):** stagger de entrada (cascata, 40ms de intervalo) + hover lift (sobe 6px + escala 1.02×) + tap feedback (escala 0.99×).
- **Animação de participantes:** cada linha aparece com fade + slide (stagger) e reorganiza suavemente ao adicionar/remover.
- **Transição suave de tema:** ao alternar claro/escuro, as cores transicionam em 0.3s.

### ⚡ Otimizações de performance
- **`memo()` no `ParticipantRow`:** a linha só re-renderiza quando seus próprios props mudam.
- **`will-change: transform` no canvas:** otimiza a camada do preview (GPU-accelerated).
- **Animações só em `transform` e `opacity`:** propriedades GPU-accelerated sem reflow.
- **Arquitetura de animações:** criado `src/lib/animations.ts` com variantes reutilizáveis.

### 🔧 CI/CD
- **Cache de Bun (node_modules):** acelera `bun install` — pula download de deps quando o `bun.lockb` não mudou.
- **Cache de Cargo (Rust):** `Swatinem/rust-cache@v2` cacheia `~/.cargo/registry`, `~/.cargo/git` e `src-tauri/target`. Compilação Rust cai de ~15-30 min para ~3-5 min na segunda run.

---

## [v1.2.4] — 2025-01-27

### 🐛 Correções
- **Diálogo de Ajustes agora é largo:** o `sm:max-w-lg` do componente Dialog do shadcn (512px) estava ganhando do `max-w-5xl` por causa do prefixo responsivo. Adicionado `sm:max-w-[1400px]` + `w-[95vw]`.
- **Preview do certificado legível:** antes 87×62px (minúsculo), agora 906×641px (landscape) em tela cheia.

---

## [v1.2.3] — 2025-01-27

### 🐛 Correções
- Removida a permissão `core:path:allow-app-data-dir` inexistente do `capabilities/default.json`.

---

## [v1.2.2] — 2025-01-27

### 🐛 Correções
- **Preview do certificado grande e legível** no diálogo de Ajustes. Corrigidos 4 bugs encadeados: cap de escala removido, altura do diálogo fixada, grid com `min-h-0 flex-1`, flex chain corrigida.

---

## [v1.2.1] — 2025-01-27

### 🐛 Correções
- **Comparação semântica de versões:** o `UpdateChecker` não sugere mais downgrade. Agora usa `compareVersions(a, b)` que compara como números e trata pre-releases.

---

## [v1.2.0] — 2025-01-27

### ✨ Novidades
- **Identifier curto:** `com.certificados.gen` (era `com.yanndezedias.geradorcertificados`).
- **Eventos em arquivo de dados separado:** `events.json` no diretório de dados do app (não compilado no binário). Persiste entre atualizações.
- **Modal de atualização "hero":** download com barra de progresso gradiente, % em tempo real, velocidade, changelog, tela de sucesso com reinício automático.

---

## [v1.1.5] — 2025-01-27

### 🔧 CI/CD
- **Normalização da chave privada:** detecta base64 puro vs formato cru e normaliza.
- **Conversão base64 compatível com macOS:** `base64 | tr -d '\n'` em vez de `base64 -w 0`.
- **Step de validação da chave:** assina arquivo de teste antes do build (falha cedo em ~10s).
- **`updaterJsonPreferNsis: true`** no `tauri-action`.

---

## Como manter este arquivo

1. **Antes de cada release**, adicione uma nova seção no topo (abaixo desta linha):
   ```
   ## [vX.Y.Z] — AAAA-MM-DD

   ### ✨ Novidades
   - ...

   ### 🐛 Correções
   - ...

   ### ⚡ Otimizações
   - ...
   ```

2. **Faça commit** do `CHANGELOG.md` junto com o bump de versão.

3. **O workflow do GitHub** lê automaticamente a seção da versão atual e usa como corpo da release. **Você não precisa colar nada manualmente.**

4. **Categorias sugeridas:**
   - ✨ Novidades — novas funcionalidades
   - 🐛 Correções — correção de bugs
   - ⚡ Otimizações — melhorias de performance
   - 🔧 CI/CD — mudanças no workflow/integração
   - 📚 Documentação — mudanças na docs
