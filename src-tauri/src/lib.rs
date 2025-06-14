use candle_core::quantized::gguf_file;
use std::sync::{Arc, Mutex};
use tauri::State;

type ModelState = Arc<Mutex<Option<gguf_file::Content>>>;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_model(path: &str, model_state: State<ModelState>) -> Result<String, String> {
    let mut file = std::fs::File::open(path).map_err(|e| format!("Can not load model: {}", e))?;

    let content = gguf_file::Content::read(&mut file)
        .map_err(|e| format!("Can not read GGUF file: {}", e))?;

    let tensor_count = content.tensor_infos.len();

    *model_state.lock().unwrap() = Some(content);

    Ok(format!(
        "Model loaded successfully! Found {} tensors",
        tensor_count
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let model_state: ModelState = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(model_state)
        .invoke_handler(tauri::generate_handler![greet, load_model])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
