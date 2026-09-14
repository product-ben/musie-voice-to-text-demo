import { useEffect, useState } from "react";
import { subscribeToToasts } from "../onSentenceFinal";

export function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToToasts((next) => {
      setMessage(next);
      window.setTimeout(() => setMessage(null), 1800);
    });
  }, []);

  if (!message) return null;
  return <div className="toast">{message}</div>;
}
