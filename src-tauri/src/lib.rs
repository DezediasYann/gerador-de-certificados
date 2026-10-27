// Núcleo Rust do Gerador de Certificados.
// Minimalista: registra os plugins (updater, dialog, fs, store, process) e inicia o app.
// Toda a lógica de geração de certificados vive no frontend (Canvas/TypeScript).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Gerador de Certificados");
}
