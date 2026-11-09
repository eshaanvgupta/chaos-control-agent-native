# Actual AI runtime

Model interactions run through the original Agent-Native chat bridge, AgentKit controller, model settings and native agent tool loop. The application contains no inline provider call and no canned replacement for chat. Every operation tool is callable without a model through the same UI actions.

**Builder.io:** open Workspace settings → Model (the framework route `/settings/model`), choose Builder.io and follow its supported connection flow. A connected development account is not automatically a free public inference grant. Credits, eligibility and limits depend on the actual account. If the connection fails or credits expire, use the deterministic workflow and follow the native setup/error state.

**Optional local Ollama:** install Ollama, run `ollama serve`, and pull a tool-capable openly available model that fits your hardware (for example `ollama pull qwen3:8b`). Choose the framework's Ollama provider and that installed model in Model settings. The installed framework includes `ai-sdk-ollama` and the `ai-sdk:ollama` engine. Its default endpoint is `http://127.0.0.1:11434`; `OLLAMA_BASE_URL` can change the deployment-level endpoint. Do not expose an unauthenticated Ollama server publicly. A hosted server's loopback is not your laptop. No model weights are downloaded automatically by this app.

**Observed verification boundary:** the provider-independent tools are tested. A live Builder/Ollama tool-calling conversation has not been asserted successful without a configured provider. Native chat displays the actual setup requirement or error. The UI explicitly labels deterministic specialist tools.

Suggested real model demonstration after connection: select `WH-WEST` in Operations World and ask, “Why is this warehouse at risk? Read view-screen and inspect operational state. Find the cheapest feasible response and compare it with the fastest. Do not execute until I approve.” Inspect the visible real tool events, approve in Strategy Lab, then ask the agent to apply that approved plan and verify the new state.
