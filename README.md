# Gerador de Certificados

Aplicativo desktop multiplataforma para gerar certificados em PDF a partir de modelos de imagem, com assinatura digital e geração em lote via planilha.

**Criador:** Yann Dezedias  
**Licença:** MIT  
**Framework:** Tauri 2 + Next.js 16 + React 19 + TypeScript  
**UI:** macOS Golden Gate (Liquid Glass)

---

## Pré-requisitos

Você precisa ter instalado na sua máquina:

1. **Node.js 20+** e **Bun** (runtime JS) — <https://bun.sh>
2. **Rust** (stable) — <https://rustup.rs>
3. **Tauri 2 CLI** (instalado como devDependency do projeto)
4. Dependências nativas do Tauri conforme seu sistema:
   - **Windows:** Microsoft Visual Studio C++ Build Tools + WebView2 (pré-instalado no Windows 11)
   - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
   - **Linux:** `libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev` (+ `patchelf`)

Confira o guia oficial: <https://v2.tauri.app/start/prerequisites/>

---

## Como rodar no VS Code

### 1. Descompacte o ZIP

Descompacte `Gerador-de-Certificados-1.0.0.zip` numa pasta. Você terá a estrutura:

```
Gerador-de-Certificados/
├── src/                    # Frontend Next.js (UI + motor de certificados)
├── src-tauri/              # Núcleo Rust/Tauri
├── public/                 # Templates, fontes, ícones
├── package.json
├── next.config.ts
└── ...
```

### 2. Abra a pasta no VS Code

```bash
cd Gerador-de-Certificados
code .
```

### 3. Instale as dependências do frontend

```bash
bun install
```

### 4. Rode em modo desenvolvimento (Tauri + Next.js)

```bash
bun run tauri:dev
```

Na primeira execução, o Rust vai compilar o núcleo Tauri (pode levar alguns minutos). Depois, uma janela nativa abre com o app rodando com hot-reload.

> Se quiser rodar só o frontend no navegador (sem Tauri) para iterar mais rápido na UI:
> ```bash
> bun run dev
> ```
> e abra <http://localhost:3000>. As funcionalidades de arquivo/OTA fazem fallback para o browser (download em vez de diálogo nativo).

### 5. Build de produção (gera o instalador)

```bash
bun run tauri:build
```

Os binários instaláveis ficam em `src-tauri/target/release/bundle/` (`.msi`/`.exe` no Windows, `.dmg` no macOS, `.deb`/`.AppImage` no Linux).

---

## Funcionalidades

- **Geração individual:** preencha os dados do participante e do evento nas abas, clique em "Gerar certificado PDF".
- **Pré-visualização em tempo real:** o preview atualiza a cada mudança. Arraste a assinatura diretamente sobre o preview.
- **Geração em lote:** clique em "Gerar em lote", selecione uma planilha Excel/CSV (use "Baixar modelo Excel" para o template). Um PDF é gerado por linha.
- **Assinatura digital:** na aba Ajustes, habilite a assinatura e carregue uma imagem PNG (com transparência).
- **Modo claro/escuro:** botão de tema no canto superior direito.
- **Atualização OTA:** o app verifica atualizações no GitHub ao iniciar. Configure o canal beta em Ajustes.

---

## Atualização OTA (GitHub Releases)

Para que o OTA funcione, você precisa:

1. **Criar o repositório GitHub:** `DezediasYann/gerador-de-certificados` (ou ajuste `GITHUB_REPO` em `src/lib/cert/Catalogs.ts`).

2. **Gerar o par de chaves de assinatura** (uma única vez):
   ```bash
   bun run tauri signer generate -w ~/.tauri/gerador-certs.key
   ```
   - Guarde a **chave privada** com segurança (nunca no repositório).
   - A **chave pública** vai em `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` (substitua o placeholder).

3. **Configurar os secrets no GitHub Actions:**
   - `TAURI_PRIVATE_KEY` — conteúdo da chave privada
   - `TAURI_KEY_PASSWORD` — senha da chave (se houver)

4. **Publicar uma release:** crie uma tag `vX.Y.Z` (ex.: `v1.0.0`) e empurre. O GitHub Actions builda, assina e publica a release com o arquivo `latest.json` que o app consulta.

---

## Adicionar templates e fontes

- **Templates:** coloque imagens PNG/JPG em `public/models/`. O app lista automaticamente os arquivos da pasta.
- **Fontes:** coloque famílias em `public/fonts/<NomeDaFonte>/` com os arquivos regular e italic (.ttf). Cadastre em `src/lib/cert/Catalogs.ts` → `AVAILABLE_FONTS`.

---

## Estrutura do código (OOP)

A lógica de domínio é orientada a objetos, em `src/lib/`:

| Classe | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `TextComposer` | `lib/cert/TextComposer.ts` | Compõe o texto do certificado conforme função/atividade/doc/data |
| `CertificateEngine` | `lib/cert/CertificateEngine.ts` | Desenha texto + assinatura sobre o template no Canvas |
| `SignatureOverlay` | `lib/cert/SignatureOverlay.ts` | Converte coordenadas de arrasto entre preview e template |
| `FontLoader` | `lib/cert/FontLoader.ts` | Carrega fontes TrueType via FontFace API |
| `PdfExporter` | `lib/cert/PdfExporter.ts` | Converte canvas em PDF via jsPDF |
| `ExcelBatchProcessor` | `lib/cert/ExcelBatchProcessor.ts` | Gera modelo Excel e processa lotes |
| `UpdateChecker` | `lib/updater/UpdateChecker.ts` | Verifica releases no GitHub |
| `UpdateInstaller` | `lib/updater/UpdateInstaller.ts` | Instala atualização via Tauri Updater |
| `PreferencesStore` | `lib/storage/PreferencesStore.ts` | Persiste preferências (Tauri Store / localStorage) |

A UI (React) é funcional/idiomática e consome esses objetos via Zustand store (`src/store/cert-store.ts`).

---

## Versionamento

Esquema `X.Y.Z`:
- **X (Release):** marcos oficiais majeuros
- **Y (Feature):** novas funcionalidades
- **Z (Patch):** correções de bugs

---

## Licença

MIT © Yann Dezedias
