## Runtime Prototypes

This directory is the isolated prototype lane for runtime experiments.

### Boundary

- Prototype code stays inside `runtime-prototypes/`.
- Private provider protocol details stay out of `frontend/`, `backend/`, and `docs/contracts/`.
- Successful prototype findings can inform the mainline later, but code here does not flow into the mainline directly.

### Included in TASK-20260424-007

- `shared/`: lightweight helpers reused by multiple prototypes.
- `qwenpaw-chat/`: a Vue 3 + Vite chat page that talks to QwenPaw directly for stream validation.

### Local setup

1. Copy `qwenpaw-chat/.env.example` to `.env.local`.
2. Fill in the QwenPaw target, endpoint path, and auth header value.
3. Run `npm install`.
4. Run `npm run dev`.

### Notes

- The default request payload assumes an OpenAI-style streaming endpoint.
- If the local QwenPaw runtime uses a different private format, update only the prototype env values or the prototype client in `shared/qwenpaw-client.ts`.
