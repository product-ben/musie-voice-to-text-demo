/**
 * Deliberately specific rather than reassuring: OpenAI does retain Realtime
 * audio for up to 30 days for abuse monitoring. Saying otherwise would be wrong.
 */
export function PrivacyNote() {
  return (
    <details className="disclosure">
      <summary>What happens to your voice and text?</summary>
      <ul>
        <li>
          <strong>In this app:</strong> transcripts stay in your browser's memory only. They
          are never sent anywhere else, never saved to a server, and disappear when you
          reload or close the tab. There is no database and no account.
        </li>
        <li>
          <strong>Your audio:</strong> streamed to OpenAI to be transcribed. It is not kept
          as part of the service — but it <strong>is</strong> retained for up to{" "}
          <strong>30 days</strong> in OpenAI's abuse-monitoring logs, which is their default
          for all API traffic. It is not stored permanently.
        </li>
        <li>
          <strong>Training:</strong> data sent through the OpenAI API is{" "}
          <strong>not</strong> used to train their models, unless the account explicitly
          opts in.
        </li>
        <li>
          <strong>Identity:</strong> this demo sends no user ID, name, or account
          information — OpenAI has no way to tell who is speaking. The request is still
          linked to the <em>API key's organisation</em>, so it is anonymous as to the
          speaker, not anonymous overall.
        </li>
      </ul>
      <p className="disclosure-source">
        Based on OpenAI's{" "}
        <a
          href="https://developers.openai.com/api/docs/guides/your-data"
          target="_blank"
          rel="noreferrer"
        >
          data controls documentation
        </a>{" "}
        for <code>/v1/realtime</code>, checked 14 September 2026.
      </p>
    </details>
  );
}
