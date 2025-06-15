fn render_pdf_pages_to_images(bytes: &[u8]) -> Result<Vec<image::DynamicImage>, String> {
    use pdfium_render::prelude::*;

    let lib_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("lib/libpdfium.dylib");

    let lib_path_str = lib_path
        .to_str()
        .ok_or("Failed to convert path to string")?;

    println!("Attempting to load pdfium from: {}", lib_path_str);

    let pdfium = Pdfium::new(Pdfium::bind_to_library(lib_path.clone()).map_err(|e| {
        format!(
            "Failed to bind to pdfium library at {}: {}",
            lib_path_str, e
        )
    });

    let doc = pdfium
        .load_pdf_from_byte_slice(bytes, None)
        .map_err(|e| e.to_string())?;

    let mut images = vec![];
    let page_count = doc.pages().len();

    for page_index in 0..page_count {
        let page = doc
            .pages()
            .get(page_index)
            .map_err(|e| format!("Could not get page {}: {}", page_index, e))?;

        let rendered = page
            .render_with_config(
                &PdfRenderConfig::new()
                    .set_target_width(224)
                    .set_target_height(224)
                    .rotate_if_landscape(PdfPageRenderRotation::None, false),
            )
            .map_err(|e| e.to_string())?;

        let width = rendered.width() as u32;
        let height = rendered.height() as u32;
        let raw = rendered.as_raw_bytes();
        let img_buf = image::RgbaImage::from_raw(width, height, raw.to_vec())
            .ok_or("Failed to create image buffer from PDF page")?;
        let img = image::DynamicImage::ImageRgba8(img_buf);

        images.push(img);
    }

    Ok(images)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![load_model, infer_from_base64])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
