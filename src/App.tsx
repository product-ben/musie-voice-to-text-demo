import { useState } from "react";
import { SESSION_SECONDS, type LanguageChoice } from "./config";
import { useTranscription } from "./hooks/useTranscription";
import { Transcript } from "./components/Transcript";
import { Toast } from "./components/Toast";
import { ErrorBanner } from "./components/ErrorBanner";
import { LanguageToggle } from "./components/LanguageToggle";
import { MicIndicator } from "./components/MicIndicator";
import { PrivacyNote } from "./components/PrivacyNote";

// sessionStorage, not localStorage: the key dies when the tab closes.
const KEY_STORAGE = "openai-api-key";

export function App() {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [language, setLanguage] = useState<LanguageChoice>("de");
  const { status, sentences, interim, error, warning, level, speaking, secondsLeft, start, stop } =
    useTranscription();

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
        <span className="field-label">Language</span>
        <LanguageToggle value={language} onChange={setLanguage} disabled={isRunning} />
      </section>

      <section className="panel">
        <div className="row">
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
          <span className="countdown">{secondsLeft}s</span>
          <MicIndicator status={status} level={level} speaking={speaking} />
        </div>
        {!apiKey && <p className="note">Enter an API key to enable recording.</p>}
      </section>

      {error && <ErrorBanner message={error} />}
      {warning && <ErrorBanner message={warning} variant="warning" />}

      <Transcript sentences={sentences} interim={interim} />

      <p className="note">Recording stops automatically after {SESSION_SECONDS} seconds.</p>

      <PrivacyNote />
      <Toast />
    </main>
  );
}
