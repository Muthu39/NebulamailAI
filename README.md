# Nebula Mail AI

Nebula Mail AI is a Gmail-like workspace for real Google mail. It uses Google OAuth and the Gmail API for mailbox data, message details, read-state changes, and sending. A natural-language assistant controls the same UI through validated tool calls; it does not invent or hardcode email results.

## Features

- Google OAuth account connection with account chooser support
- Signed, encrypted, `httpOnly` session cookie
- Real Gmail Inbox and Sent views
- Gmail search syntax, sender, keyword, date-range, and unread filters
- Previous and Next page navigation using Gmail page tokens
- Full message detail view with MIME text/HTML extraction and sanitization
- Opening a message marks it read through Gmail
- Compose, reply, and real Gmail sending
- Explicit confirmation before assistant-created mail is sent
- AI actions for navigation, search, opening, composing, replying, and sending
- Light/dark themes, density setting, responsive layout, account panel, and settings panel
- Optional Gmail Pub/Sub webhook and SSE refresh notifications
- Request cancellation and latest-request-wins mailbox updates to prevent stale pages or errors

## Requirements

- Node.js 20 or newer
- A Google Cloud project with the Gmail API enabled
- A Google OAuth 2.0 Web application client
- A Groq API key for the assistant
- A public HTTPS deployment for production OAuth and Pub/Sub webhooks

## Quick Start

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select **Connect Gmail**, choose a Google account, approve the requested permissions, and return to the Inbox.

Run the available checks with:

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## How To Run Locally

1. Install Node.js 20 or newer and verify it is available:

  ```powershell
  node --version
  npm --version
  ```

2. Install dependencies and create the local environment file:

  ```powershell
  npm install
  Copy-Item .env.example .env.local
  ```

3. Create a Google OAuth Web application client and add this local callback URL:

  ```text
  http://localhost:3000/api/auth/callback
  ```

4. Fill in `.env.local` with the Google credentials, matching callback URL, a long session secret, and the Groq key.
5. Start the app:

  ```powershell
  npm run dev
  ```

