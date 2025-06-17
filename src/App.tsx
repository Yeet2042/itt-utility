import "./App.css";
import Button from "./components/button/Button";
import Input, { InputStatus } from "./components/input/Input";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BaseDirectory, basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { load, Store } from "@tauri-apps/plugin-store";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import LoadingIcons from "react-loading-icons";

interface FileProgress {
  file_path: string;
  status: string;
  result?: string;
  error?: string;
}

interface ProcessProgress {
  files: FileProgress[];
  current_task: string;
  completed: number;
  total: number;
}

export default function App() {
  const apiKeyRegex = /^sk-[a-zA-Z0-9]{48}$/;

  const [storeApiKey, setStoreApiKey] = useState<Store>();

  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [validApiKey, setValidApiKey] = useState(false);

  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] =
    useState<ProcessProgress | null>(null);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);

  useEffect(() => {
    loadApiKey();

    const unlisten = listen<ProcessProgress>("process_progress", (event) => {
      setProcessProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (apiKey.length === 0) {
      setApiKeyError("");
      setValidApiKey(false);
      removeApiKey();
      return;
    }

    if (apiKeyRegex.test(apiKey)) {
      setApiKeyError("");
      setValidApiKey(false);
      fetchCheckApiKey();
    } else {
      setApiKeyError("Invalid API key format.");
      setValidApiKey(false);
    }
  }, [apiKey]);

  const getFileStatus = (filePath: string) => {
    if (!processProgress) return "waiting";
    const fileProgress = processProgress.files.find(
      (f) => f.file_path === filePath,
    );
    return fileProgress?.status || "waiting";
  };

  const removeApiKey = async () => {
    try {
      if (storeApiKey) {
        await storeApiKey.set("apiKey", "");
      }
    } catch (error) {
      console.error("Failed to remove API key:", error);
    }
  };

  const loadApiKey = async () => {
    try {
      const storedApiKey = await load("apiKey.json");
      setStoreApiKey(storedApiKey);

      const key = await storedApiKey.get("apiKey");

      if (key) {
        setApiKey(key as string);
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
    }
  };

  const fetchCheckApiKey = async () => {
    try {
      const res = await fetch(
        "https://api.opentyphoon.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (res.status === 401) {
        setApiKeyError("Invalid API key.");
        setValidApiKey(false);
      } else {
        setApiKeyError("");
        setValidApiKey(true);

        if (storeApiKey) {
          await storeApiKey.set("apiKey", apiKey);
        }
      }
    } catch (error) {
      setApiKeyError(
        "Failed to validate API key. Please check your connection or try again later.",
      );
      setValidApiKey(false);
    }
  };

  const handleSelectFiles = async () => {
    try {
      const selectedFiles = await open({
        multiple: true,
        filters: [
          {
            name: "Images and PDFs",
            extensions: ["png", "jpg", "jpeg", "pdf"],
          },
        ],
      });

      if (selectedFiles) {
        setFilePaths(selectedFiles);

        selectedFiles.map(async (filePath) => {
          const fileName = await basename(filePath);
          setFileNames((prev) => [...prev, fileName]);
        });
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error);
    }
  };

  const handleClearAllFiles = () => {
    if (processing) {
      return;
    } else {
      setFilePaths([]);
      setFileNames([]);
    }
  };

  const handleProcessFiles = async () => {
    if (!validApiKey) {
      setApiKeyError("Please enter a valid API key.");
      return;
    }
    if (filePaths.length === 0) {
      setApiKeyError("Please select at least one file to process.");
      return;
    }
    setProcessing(true);
    setApiKeyError("");
    setProcessProgress(null);

    try {
      const processRes: string = await invoke("process_files", {
        apiKey,
        filePaths,
      });

      const resultArray = processRes.split("\n\n---\n\n");

      setProcessedFiles(resultArray);

      resultArray.map(async (filePath) => {
        const fileName = await basename(filePath);
        setProcessedFileNames((prev) => [...prev, fileName]);
      });

      console.log("Files processed successfully:", processedFiles);
    } catch (error) {
      console.error("Failed to process files:", error);
      setApiKeyError("Failed to process files. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveAllFiles = async () => {
    if (processedFiles.length === 0) {
      return;
    }

    try {
      const saveDir = await open({
        directory: true,
        multiple: false,
        title: "Select a directory to save processed files",
      });

      if (!saveDir) {
        console.error("No directory selected for saving files.");
        return;
      } else {
        for (const filePath of processedFiles) {
          const fileName = await basename(filePath);
          await copyFile(filePath, `${saveDir}/${fileName}`);
        }
      }

      console.log("Files saved successfully.");
    } catch (error) {
      console.error("Failed to save files:", error);
    }
  };

  const handleSaveFile = async (fileName: string) => {
    if (!fileName) {
      console.error("No file name provided for saving.");
      return;
    }

    try {
      const saveDir = await open({
        directory: true,
        multiple: false,
        title: "Select a directory to save the file",
      });

      if (!saveDir) {
        console.error("No directory selected for saving the file.");
        return;
      }

      const filePath = processedFiles.find((file) => file.includes(fileName));

      if (!filePath) {
        console.error("No file found for the given file name.");
        return;
      }

      await copyFile(filePath, `${saveDir}/${fileName}`);

      console.log(`File ${fileName} saved successfully.`);
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const handleOpenTyphoonLink = async () => {
    try {
      await openUrl(
        "https://playground.opentyphoon.ai/user/login?next=%2Fplayground",
      );
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const handleOpenBuyCoffeeLink = async () => {
    try {
      await openUrl("https://coff.ee/arpeggiokou");
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <AnimatePresence>
      <motion.main className="relative flex flex-col gap-8 mx-auto py-16 w-screen h-screen items-center justify-center bg-neutral-900 text-white overflow-scroll">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold text-white">
            Welcome to ITT Utility
          </h1>
          <p className="text-lg text-gray-400">
            PDF or IMAGE → TEXT with TyphoonOCR 👀
          </p>
        </div>
        <section className="flex flex-col gap-8 w-full px-32">
          <Input
            label="Typhoon API Key"
            enableInfo
            onInfo={handleOpenTyphoonLink}
            inputIcon={<KeyRoundedIcon className="text-white" />}
            placeholder="Enter your Typhoon API key"
            inputType="password"
            value={apiKey}
            onChange={setApiKey}
            caption={
              apiKeyError
                ? apiKeyError
                : apiKeyRegex.test(apiKey)
                  ? "Your API key is valid."
                  : "Please enter your Typhoon API key."
            }
            status={
              apiKeyError
                ? InputStatus.Error
                : apiKeyRegex.test(apiKey)
                  ? InputStatus.Success
                  : InputStatus.Default
            }
          />

          {validApiKey && filePaths.length === 0 && (
            <div className="flex w-full items-center justify-center">
              <button
                onClick={handleSelectFiles}
                className="flex flex-col items-center justify-center w-96 h-32 border-2 border-dashed border-gray-500 rounded-2xl cursor-pointer hover:bg-neutral-800 transition-colors"
              >
                <span className="text-neutral-300 text-sm">
                  Click to select or drop your images or PDF files
                </span>
              </button>
            </div>
          )}

          {filePaths.length > 0 && fileNames.length > 0 && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <h2>Selected Files</h2>
                  {!processing && (
                    <button
                      onClick={handleSelectFiles}
                      className="text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                    >
                      <AddRoundedIcon />
                    </button>
                  )}
                </div>
                {!processing && (
                  <button
                    onClick={handleClearAllFiles}
                    className="text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    remove all
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4 border-2 border-gray-500 rounded-2xl p-4 w-full max-h-[200px] overflow-scroll">
                {fileNames.map((fileName, index) => {
                  const fileStatus = getFileStatus(filePaths[index]);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {fileStatus === "processing" && (
                          <span className="text-yellow-500 animate-pulse text-sm">
                            Processing
                          </span>
                        )}
                        {fileStatus === "completed" && (
                          <span className="text-green-500 text-sm">
                            Completed
                          </span>
                        )}
                        {fileStatus === "error" && (
                          <span className="text-red-500 text-sm">Error</span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">{fileName}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (processing) {
                            return;
                          } else {
                            setFilePaths((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                            setFileNames((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                          }
                        }}
                        className="text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        remove
                      </button>
                    </div>
                  );
                })}
              </div>
              <Button
                startIcon={
                  processing && (
                    <LoadingIcons.TailSpin className="text-gray-400 h-4 w-4" />
                  )
                }
                color="base"
                onClick={handleProcessFiles}
              >
                Process OCR
              </Button>
            </div>
          )}

          {processedFiles.length > 0 && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <h2>Processed Files</h2>
                </div>
                <button
                  onClick={handleSaveAllFiles}
                  className="text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  Save all
                </button>
              </div>
              <div className="flex flex-col gap-4 border-2 border-gray-500 rounded-2xl p-4 w-full max-h-[200px] overflow-scroll">
                {processedFileNames.map((fileName, index) => {
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">{fileName}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveFile(fileName)}
                        className="text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        save
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
        <span
          onClick={() => window.open("https://github.com/Yeet2042", "_blank")}
          className="flex items-center gap-2 bottom-4 text-xs text-gray-500 cursor-pointer"
        >
          <span>create by Yeet2042</span>
          <img
            onClick={handleOpenBuyCoffeeLink}
            src="https://uc767cae190ff919d709b96ee420.previews.dropboxusercontent.com/p/thumb/ACo7IKTEExvt6_eOdhIVQFZlgAwj_gelar8PSsWC5zm_ctMsq3nBdZkPnazfMboch6UP7rjnBWRyT6lLL25RbUrlg9psnX0oqHs7naRty6XagoAoLuA70vfafzqafTeDrmZzGo3bQmil7UDBMZb4fy8kYjTai0ADrB9zI25MCnYIkYCRmCHXqherF3c_4dWP4Sl-nqNCgKuI2meK3147hbb6RJe1nfCfOdsOycYC18jztHtgtwTGKSMFUluZM2TuUQ01Hn_i31eCF0alJDIB38fZs8znPKz6v7l5iWKOARJ9EsKpDaA5G1ooYGC95eLDgzl2naYDNgcaGbNxCXrC7VJHCxkF_fCTzuNhbX2uWNRqWg/p.png"
            className="w-24 h-full"
          />
        </span>
      </motion.main>
    </AnimatePresence>
  );
}
