import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { useState, useRef, useEffect } from "react";

export default function App() {
  const [llm, setLlm] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (llm) {
      handleUploadModel(llm);
    }
  }, [llm]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList) => {
    setFiles(files);
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

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

  const handleUploadModel = async (file: File) => {
    try {
      // ใช้ FileReader แทน
      const data = await new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          resolve(new Uint8Array(arrayBuffer));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });

      await mkdir("models", {
        baseDir: BaseDirectory.AppLocalData,
        recursive: true,
      });

      await writeFile(`models/${file.name}`, data, {
        baseDir: BaseDirectory.AppLocalData,
      });

      console.log(`ไฟล์ ${file.name} ถูกบันทึกสำเร็จ`);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึกไฟล์:", error);
    }
  };

  // const handleProcess = async () => {
  //   setLoading(true);

  //   if (!llm || !files) {
  //     alert("Please upload a LLM model and files first.");
  //     setLoading(false);
  //     return;
  //   }

  //   try {
  //     for (const file of Array.from(files)) {
  //       const base64 = await toBase64(file);
  //       const result = await invoke("process_file", {
  //         base64,
  //         filename: file.name,
  //       });
  //       console.log("LLM result:", result);
  //     }
  //     alert("🎉 Files processed successfully!");
  //   } catch (e) {
  //     alert("❌ Failed to process");
  //   }
  //   setLoading(false);
  // };

  return (
    <main className="relative flex flex-col gap-8 mx-auto w-screen h-screen items-center justify-center bg-neutral-900">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-bold text-white">
          Welcome to ITT Utility
        </h1>
        <p className="text-lg text-gray-400">
          PDF or IMAGE -&gt; TEXT with local OCR 🦙
        </p>
      </div>

      <section>
        {!llm && (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleUpload}
              className="px-16 py-4 font-semibold text-white bg-purple-500 rounded-md hover:bg-purple-600 cursor-pointer"
            >
              🤖 Upload LLM Model
            </button>
            <input
              type="file"
              accept=".bin,.json"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  setLlm(e.target.files[0]);
                }
              }}
            />
          </div>
        )}
        {llm && (
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold text-white">Selected LLM Model</h2>
            <div className="flex justify-between text-gray-300 text-sm font-mono p-4 border-2 border-gray-600 rounded-lg w-96">
              <span>{llm.name}</span>
              <button
                onClick={() => setLlm(null)}
                className="text-xs text-red-500"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </section>

      {llm && (
        <section>
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
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    alert("Files processed successfully!");
                    handleClear();
                  }, 2000);
                }}
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
        className="absolute bottom-4 text-xs text-gray-500 cursor-pointer"
      >
        create by Yeet2042
      </span>
    </main>
  );
}
