# RelayWorks — AI operator marketplace

A portable React/Vite storefront for hiring focused AI operators. Each agent has a dedicated profile, separate locally saved chat history, an agent-specific server-side prompt, and a real OpenAI Responses API gateway.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:4173`.

For a production-like local server:

```powershell
npm run build
npm start
```

Open `http://localhost:8080`.

Or, just double-click `START LOCAL.cmd` on Windows.

## What is implemented

- Original dark-lilac visual direction, an original generated hero visual, and six provided operator portraits.
- Landing page, browse/filter experience, six agent profile pages, responsive layout, and focused chat workspaces.
- Dedicated per-agent system prompts in `src/data.ts`.
- The chat calls the real OpenAI Responses API when `OPENAI_API_KEY` is configured. There is no canned reply fallback: without a key, the UI explains what needs configuring.
- A unique conversation is maintained per operator in the browser, including a compact history panel. The server uses the prior response ID while it is running and can reconstruct the visible history after a restart.
- Dockerfile for VPS deployment.

## Enable real chat

The local ChatGPT/Codex assistant cannot be exposed as a production web endpoint or created as a new Codex task from a public browser page. This implementation uses your own server-side OpenAI API key instead. The selected operator's context is kept on the server and re-sent for every turn.

Copy `.env.example` to `.env`, set `OPENAI_API_KEY`, and restart `npm start`. The default model is `gpt-5`; change `OPENAI_MODEL` only if your API project uses a different model. Keep `.env` private: it is already ignored by Git.

When Hermes is ready, replace only the OpenAI call inside `server/server.mjs` with Hermes's gateway contract; the UI, operator context and conversation history are deliberately independent from that provider.

For the VPS, copy the project folder, add a real `.env`, and run `docker compose up --build -d`. Put HTTPS, authentication, rate limits and connector OAuth callbacks behind your reverse proxy before making the marketplace public.

## Customising the roster

Update `src/data.ts` to add roles, skills, connector badges and system prompts. Add each portrait under `public/agents/` and point the new record's `image` field at it.
