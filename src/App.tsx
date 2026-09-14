import { useState } from "react";
import { LANGUAGE_OPTIONS, SESSION_SECONDS, type LanguageChoice } from "./config";
import { useTranscription } from "./hooks/useTranscription";
import { Transcript } from "./components/Transcript";
import { Toast } from "./components/Toast";
import { ErrorBanner } from "./components/ErrorBanner";

// sessionStorage, not localStorage: the key dies when the tab closes.
const KEY_STORAGE = "openai-api-key";

export function App() {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [language, setLanguage] = useState<LanguageChoice>("de");
  const { status, sentences, interim, error, secondsLeft, start, stop } = useTranscription();

  const isRunning = status !== "idle";

  function saveKey(value: string) {
    setApiKey(value);
    sessionStorage.setItem(KEY_STORAGE, value);
  }

  function forgetKey() {
    setApiKey("");
    sessionStorage.removeItem(KEY_STORAGE);
  }

  return (
    <main>
      <h1>Live Speech to Text</h1>

      <section className="panel">
        <label htmlFor="apiKey">OpenAI API key</label>
        <div className="row">
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(event) => saveKey(event.target.value)}
            placeholder="sk-..."
            disabled={isRunning}
            autoComplete="off"
          />
          <button type="button" onClick={forgetKey} disabled={isRunning || !apiKey}>
            Forget key
          </button>
        </div>
        <p className="note">
          Kept in memory for this browser tab only and sent only to api.openai.com. It is never
          stored on a server or committed to the repository. Use a key with a low spending limit
          and revoke it when you are done.
        </p>
      </section>

      <section className="panel">
        <label htmlFor="language">Language</label>
        <div className="row">
          <select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as LanguageChoice)}
            disabled={isRunning}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {isRunning ? (
            <button type="button" onClick={stop} className="primary">
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => start(apiKey, language)}
              className="primary"
              disabled={!apiKey}
            >
              Start
            </button>
          )}

          <span className="countdown">
            {status === "connecting" ? "Connecting…" : `${secondsLeft}s`}
          </span>
        </div>
        {!apiKey && <p className="note">Enter an API key to enable recording.</p>}
      </section>

      {error && <ErrorBanner message={error} />}

      <Transcript sentences={sentences} interim={interim} />

      <p className="note">
        Recording stops automatically after {SESSION_SECONDS} seconds.
      </p>

      <Toast />
    </main>
  );
}
