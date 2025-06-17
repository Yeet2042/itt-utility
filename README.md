# ITT Utility - PDF & Image to Text OCR Tool

A modern desktop application built with Tauri, React, and TypeScript that converts PDF and image files to text using TyphoonOCR API with intelligent parallel processing and rate limiting.

## ✨ Key Features

- **Parallel OCR Processing**: Process multiple files simultaneously while respecting API rate limits
- **Smart Rate Limiting**: Built-in delay between requests to maintain optimal API performance
- **Multi-format Support**: Handles PNG, JPG, JPEG, and PDF files
- **PDF Page Processing**: Automatically processes all pages in PDF documents
- **Real-time Progress**: Live progress tracking for each file being processed
- **Secure API Key Storage**: Encrypted local storage for your Typhoon API key
- **Cross-platform**: Works on macOS, Windows, and Linux
- **Modern UI**: Clean, intuitive interface with dark theme

## 🚀 Quick Start

### Prerequisites

**Python 3.9+** is required with the following packages:

```bash
pip install typhoon-ocr==0.3.8 pypdf2
```

**macOS users** also need to install Poppler:

```bash
brew install poppler
```

### Installation

1. Download the latest release for your platform
2. Install and launch the application
3. Get your Typhoon API key from [OpenTyphoon Playground](https://playground.opentyphoon.ai/user/login?next=%2Fplayground)
4. Enter your API key in the application
5. Select your files and start processing!

## 🔧 Development Setup

### Requirements

- Node.js 18+
- Rust 1.70+
- Python 3.9+
- Bun (package manager)

### Setup

1. Clone the repository:

```bash
git clone git@github.com:Yeet2042/itt-utility.git
cd itt-utility
```

2. Install dependencies:

```bash
bun install
```

3. Install Python dependencies:

```bash
cd src-tauri/python
pip install -r requirements.txt
```

4. Run in development mode:

```bash
bun tauri dev
```

## 🏗️ Build

Create a production build:

```bash
bun tauri build
```

## 🔧 How It Works

The application uses a sophisticated parallel processing system:

1. **File Validation**: Accepts PDF and image files through drag-and-drop or file picker
2. **API Key Verification**: Validates your Typhoon API key before processing
3. **Parallel Processing**: Processes multiple files concurrently using Rust's async capabilities
4. **Rate Limiting**: Implements intelligent delays to respect API rate limits
5. **Progress Tracking**: Real-time updates on processing status for each file
6. **Result Storage**: Saves OCR results to temporary files with easy export options

### Parallel Processing Architecture

The app processes files in parallel using:

- **Rust Tokio**: Async runtime for concurrent file processing
- **Rate Limiting**: 500ms delay between API calls to maintain compliance
- **Progress Events**: Real-time status updates sent to the frontend
- **Error Handling**: Robust error recovery for failed OCR attempts

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Framer Motion
- **Backend**: Rust, Tauri v2
- **OCR Engine**: TyphoonOCR API
- **Python Integration**: PyO3 for Python bindings
- **Styling**: TailwindCSS, Material-UI Icons

## 📝 API Key

You need a valid TyphoonOCR API key to use this application. Get yours from:
[https://playground.opentyphoon.ai/user/login](https://playground.opentyphoon.ai/user/login?next=%2Fplayground)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ☕ Support

If you find this tool helpful, consider [buying me a coffee](https://coff.ee/arpeggiokou)!

## 📄 License

This project is open source and available under the MIT License.