6. Open [http://localhost:3000](http://localhost:3000), select **Connect Gmail**, choose an authorized Google account, and approve access.

If port 3000 is occupied, Next.js may choose another port. Use the URL printed in the terminal and make the OAuth redirect URI match that port. Stop the server with `Ctrl+C`. Environment changes require a restart.

For a production-like local check:

```powershell
npm run build
npm run start
```

The local app requires real OAuth credentials to load mail. It intentionally shows an empty connection state instead of fake messages when Gmail is not connected.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. Never commit `.env.local` or expose these values in browser code.

```dotenv
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
NEXTAUTH_SECRET=use-a-long-random-secret
GMAIL_PUBSUB_TOPIC=projects/your-project/topics/nebula-mail-gmail
GMAIL_WEBHOOK_SECRET=use-a-long-random-webhook-secret
```

`GROQ_API_KEY` enables the assistant. Gmail itself does not require the AI key. `GMAIL_PUBSUB_TOPIC` and `GMAIL_WEBHOOK_SECRET` are only needed for realtime mailbox updates.

## Google OAuth Setup

### Local development

1. Create or select a Google Cloud project.
2. Enable **Gmail API**.
3. Configure the OAuth consent screen as **External**.
4. Add the following authorized redirect URI to the OAuth Web client:

   ```text
   http://localhost:3000/api/auth/callback
   ```

5. While the consent screen is in **Testing**, add every account that will test the app under **Test users**.
6. Put the client ID, client secret, and matching redirect URI in `.env.local`.
7. Restart the development server after changing environment variables.

### Public deployment

For a deployed URL such as `https://lithish.vercel.app`, set the Vercel environment variable to:

```dotenv
GOOGLE_REDIRECT_URI=https://lithish.vercel.app/api/auth/callback
```

Add that exact URL to the Google OAuth client’s authorized redirect URIs. The login and callback routes use the same configured URI, so the value must match exactly.

The website can be hosted on a Vercel subdomain. A custom domain is not required for the redirect URI, but Google may require an application domain, privacy policy, and verification before publishing sensitive Gmail scopes for unrestricted users. During Testing, only Google accounts listed as test users can authorize the app. This restriction is enforced by Google and cannot be bypassed by the application.

After updating Vercel environment variables, redeploy:

```powershell
vercel --prod
```

## User Guide

### Connect and switch accounts

Select **Connect Gmail** or the account control. Google’s account chooser is requested on every login. To switch accounts, sign out from the account panel, then connect Gmail again and choose another account.

The app receives only the account’s OAuth-authorized Gmail data. It never uses a shared master mailbox or bundled sample emails.

### Mailbox navigation

- **Inbox** requests Gmail messages with the `INBOX` label.
- **Sent** requests Gmail messages with the `SENT` label.
- Each page replaces the previous page rather than appending results.
- **Previous page** and **Next page** use opaque Gmail page tokens for the active view and filter query.
- Refresh, filter, search, and navigation cancel older mailbox requests so an old response cannot overwrite the current page.

### Search and filters

Press Enter in the search field to send a Gmail search query. The UI also supports unread-only, sender, keyword, after-date, before-date, Today, Last 30 days, Last year, and All time filters.

Filters are converted into Gmail query operators by `buildGmailQuery`. The AI assistant uses the same state and query path as the manual UI.

### Message details

Selecting a message requests its full MIME payload. The app extracts plain text and HTML content, sanitizes HTML with DOMPurify, displays the message, and removes Gmail’s `UNREAD` label.

### Compose, reply, and send

1. Select **Compose** or **Reply**.
2. Enter or edit the recipient, subject, and body.
3. Select **Send**.
4. The backend validates the payload and sends it through Gmail.

An assistant request that creates a message only opens and populates the compose state. The assistant displays a confirmation card; the user must explicitly confirm before `/api/gmail/send` is called.

### AI assistant

The assistant is available on the right on desktop and as a responsive panel on smaller screens. Example requests:

```text
Go to inbox
Go to sent
Show unread emails
Show emails from sarah@example.com
Show emails between 2026-08-01 and 2026-08-31
Find emails about the project update
Open the latest email
Compose an email
Reply to this
Send an email to john@example.com with subject Meeting and body Let us meet at 3pm
```

The browser does not execute arbitrary model-generated code. It accepts only server-validated, allowlisted tool calls and maps them to typed UI actions.

## Screenshots And Demo

The following screenshots document the real UI flows demonstrated during development. They are intentionally described by state so the images cannot be mistaken for bundled or hardcoded mailbox data.

| Flow | What it demonstrates |
| --- | --- |
| Inbox | Real Gmail messages displayed with sender, subject, preview, unread marker, timeframe filters, and paging controls. |
| Message detail | Gmail message metadata, sanitized body content, read-state update, and reply action. |
| Compose | A populated compose form with recipient, subject, body, discard, and send controls. |
| Assistant confirmation | The assistant creates a draft and displays a **Ready to send** confirmation before any send request. |
| Sent mail | The real Gmail Sent label after a successful send, with the assistant reporting Gmail acceptance. |
| Dark mode | The same mailbox and assistant workspace using the dark theme and readable controls. |
| Account and settings | Google account identity, connection status, theme/density controls, and Gmail settings link. |

To capture fresh screenshots after connecting a real account:

1. Start the app with `npm run dev`.
2. Open the local URL and connect Gmail.
3. Capture the Inbox, an opened message, Compose, the assistant confirmation card, Sent, and dark mode.
4. Store exported images under `docs/screenshots/` and embed them here using relative links, for example:

  ```markdown
  ![Inbox with real Gmail messages](docs/screenshots/inbox.png)
  ```

The repository does not commit account-specific screenshots by default because they may expose private senders, subjects, addresses, or message contents. Redact personal data before publishing screenshots. A short screen recording should show the same sequence: connect account, ask the assistant to search, open a message, compose a draft, confirm sending, and open Sent.

### Assistant UI-control demonstration

```text
User: Show emails from sarah@example.com
Assistant: calls search_emails with the validated sender filter
Browser: updates shared Zustand filter state and reloads Gmail
UI: displays the matching real Gmail response

User: Compose an email to john@example.com
Assistant: calls open_compose with validated fields
Browser: opens the compose view and fills the form
UI: displays Ready to send; no message is sent yet

User: Confirm Send email
Browser: calls POST /api/gmail/send
UI: changes to Sent and reports Gmail’s response
```

## API Reference

All routes are handled by Next.js route handlers. Authenticated Gmail routes read the encrypted session cookie on the server.

### `GET /api/auth/login`

Starts Google OAuth. The route uses the configured client credentials, requests offline access, asks Google to show the account chooser, and requests Gmail modify, Gmail send, email, and profile scopes. If OAuth configuration is missing, it redirects to `/?error=google_oauth_not_configured`.

### `GET /api/auth/callback`

Exchanges Google’s authorization code for tokens, loads the Google profile, stores the encrypted session cookie, and redirects to `/`. Missing codes and OAuth failures redirect to `/?error=oauth`.

### `POST /api/auth/logout`

Clears the current session cookie.

### `GET /api/gmail/messages`

Lists real Gmail message metadata.

Query parameters:

| Parameter | Values | Description |
| --- | --- | --- |
| `view` | `inbox` or `sent` | Gmail label; defaults to `inbox` |
| `sender` | string | Adds a `from:` Gmail operator |
| `keyword` | string | Additional Gmail query terms |
| `after` | `YYYY-MM-DD` | Gmail `after:` filter |
| `before` | `YYYY-MM-DD` | Gmail `before:` filter |
| `unread` | boolean | Adds `is:unread` when true |
| `search` | string | Free-form Gmail search query |
| `pageToken` | string | Opaque token from the previous response |

Successful response:

```json
{
  "emails": [],
  "nextPageToken": "opaque-gmail-token",
  "userEmail": "user@example.com",
  "profile": { "name": "User", "picture": "https://..." }
}
```

Possible errors include `401 AUTH_REQUIRED`, `503 GOOGLE_OAUTH_NOT_CONFIGURED`, and `502 GMAIL_UNAVAILABLE`.

### `GET /api/gmail/messages/:id`

Fetches one full Gmail message, extracts its content, and marks it read. The response contains the message summary, recipient, text body, optional sanitized HTML body, and reply address. Errors include `401 AUTH_REQUIRED` and `502 MESSAGE_UNAVAILABLE`.

### `POST /api/gmail/send`

Validates and sends a real message through Gmail.

Request body:

```json
{
  "to": "recipient@example.com",
  "subject": "Meeting",
  "body": "Let us meet tomorrow.",
  "threadId": "optional-gmail-thread-id",
  "inReplyTo": "optional-message-id"
}
```

`to` must be an email address, `subject` is limited to 998 characters, and `body` must not be empty. Responses include `{ "ok": true, "id": "gmail-message-id" }` or `INVALID_MESSAGE`, `AUTH_REQUIRED`, or `SEND_FAILED`.

### `POST /api/gmail/watch`

Creates a Gmail watch for the authenticated mailbox using `GMAIL_PUBSUB_TOPIC`. Returns the Gmail `historyId` and watch expiration. Requires Gmail Pub/Sub configuration.

### `POST /api/ai`

Requests an assistant response and validated tool calls.

Request body:

```json
{
  "message": "Show unread emails from this week",
  "context": {
    "currentView": "inbox",
    "filters": { "sender": "", "keyword": "", "after": "", "before": "", "unread": false },
    "searchQuery": "",
    "composeState": { "to": "", "cc": "", "subject": "", "body": "", "mode": "new" }
  }
}
```

The message is limited to 4,000 characters. Errors include `AI_NOT_CONFIGURED`, `INVALID_REQUEST`, `AI_AUTH_FAILED`, `AI_RATE_LIMITED`, `AI_REQUEST_REJECTED`, and `AI_UNAVAILABLE`.

### `GET /api/events`

Opens an authenticated Server-Sent Events stream. It sends `connected`, periodic `heartbeat`, and `mail.updated` events. The browser reloads the active mailbox after a `mail.updated` event.

### `POST /api/webhooks/gmail`

Receives a Gmail Pub/Sub push notification. It requires the `x-nebula-webhook-secret` header to match `GMAIL_WEBHOOK_SECRET`, then publishes a mailbox update event.

## Architecture Decisions And Trade-offs

### Gmail API through server routes

The browser calls Next.js route handlers instead of Gmail directly. This keeps client secrets and refresh tokens off the client and gives the application one place to validate requests and normalize errors. The trade-off is that every mailbox interaction adds a server hop and the deployment must support OAuth callbacks.

### Encrypted cookie session

The current session is encrypted with `jose` and stored in an `httpOnly` cookie, which is simple and appropriate for a single-instance demo. It avoids exposing OAuth tokens to browser JavaScript. The trade-off is that durable multi-instance deployments should move session material to encrypted database-backed storage and rotate secrets carefully.

### Zustand for shared UI state

Zustand keeps mailbox filters, compose state, selected messages, and assistant actions synchronized without prop drilling. Manual controls and AI actions therefore update the same state model. The trade-off is a client-side store whose request lifecycle needs explicit cancellation and latest-request guards, which are implemented in the mailbox loader.

### Metadata first, full message on demand

Mailbox pages request Gmail metadata only; the full MIME payload is fetched when a message opens. This reduces initial payload size and latency. The trade-off is one additional request per opened message and the need to handle messages that change between list and detail requests.

### Allowlisted assistant tools

The model can request only named, Zod-validated tools. The browser maps those tools to typed actions and never executes generated JavaScript. This substantially limits the assistant’s control surface. The trade-off is that new assistant behavior requires a deliberate tool definition and UI mapping rather than arbitrary natural-language automation.

### Explicit send confirmation

AI-created email is never sent directly from a model response. It first populates Compose and requires an explicit user confirmation. This protects against prompt mistakes and untrusted email content. The trade-off is one extra interaction, which is appropriate for an irreversible external action.

### Process-local realtime events

The optional Pub/Sub webhook publishes a process-local event consumed by authenticated SSE clients. It is easy to run and demonstrate locally. The trade-off is that multiple production instances need a shared broker or durable notification store, and Gmail watch expiration must be persisted and renewed.

## Architecture

```text
Browser UI
  -> Next.js API route
  -> httpOnly encrypted session
  -> Google OAuth / Gmail API
  -> typed JSON response
  -> Zustand state
  -> React UI
```

```text
Assistant request
  -> POST /api/ai
  -> Groq OpenAI-compatible API
  -> Zod-validated allowlisted tool call
  -> typed browser action
  -> Gmail request or Zustand update
```

Important modules:

```text
src/app/api/auth/       OAuth login, callback, and logout
src/app/api/gmail/      Gmail list, detail, send, and watch routes
src/app/api/ai/         Assistant tool-calling endpoint
src/app/api/events/     Authenticated SSE stream
src/app/api/webhooks/   Gmail Pub/Sub receiver
src/components/        Main mail shell and UI components
src/lib/auth/           Session and OAuth configuration
src/lib/gmail/          Gmail client and MIME parsing
src/lib/ai/             Assistant tool definitions
src/lib/sync/           Process-local event fan-out
src/store/              Shared Zustand mailbox state
src/types/              Shared TypeScript contracts
```

## Security

- Google client secrets, refresh tokens, session contents, and AI keys stay on the server.
- Sessions are encrypted with `jose` and stored in an `httpOnly`, `sameSite=lax` cookie.
- Gmail HTML is sanitized before rendering.
- Gmail content is treated as untrusted input in the assistant prompt.
- Assistant tools are allowlisted and validated with Zod.
- Assistant sending always requires explicit user confirmation.
- API errors returned to users do not include stack traces or credentials.
- For multi-instance production deployments, replace process-local session/event storage with encrypted durable storage and a shared event broker.

## Realtime Gmail Updates

Realtime updates are optional. To configure them:

1. Enable Cloud Pub/Sub.
2. Create a topic and set its full resource name in `GMAIL_PUBSUB_TOPIC`.
3. Grant Gmail’s push service permission to publish to the topic.
4. Create a push subscription targeting `https://your-domain.example/api/webhooks/gmail`.
5. Configure the subscription to send `x-nebula-webhook-secret` with the same value as `GMAIL_WEBHOOK_SECRET`.
6. After OAuth, call `POST /api/gmail/watch` for each mailbox.

Gmail watches expire. Production should persist the expiration and renew watches before expiry. A private localhost server cannot receive Google Pub/Sub delivery directly; use an HTTPS deployment or secure tunnel.

## Troubleshooting

### Google shows `403 access_denied`

The OAuth consent screen is probably still in Testing and the account is not a test user. Add the account under Google Auth Platform → Audience → Test users, or publish and complete the required Google verification for unrestricted users.

### Google says the redirect URI is invalid

Make sure the URI in `.env.local` or Vercel exactly matches the URI registered on the Google OAuth Web client. Local and production use different values.

### The app says OAuth is not configured

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`, then restart or redeploy the app. Blank values are treated as missing.

### The app says Gmail could not be reached

Check the server logs, Gmail API enablement, OAuth scopes, token validity, and network access. Refresh the mailbox after reconnecting the Google account. The mailbox loader clears failed-page data and prevents stale requests from committing over newer results.

### The page does not change after Next page

Refresh once and try again. Page tokens are opaque and query-specific; changing view, search, or filters invalidates the old pagination state. The client disables duplicate page requests and aborts older requests.

### The assistant is unavailable

Set `GROQ_API_KEY` and optionally `GROQ_MODEL`, then restart the server. The app uses Groq’s OpenAI-compatible endpoint.

### Sending fails

Verify Gmail is connected, the recipient is valid, and the OAuth grant includes `gmail.send`. Assistant-created messages must be confirmed before sending.

## Deployment

The app can be deployed to Vercel or another Node-compatible Next.js host.

```powershell
npm run build
npm run start
```

For Vercel, configure all production environment variables in the project settings, especially:

```dotenv
GOOGLE_REDIRECT_URI=https://your-deployment-host/api/auth/callback
NEXTAUTH_SECRET=unique-production-secret
```

Never reuse a development secret in production. After deployment, test OAuth, Inbox, Sent, message opening, search, compose, reply, send confirmation, and account switching with a real authorized Google account.

## Testing

The Vitest suite covers Gmail query composition and shared Zustand actions. TypeScript validates route handlers and UI code. Live Gmail OAuth and sending require an external Google account and are not replaceable with fake mailbox fixtures for a real integration test.

## Project Status

The application intentionally does not ship hardcoded email results or a fake Gmail backend. Gmail features remain unavailable until a user authorizes the app and the deployment has valid Google OAuth configuration. Optional Pub/Sub synchronization requires public HTTPS infrastructure and Google Cloud configuration.

## What I Would Improve With More Time

- Move OAuth sessions and refresh-token metadata to encrypted, durable database storage with key rotation and revocation support.
- Add Gmail history synchronization, retry queues, idempotency, and persisted watch renewal instead of refreshing the current list after every event.
- Replace process-local SSE fan-out with a shared broker for multi-instance deployments.
- Add conversation/thread grouping, labels, archive/delete/star actions, attachments, drafts persistence, and richer Gmail-compatible compose formatting.
- Add a stricter HTML rendering policy with a restrictive iframe/content-security boundary and broader MIME test coverage.
- Add Playwright acceptance tests around mailbox navigation, stale request cancellation, pagination, compose confirmation, and authenticated test seams.
- Add structured observability for Gmail latency, API quotas, OAuth failures, tool calls, and send outcomes without logging message contents or tokens.
- Add polished redacted product screenshots and a short assistant-control recording to the repository’s submission documentation.
