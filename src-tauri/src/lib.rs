use futures::stream::{FuturesUnordered, StreamExt};
use pyo3::prelude::*;
use pyo3::types::PyDict;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::{
    sync::Arc,
    time::{Duration, Instant},
};
use tauri::Emitter;
use tokio::sync::Mutex;
use tokio::time::interval;

#[derive(Serialize, Deserialize, Clone)]
pub struct FileProgress {
    pub file_path: String,
    pub status: String,
    pub result: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProcessProgress {
    pub files: Vec<FileProgress>,
    pub current_task: String,
    pub completed: usize,
    pub total: usize,
}

#[tauri::command]
async fn process_files(
    app_handle: tauri::AppHandle,
    api_key: String,
    file_paths: Vec<String>,
) -> Result<String, String> {
    if file_paths.is_empty() {
        return Err("No file paths provided".to_string());
    }

    let progress = ProcessProgress {
        files: file_paths
            .iter()
            .map(|path| FileProgress {
                file_path: path.clone(),
                status: "waiting".to_string(),
                result: None,
                error: None,
            })
            .collect(),
        current_task: "prepare for processing...".to_string(),
        completed: 0,
        total: file_paths.len(),
    };

    let _ = app_handle.emit("process_progress", &progress);
    let progress_arc = Arc::new(Mutex::new(progress));

    let mut ticker = interval(Duration::from_secs(1));
    let mut i = 0;
    let mut tasks = FuturesUnordered::new();
    let mut start_min = Instant::now();
    let mut count_per_min = 0;

    while i < file_paths.len() {
        ticker.tick().await;

        if count_per_min >= 20 {
            let elapsed = start_min.elapsed();
            if elapsed < Duration::from_secs(60) {
                tokio::time::sleep(Duration::from_secs(60) - elapsed).await;
            }
            start_min = Instant::now();
            count_per_min = 0;
        }

        for _ in 0..2 {
            if i >= file_paths.len() {
                break;
            }

            let path = file_paths[i].clone();
            let api_key = api_key.clone();
            let progress_clone = progress_arc.clone();
            let app_handle_clone = app_handle.clone();

            tasks.push(tokio::spawn(async move {
                {
                    let mut prog = progress_clone.lock().await;
                    if let Some(file_prog) = prog.files.iter_mut().find(|f| f.file_path == path) {
                        file_prog.status = "processing".to_string();
                    }
                    prog.current_task = format!("Processing: {}", path);
                    let _ = app_handle_clone.emit("process_progress", &*prog);
                }

                let path_clone = path.clone();
                let path_for_ocr = path.clone();

                let res = tokio::task::spawn_blocking(move || typhoon_ocr(&api_key, &path_for_ocr))
                    .await
                    .unwrap();

                {
                    let mut prog = progress_clone.lock().await;
                    if let Some(file_prog) =
                        prog.files.iter_mut().find(|f| f.file_path == path_clone)
                    {
                        match &res {
                            Ok(txt) => {
                                let temp_dir = if cfg!(target_os = "macos") {
                                    std::env::var("TMPDIR").unwrap_or_else(|_| "/tmp".to_string())
                                } else if cfg!(target_os = "windows") {
                                    std::env::var("TEMP").unwrap_or_else(|_| {
                                        std::env::temp_dir().to_string_lossy().to_string()
                                    })
                                } else {
                                    std::env::var("TMPDIR").unwrap_or_else(|_| "/tmp".to_string())
                                };

                                let mut output_path = PathBuf::from(temp_dir);
                                let file_stem = PathBuf::from(&path_clone)
                                    .file_stem()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                                    .to_string();
                                output_path.push(format!("{}_ocr_result.txt", file_stem));

                                let _ = fs::write(&output_path, txt);

                                file_prog.status = "completed".to_string();
                                file_prog.result = Some(output_path.to_string_lossy().to_string());
                            }
                            Err(e) => {
                                file_prog.status = "error".to_string();
                                file_prog.error = Some(e.to_string());
                            }
                        }
                    }
                    prog.completed += 1;
                    let _ = app_handle_clone.emit("process_progress", &*prog);
                }
            }));

            i += 1;
            count_per_min += 1;
        }
    }

    while let Some(_) = tasks.next().await {}

    let mut prog = progress_arc.lock().await;
    prog.current_task = "Completed!".to_string();
    let _ = app_handle.emit("process_progress", &*prog);

    let results: Vec<String> = prog
        .files
        .iter()
        .map(|f| match f.status.as_str() {
            "completed" => f.result.as_ref().unwrap_or(&"".to_string()).to_string(),
            "error" => f
                .error
                .as_ref()
                .unwrap_or(&"Unknown error".to_string())
                .to_string(),
            _ => f.status.clone(),
        })
        .collect();

    Ok(results.join("\n\n---\n\n"))
}

fn typhoon_ocr(api_key: &str, file_path: &str) -> PyResult<String> {
    Python::with_gil(|py| {
        let os = py.import("os")?;
        let typhoon_ocr = py.import("typhoon_ocr")?;

        let environ = os.getattr("environ")?;
        environ.set_item("TYPHOON_OCR_API_KEY", api_key)?;

        let ocr_document = typhoon_ocr.getattr("ocr_document")?;

        let path_lower = file_path.to_lowercase();
        let is_pdf = path_lower.ends_with(".pdf");

        if is_pdf {
            let builtins = py.import("builtins")?;
            let open_fn = builtins.getattr("open")?;
            let file = open_fn.call1((file_path, "rb"))?;

            let pypdf2: Bound<'_, PyModule> = py.import("PyPDF2")?;
            let reader = pypdf2.getattr("PdfReader")?.call1((file,))?;
            let pages = reader.getattr("pages")?;
            let page_count = pages.getattr("__len__")?.call0()?.extract::<usize>()?;

            let mut all_text = String::new();
            for page_num in 1..=page_count {
                let kwargs = PyDict::new(py);
                kwargs.set_item("pdf_or_image_path", file_path)?;
                kwargs.set_item("task_type", "default")?;
                kwargs.set_item("page_num", page_num)?;

                let result = ocr_document.call((), Some(&kwargs))?;
                let text = result.extract::<String>()?;
                all_text.push_str(&format!("{}\n", text));

                std::thread::sleep(std::time::Duration::from_millis(500));
            }

            Ok(all_text)
        } else {
            let kwargs = PyDict::new(py);
            kwargs.set_item("pdf_or_image_path", file_path)?;
            kwargs.set_item("task_type", "default")?;

            let result = ocr_document.call((), Some(&kwargs))?;
            result.extract::<String>()
        }
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![process_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
