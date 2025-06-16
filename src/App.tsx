import "./App.css";
import Input, { InputStatus } from "./components/input/input";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import { openUrl } from "@tauri-apps/plugin-opener";
import { load, Store } from "@tauri-apps/plugin-store";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function App() {
  const apiKeyRegex = /^sk-[a-zA-Z0-9]{48}$/;

  const [storeApiKey, setStoreApiKey] = useState<Store>();

  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [validApiKey, setValidApiKey] = useState(false);

  useEffect(() => {
    loadApiKey();
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
      <motion.main className="relative flex flex-col gap-8 mx-auto w-screen h-screen items-center justify-center bg-neutral-900 text-white">
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

          {validApiKey && (
            <div className="flex w-full items-center justify-center">
              <button className="flex flex-col items-center justify-center w-96 h-32 border-2 border-dashed border-gray-500 rounded-2xl cursor-pointer hover:bg-neutral-800 transition-colors">
                <span className="text-neutral-300 text-sm">
                  Click to select or drop your images or PDF files
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
            src="https://uc767cae190ff919d709b96ee420.previews.dropboxusercontent.com/p/thumb/ACo7IKTEExvt6_eOdhIVQFZlgAwj_gelar8PSsWC5zm_ctMsq3nBdZkPnazfMboch6UP7rjnBWRyT6lLL25RbUrlg9psnX0oqHs7naRty6XagoAoLuA70vfafzqafTeDrmZzGo3bQmil7UDBMZb4fy8kYjTai0ADrB9zI25MCnYIkYCRmCHXqherF3c_4dWP4Sl-nqNCgKuI2meK3147hbb6RJe1nfCfOdsOycYC18jztHtgtwTGKSMFUluZM2TuUQ01Hn_i31eCF0alJDIB38fZs8znPKz6v7l5iWKOARJ9EsKpDaA5G1ooYGC95eLDgzl2naYDNgcaGbNxCXrC7VJHCxkF_fCTzuNhbX2uWNRqWg/p.png"
            className="w-24 h-full"
          />
        </span>
      </motion.main>
    </AnimatePresence>
  );
}
