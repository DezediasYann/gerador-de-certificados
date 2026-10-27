# Changelog — Gerador de Certificados

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
