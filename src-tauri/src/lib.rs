// Núcleo Rust do Gerador de Certificados.
// Minimalista: registra os plugins (updater, dialog, fs, store, process) e inicia o app.
// Toda a lógica de geração de certificados vive no frontend (Canvas/TypeScript).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // O updater usa Builder::new().build() em vez de init() porque desabilitamos
        // as default-features (para evitar o crate `zip` 2.x yanked do crates.io).
        // init() é uma conveniência gated atrás do feature `zip`; Builder funciona sem ele.
        .plugin(
            tauri_plugin_updater::Builder::new()
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Gerador de Certificados");
}
