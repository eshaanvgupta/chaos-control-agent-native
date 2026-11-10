# Bring your own key on the public site

The GitHub Pages edition now includes an optional browser AI analyst using the user's own OpenRouter or Groq key. Entering the command center prompts for a provider and key; users may continue with the deterministic simulation without AI. The AI button and contextual agent controls also open setup.

The key is validated directly with the selected provider, then its model list is loaded. Users choose the model explicitly. API calls go directly from the browser to a fixed HTTPS provider origin with no cookies or redirects. There is no app proxy, owner inference key, shared inference allowance, or app-imposed AI usage quota. Provider pricing, credits, access permissions and rate limits still apply. A request timeout protects the UI from stalled connections.

**We do not store or save API keys in this browser flow.** The key exists only in JavaScript memory while this tab's AI service is active. It never enters localStorage, sessionStorage, IndexedDB, URLs, app databases, query caches, analytics, logs, source, or prompts. Refresh, page exit, or Disconnect clears the app's reference and cancels active requests. JavaScript does not promise cryptographic memory erasure. Users' browsers/password managers or extensions are outside this application's control.

When the user requests analysis, their question and current mission snapshot, risks, recent plans and branches are sent to the selected provider. The dialog discloses this before connection; that provider's processing/retention policies apply. Conversation output remains in React memory, not browser project storage. Provider error bodies are not exposed, and the exact key is redacted from model output.

The browser analyst is read-only, using the actual deterministic records. It does not impersonate the native Agent-Native runtime, execute tools, approve plans, or mutate operational data. Numerical planning, review and execution remain in the existing UI. No AI request is made on mission launch unless the user explicitly requests analysis.

The full local/native app retains the original native agent and its provider settings. **That framework's provider dialog can save credentials**; the browser popup's no-storage promise does not describe native settings. Ollama remains the key-free local alternative. The public setup page makes this distinction visible.

Protocol references: [OpenRouter Chat Completions](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion) and [Groq compatibility](https://console.groq.com/docs/openai).
