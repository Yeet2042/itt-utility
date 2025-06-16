use std::process::Command;

#[tauri::command]
fn run_ocr(model_path: String) -> Result<String, String> {
    let output = Command::new("python3")
        .arg("ocr_runner.py")
        .arg(&model_path)
        .output()
        .map_err(|e| format!("❌ Failed to execute Python: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        println!("✅ Python stdout: {}", stdout);
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        println!("❌ Python stderr: {}", stderr);
        Err(stderr)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![run_ocr])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
