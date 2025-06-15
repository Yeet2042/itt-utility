// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let pdfium_path = std::env::current_dir()
        .unwrap()
        .join("src-tauri/lib/libpdfium.dylib");

    std::env::set_var("PDFIUM_LIB", pdfium_path);

    itt_utility_lib::run()
}
