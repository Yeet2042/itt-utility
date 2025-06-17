import "./App.css";
import Button from "./components/button/Button";
import Input, { InputStatus } from "./components/input/Input";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { basename } from "@tauri-apps/api/path";
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

  const getCompletedFiles = () => {
    if (!processProgress) return [];
    return processProgress.files.filter(
      (f) => f.status === "completed" && f.result,
    );
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
      setProcessProgress(null);
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
      const res = await invoke("process_files", {
        apiKey,
        filePaths,
      });

      if (typeof res === "string") {
        console.error("Error processing files:", res);
        setProcessing(false);
        return;
      }

      console.log("Processing completed successfully");
    } catch (error) {
      console.error("Failed to process files:", error);
      setApiKeyError("Failed to process files. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveAllCompletedFiles = async () => {
    const completedFiles = getCompletedFiles();
    if (completedFiles.length === 0) {
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
      }

      for (const fileProgress of completedFiles) {
        if (fileProgress.result) {
          const fileName = await basename(fileProgress.result);
          await copyFile(fileProgress.result, `${saveDir}/${fileName}`);
        }
      }

      console.log("Files saved successfully.");
    } catch (error) {
      console.error("Failed to save files:", error);
    }
  };

  const handleSaveFile = async (filePath: string) => {
    if (!processProgress) return;

    const fileProgress = processProgress.files.find(
      (f) => f.file_path === filePath,
    );
    if (
      !fileProgress ||
      fileProgress.status !== "completed" ||
      !fileProgress.result
    ) {
      console.error("File not completed or result not available.");
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

      const fileName = await basename(fileProgress.result);
      await copyFile(fileProgress.result, `${saveDir}/${fileName}`);

      console.log(`File ${fileName} saved successfully.`);
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const handleResetAll = () => {
    setFilePaths([]);
    setFileNames([]);
    setProcessing(false);
    setProcessProgress(null);
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
                {filePaths.map((filePath, index) => {
                  const fileStatus = getFileStatus(filePath);
                  const fileName = fileNames[index];
                  const canSave = fileStatus === "completed";

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {fileStatus === "processing" && (
                          <LoadingIcons.TailSpin className="text-yellow-500 h-4 w-4" />
                        )}
                        {fileStatus === "completed" && (
                          <span className="text-green-500 text-sm">
                            ✓ Completed
                          </span>
                        )}
                        {fileStatus === "error" && (
                          <span className="text-red-500 text-sm">✗ Error</span>
                        )}
                        {fileStatus === "waiting" && (
                          <span className="text-gray-500 text-sm">Waiting</span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">{fileName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canSave && (
                          <button
                            onClick={() => handleSaveFile(filePath)}
                            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-200 transition-colors cursor-pointer"
                          >
                            <SaveRoundedIcon className="h-4 w-4" />
                            save
                          </button>
                        )}
                        {!processing && (
                          <button
                            onClick={() => {
                              setFilePaths((prev) =>
                                prev.filter((_, i) => i !== index),
                              );
                              setFileNames((prev) =>
                                prev.filter((_, i) => i !== index),
                              );
                            }}
                            className="text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                          >
                            remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  startIcon={
                    processing && (
                      <LoadingIcons.TailSpin className="text-gray-400 h-4 w-4" />
                    )
                  }
                  color="base"
                  onClick={handleProcessFiles}
                  disabled={processing}
                >
                  {processing ? "Processing..." : "Process OCR"}
                </Button>
                {getCompletedFiles().length > 0 && (
                  <button
                    onClick={handleSaveAllCompletedFiles}
                    className="text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    Save All ({getCompletedFiles().length})
                  </button>
                )}
              </div>
            </div>
          )}

          {processProgress && processProgress.completed > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(processProgress.completed / processProgress.total) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-400">
                {processProgress.completed} of {processProgress.total} files
                completed
              </span>
              <span className="text-xs text-gray-500">
                {processProgress.current_task}
              </span>
              <button onClick={handleResetAll}>
                <span className="text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
                  Reset All
                </span>
              </button>
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
            src="/coffee.png"
            className="w-24 h-full"
          />
        </span>
      </motion.main>
    </AnimatePresence>
  );
}
