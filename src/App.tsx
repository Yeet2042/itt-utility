import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import { basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState, useRef } from "react";

export default function App() {
  const [llmName, setLlmName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList) => {
    setFiles(files);
  };

  const handleClear = () => {
    setFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (file: File) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.name !== file.name);
    if (newFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      newFiles.forEach((f) => dataTransfer.items.add(f));
      setFiles(dataTransfer.files);
    } else {
      setFiles(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectLLM = async () => {
    const selectedModel = await open({
      multiple: false,
      filters: [{ name: "LLM Model", extensions: ["safetensors"] }],
    });

    if (typeof selectedModel === "string") {
      const llmName = await basename(selectedModel);
      setLlmName(llmName);

      await invoke("load_model", { path: selectedModel }).then((msg) => {
        console.log("Model loaded successfully with message:", msg);
      });
    }
  };

  const handleProcessFiles = async () => {
    if (!files || !llmName) {
      alert("Please select files and load a model.");
      return;
    }

    setLoading(true);

    for (const file of Array.from(files)) {
      const base64 = await fileToBase64(file);

      try {
        const result = await invoke<string>("infer_from_base64", {
          base64Data: base64,
          mimeType: file.type,
          filename: file.name,
        });

        console.log(`✅ [${file.name}] Result:`, result);
      } catch (err) {
        console.error(`❌ [${file.name}] Failed to process:`, err);
      }
    }

    setLoading(false);
    alert("All files processed!");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleOpenLink = async () => {
    try {
      await openUrl("https://coff.ee/arpeggiokou");
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <main className="relative flex flex-col gap-8 mx-auto w-screen h-screen items-center justify-center bg-neutral-900">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-bold text-white">
          Welcome to ITT Utility
        </h1>
        <p className="text-lg text-gray-400">
          PDF or IMAGE → TEXT with local OCR 👀
        </p>
      </div>
      <section>
        {llmName ? (
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold text-white">Selected LLM Model</h2>
            <div className="flex justify-between text-gray-300 text-sm font-mono p-4 border-2 border-gray-600 rounded-lg w-96">
              <span>{llmName}</span>
              <button
                onClick={() => setLlmName(null)}
                className="text-xs text-red-500"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleSelectLLM}
              className="px-16 py-4 font-semibold text-white bg-purple-500 rounded-md hover:bg-purple-600 cursor-pointer"
            >
              🤖 Select LLM
            </button>
          </div>
        )}
      </section>
      {llmName && (
        <section className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleUpload}
              className="px-16 py-4 font-semibold text-white bg-purple-500 rounded-md hover:bg-purple-600 cursor-pointer"
            >
              Upload PDF or Image Files
            </button>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
              }}
            />
          </div>
          {files && (
            <div className="flex flex-col gap-2">
              <div className="flex w-full justify-between">
                <h2 className="font-semibold text-white">Selected Files</h2>
                <button onClick={handleClear} className="text-xs text-red-500">
                  Clear all
                </button>
              </div>

              <div className="flex flex-col gap-2 p-4 border-2 border-gray-600 rounded-lg w-96 h-fit overflow-y-auto">
                {Array.from(files).map((file, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-gray-300 text-sm font-mono"
                  >
                    <span>{file.name}</span>
                    <button
                      onClick={() => handleRemove(file)}
                      className="text-xs text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {files && (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleProcessFiles}
                className="px-4 py-2 font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 cursor-pointer"
              >
                {loading ? "Processing..." : "Process Files"}
              </button>
            </div>
          )}
        </section>
      )}
      <span
        onClick={() => window.open("https://github.com/Yeet2042", "_blank")}
        className="flex items-center gap-2 bottom-4 text-xs text-gray-500 cursor-pointer"
      >
        <span>create by Yeet2042</span>
        <img
          onClick={handleOpenLink}
          src="https://uc767cae190ff919d709b96ee420.previews.dropboxusercontent.com/p/thumb/ACo7IKTEExvt6_eOdhIVQFZlgAwj_gelar8PSsWC5zm_ctMsq3nBdZkPnazfMboch6UP7rjnBWRyT6lLL25RbUrlg9psnX0oqHs7naRty6XagoAoLuA70vfafzqafTeDrmZzGo3bQmil7UDBMZb4fy8kYjTai0ADrB9zI25MCnYIkYCRmCHXqherF3c_4dWP4Sl-nqNCgKuI2meK3147hbb6RJe1nfCfOdsOycYC18jztHtgtwTGKSMFUluZM2TuUQ01Hn_i31eCF0alJDIB38fZs8znPKz6v7l5iWKOARJ9EsKpDaA5G1ooYGC95eLDgzl2naYDNgcaGbNxCXrC7VJHCxkF_fCTzuNhbX2uWNRqWg/p.png"
          className="w-24 h-full"
        />
      </span>
    </main>
  );
}
