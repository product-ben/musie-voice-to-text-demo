import { useEffect, useId, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { MusyTooltipProvider } from "../../reference/musie260917/components/IconButton";
import { Switch } from "../../reference/musie260917/components/Switch";
import { CtaButton } from "../../reference/musie260917/components/CtaButton";
import { Message } from "../../reference/musie260917/components/Message";

// Load order is the system's: foundations, then the staged token gaps, then
// components. Nothing here is overridden; musie.css only arranges them.
import "../../reference/musie260917/tokens/musy-foundations.css";
import "../../reference/musie260917/tokens/musy-foundations-amendments.css";
import "../../reference/musie260917/components/musy-components.css";
import "../musie/musie.css";

import { DEFAULT_MODEL, type LanguageChoice, type TranscriptionModel } from "../config";
import { useTranscription } from "../hooks/useTranscription";
import { MusieRules } from "../musie/MusieRules";
import { MusieTranscriptWorkspace } from "../musie/MusieTranscriptWorkspace";
import { useMusyTheme } from "../musie/theme";

/**
 * The same sessionStorage names the wizard on the Demo page uses, so a key
 * typed on either page works on both. Deliberately duplicated rather than
 * exported: this page must be addable and removable without editing the
 * existing one.
 */
const KEY_STORAGE = "openai-api-key";
const MODEL_STORAGE = "transcription-model";
const LANGUAGE_STORAGE = "transcription-language";

/** Space Grotesk and Inter, which the type tokens name. Loaded from here so
 *  the document shell stays untouched and the other pages fetch nothing. */
const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700" +
  "&family=Space+Grotesk:wght@400;500;700&display=swap";

function useMusyFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS;
    document.head.appendChild(link);
  }, []);
}

export function Musie({ rules = false }: { rules?: boolean } = {}) {
  useMusyFonts();
  const [theme, toggleTheme] = useMusyTheme();
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const keyId = useId();

  const session = useTranscription();
  const model = (sessionStorage.getItem(MODEL_STORAGE) as TranscriptionModel) || DEFAULT_MODEL;
  const language = (sessionStorage.getItem(LANGUAGE_STORAGE) as LanguageChoice) || "de";

  function saveKey(value: string) {
    setApiKey(value);
    sessionStorage.setItem(KEY_STORAGE, value);
  }

  return (
    <MusyTooltipProvider>
      {/* data-theme on the wrapper, not <html>: every token is declared on
          `:root, [data-theme]`, so this subtree recomputes light-dark() on its
          own while the rest of the demo keeps its plain styling. */}
      <div className="musie-page" data-theme={theme}>
        {/* A title and its subtitle: --space-gap-related, per §5. */}
        <div className="musie-intro">
          <header className="musie-page__head">
            <h1 className="musie-page__title" data-type-step="heading-lg">
              {rules ? "Layout rules — the decisions" : "The transcript workspace, in Musy"}
            </h1>
            <Switch
              label={theme === "dark" ? "Dark" : "Light"}
              reverse
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              onGlyph={Moon}
              offGlyph={Sun}
            />
          </header>

          <p className="musie-prose" data-type-step="body-md">
            {rules
              ? "Each decision behind Layer 3, as the side-by-side that settled it. " +
                "The rules themselves are in reference/musie260917/docs/10-layout.md."
              : "The same component as on the Demo page, with the same hooks behind it. " +
                "Every part you can see is a released Musy component — Record Button, " +
                "Content Box, Message, Switch, CTA Button, Icon Button, Badge — and the " +
                "only CSS written for this page is the layout between them, in tokens."}
          </p>
        </div>

        {rules ? (
          <MusieRules />
        ) : (
          <>
            {/* The field and the message explaining why it matters are one
                molecule: --space-gap-stack between them, per §5. */}
            <div className="musie-key">
              <div className="musy-field">
                <label className="musy-field__label" htmlFor={keyId}>
                  OpenAI API key
                </label>
                <input
                  id={keyId}
                  type="password"
                  className="musy-field__control"
                  value={apiKey}
                  autoComplete="off"
                  placeholder="sk-…"
                  onChange={(event) => saveKey(event.target.value)}
                  data-filled={apiKey ? "" : undefined}
                />
                <p className="musy-field__description">
                  Kept in this browser tab only and sent only to api.openai.com. Shared
                  with the Demo page, so entering it once is enough.
                </p>
              </div>

              {!apiKey && (
                <Message
                  variant="info"
                  headline="Add a key to record"
                  text="Recording is disabled until a key is entered. Everything else on the page is live — the layout, the theme, and the editing controls once statements exist."
                />
              )}
            </div>

            <MusieTranscriptWorkspace
              session={session}
              canRecord={Boolean(apiKey)}
              onStart={(options) =>
                session.start(apiKey, model, language, "silence", options)
              }
            />
          </>
        )}

        <footer className="musie-row">
          <CtaButton
            variant="ghost"
            render={<a href="#/" />}
          >
            Back to the plain demo
          </CtaButton>
        </footer>
      </div>
    </MusyTooltipProvider>
  );
}
