"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeft, ArrowUpRight, Bot, Check, ChevronDown, Clock3, Inbox, Loader2, LogOut, Mail, Menu, Moon, Paperclip, PenLine, RefreshCw, Search, Send, Settings, Sparkles, Star, Sun, X } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { useMailStore } from "@/store/mail-store";
import type { AppContext, ComposeState, MailDetail, MailFilter, MailSummary } from "@/types/mail";

const suggested = ["Show unread emails", "Find emails from Sarah", "Compose an email", "Open latest email"];
const timeframes = ["Today", "Last 30 days", "Last year", "All time"] as const;

type Timeframe = typeof timeframes[number];

function timeframeFilters(timeframe: Timeframe): Pick<MailFilter, "after" | "before"> {
  if (timeframe === "All time") return { after: "", before: "" };
  const today = new Date();
  const after = new Date(today);
  if (timeframe === "Last 30 days") after.setDate(today.getDate() - 30);
  if (timeframe === "Last year") after.setFullYear(today.getFullYear() - 1);
  return { after: after.toISOString().slice(0, 10), before: timeframe === "Today" ? new Date(today.getTime() + 86400000).toISOString().slice(0, 10) : "" };
}

function formatDate(date: string) {
  const value = new Date(date);
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function MailShell() {
  const store = useMailStore();
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([{ role: "assistant", content: "Good morning. I can search, open, compose, and manage your Gmail with you." }]);
  const [pendingSend, setPendingSend] = useState<ComposeState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("nebula-theme") === "dark");
  const [compactMode, setCompactMode] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("nebula-density") === "compact");
  const [openPanel, setOpenPanel] = useState<"settings" | "account" | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string>();
  const [pageTokenHistory, setPageTokenHistory] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ name?: string; picture?: string }>();
  const mailboxRequestRef = useRef<{ id: number; controller: AbortController } | undefined>(undefined);
  const mailboxRequestIdRef = useRef(0);

  function toggleTheme() {
    setDarkMode((value) => { const next = !value; window.localStorage.setItem("nebula-theme", next ? "dark" : "light"); return next; });
  }

  function toggleDensity() {
    setCompactMode((value) => { const next = !value; window.localStorage.setItem("nebula-density", next ? "compact" : "comfortable"); return next; });
  }

  function selectTimeframe(timeframe: Timeframe) {
    const nextFilters = { ...store.filters, ...timeframeFilters(timeframe) };
    setSelectedTimeframe(timeframe);
    store.setFilters(nextFilters);
    void loadMessages(undefined, nextFilters);
  }

  const context: AppContext = useMemo(() => ({ currentView: store.currentView, selectedEmailId: store.selectedEmailId, selectedEmail: store.selectedEmail, filters: store.filters, searchQuery: store.searchQuery, composeState: store.composeState, userEmail: store.userEmail }), [store.currentView, store.selectedEmailId, store.selectedEmail, store.filters, store.searchQuery, store.composeState, store.userEmail]);

  const loadMessages = useCallback(async (view?: "inbox" | "sent", filters?: MailFilter, search?: string, pageToken?: string) => {
    const current = useMailStore.getState();
    const resolvedView = view ?? (current.currentView === "sent" ? "sent" : "inbox");
    const resolvedFilters = filters ?? current.filters;
    const resolvedSearch = search ?? current.searchQuery;
    mailboxRequestRef.current?.controller.abort();
    const requestId = ++mailboxRequestIdRef.current;
    const controller = new AbortController();
    mailboxRequestRef.current = { id: requestId, controller };
    const isCurrentRequest = () => mailboxRequestRef.current?.id === requestId;
    if (!pageToken) {
      setPageTokenHistory([]);
      setNextPageToken(undefined);
    }
    current.setLoading(resolvedView === "sent" ? "Loading sent mail..." : "Loading inbox...");
    const query = new URLSearchParams({ view: resolvedView, sender: resolvedFilters.sender, keyword: resolvedFilters.keyword, after: resolvedFilters.after, before: resolvedFilters.before, unread: String(resolvedFilters.unread), search: resolvedSearch });
    if (pageToken) query.set("pageToken", pageToken);
    try {
      const response = await fetch(`/api/gmail/messages?${query}`, { signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!isCurrentRequest()) return;
      if (!response.ok) {
        setPageTokenHistory([]);
        setNextPageToken(undefined);
        current.setEmails([]);
        current.setError(payload.error === "AUTH_REQUIRED" ? "Connect Gmail to load your mailbox." : payload.error === "GOOGLE_OAUTH_NOT_CONFIGURED" ? "Google OAuth is not configured. Add your Google client credentials to .env.local and restart the server." : "Gmail could not be reached. Try refreshing the mailbox.");
        return;
      }
      current.setUserEmail(payload.userEmail); setProfile(payload.profile); setNextPageToken(payload.nextPageToken);
      current.setEmails(payload.emails);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!isCurrentRequest()) return;
      setPageTokenHistory([]);
      setNextPageToken(undefined);
      current.setEmails([]);
      current.setError("Gmail could not be reached. Check your connection and try again.");
    }
  }, []);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!store.userEmail) return;
    const events = new EventSource("/api/events");
    events.onmessage = (event) => { if (JSON.parse(event.data).type === "mail.updated") void loadMessages(); };
    return () => events.close();
  }, [loadMessages, store.userEmail]);

  async function openEmail(email: MailSummary) {
    store.setLoading("Opening email...");
    const response = await fetch(`/api/gmail/messages/${email.id}`);
    const payload = await response.json();
    if (!response.ok) { store.setError("This message could not be opened."); return; }
    store.setSelectedEmail(payload.email);
    store.setEmails(store.emails.map((item) => item.id === email.id ? { ...item, isUnread: false } : item));
  }

  function loadNextPage() {
    if (!nextPageToken) return;
    setPageTokenHistory((history) => [...history, nextPageToken]);
    void loadMessages(undefined, undefined, undefined, nextPageToken);
  }

  function loadPreviousPage() {
    if (!pageTokenHistory.length) return;
    const history = pageTokenHistory.slice(0, -1);
    const previousToken = history[history.length - 1];
    setPageTokenHistory(history);
    void loadMessages(undefined, undefined, undefined, previousToken);
  }

  function executeTool(name: string, args: Record<string, unknown>) {
    if (name === "navigate_to_view") {
      const view = args.view as "inbox" | "sent" | "compose";
      store.setView(view); if (view !== "compose") void loadMessages(view);
      return `Opening ${view}.`;
    }
    if (name === "open_compose") {
      store.openCompose({ to: String(args.to ?? ""), subject: String(args.subject ?? ""), body: String(args.body ?? ""), mode: (args.mode as ComposeState["mode"]) ?? "new" });
      return "Compose is open and ready for your edits.";
    }
    if (name === "open_email") {
      const email = store.emails.find((item) => item.id === args.emailId);
      if (email) void openEmail(email);
      return email ? `Opening ${email.subject}.` : "I could not find that message in the current results.";
    }
    if (name === "search_emails") {
      const filters: Partial<MailFilter> = { sender: String(args.sender ?? ""), keyword: String(args.keyword ?? ""), after: String(args.after ?? ""), before: String(args.before ?? ""), unread: Boolean(args.unread) };
      store.setFilters(filters); void loadMessages("inbox", { ...store.filters, ...filters }); return "Searching Gmail and updating the inbox results.";
    }
    if (name === "reply_to_email") {
      const email = store.selectedEmail;
      if (!email) return "Open an email first so I know which conversation to reply to.";
      store.openCompose({ to: email.replyTo || email.senderEmail, subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`, body: String(args.body ?? ""), mode: "reply", threadId: email.threadId, inReplyTo: email.id });
      return `Replying to ${email.sender}.`;
    }
    if (name === "send_email") {
      setPendingSend({ to: String(args.to), cc: "", subject: String(args.subject), body: String(args.body), mode: "new" });
      return "Ready to send. Please confirm the message in the assistant panel.";
    }
    return "I could not complete that action.";
  }

  async function askAssistant(value = assistantInput) {
    const message = value.trim(); if (!message) return;
    setAssistantInput(""); setAssistantMessages((items) => [...items, { role: "user", content: message }, { role: "assistant", content: "Working on that..." }]);
    const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, context }) });
    const payload = await response.json();
    if (!response.ok) { const content = payload.error === "AI_NOT_CONFIGURED" ? "Add GROQ_API_KEY to enable the assistant." : payload.error === "AI_AUTH_FAILED" ? "The Groq API key is invalid. Replace GROQ_API_KEY in Vercel and redeploy." : payload.error === "AI_RATE_LIMITED" ? "Groq rate limit reached. Check your Groq usage limits." : payload.error === "AI_REQUEST_REJECTED" ? "Groq rejected this request. Check the selected model and try again." : "The assistant is temporarily unavailable."; setAssistantMessages((items) => [...items.slice(0, -1), { role: "assistant", content }]); return; }
    const results = (payload.toolCalls ?? []).map((call: { function: { name: string; arguments: string } }) => executeTool(call.function.name, JSON.parse(call.function.arguments))).join(" ");
    setAssistantMessages((items) => [...items.slice(0, -1), { role: "assistant", content: results || payload.message || "I’m ready for another mail task." }]);
  }

  async function sendConfirmed() {
    if (!pendingSend) return;
    store.setLoading("Sending...");
    const response = await fetch("/api/gmail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendingSend) });
    const payload = await response.json();
    if (!response.ok) { store.setError(payload.error === "AUTH_REQUIRED" ? "Connect Gmail before sending." : "Gmail could not send this message."); return; }
    setPendingSend(null); store.setLoading(undefined); store.setView("sent"); void loadMessages("sent"); setAssistantMessages((items) => [...items, { role: "assistant", content: "Sent. Gmail accepted the message." }]);
  }

  const isConnected = Boolean(store.userEmail);
  const accountName = profile?.name || store.userEmail || "Not connected";
  return <div className={`nebula-app ${darkMode ? "theme-dark" : ""} ${compactMode ? "density-compact" : ""}`}>
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>Nebula</span><span className="brand-muted">/ mail</span></div>
      <button className="compose-button" onClick={() => store.openCompose()}><PenLine size={17} /> Compose <span>⌘ K</span></button>
      <nav className="nav-list" aria-label="Mailbox navigation">
        <button className={store.currentView === "inbox" ? "nav-item active" : "nav-item"} onClick={() => { store.setView("inbox"); void loadMessages("inbox"); }}><Inbox size={18} /> Inbox</button>
        <button className={store.currentView === "sent" ? "nav-item active" : "nav-item"} onClick={() => { store.setView("sent"); void loadMessages("sent"); }}><Send size={18} /> Sent</button>
        <button className="nav-item" onClick={() => store.setView("compose")}><PenLine size={18} /> Drafts</button>
      </nav>
      <div className="sidebar-bottom">{!isConnected && <a className="connect-link" href="/api/auth/login">Connect Gmail <ArrowUpRight size={14} /></a>}</div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <main className="mail-main">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><div className="eyebrow">{store.currentView === "sent" ? "OUTBOX" : store.currentView === "detail" ? "MESSAGE" : "MAILBOX"}</div><h1>{store.currentView === "sent" ? "Sent mail" : store.currentView === "detail" ? "Email detail" : store.currentView === "compose" ? "New message" : "Inbox"}</h1></div><div className="topbar-actions"><button className="icon-button" onClick={() => void loadMessages()} aria-label="Refresh mailbox"><RefreshCw size={17} /></button><button className="icon-button" onClick={toggleTheme} aria-label={darkMode ? "Use light theme" : "Use dark theme"}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button" onClick={() => setOpenPanel("settings")} aria-label="Open settings"><Settings size={17} /></button><button className="account account-button header-account" onClick={() => setOpenPanel("account")} aria-label="Open account"><div className="avatar avatar-small">{profile?.picture ? <img src={profile.picture} alt="" /> : initials(accountName)}</div><div><b>{accountName}</b><span>{store.userEmail || "Not connected"}</span></div><ChevronDown size={15} /></button></div></header>
        <div className="mail-content">{store.error && <div className="error-banner">{store.error}<button onClick={() => store.setError(undefined)}><X size={15} /></button></div>}{store.loadingLabel && <div className="loading-line"><Loader2 size={15} className="spin" /> {store.loadingLabel}</div>}
          {store.currentView === "compose" ? <ComposePanel state={store.composeState} onChange={store.updateCompose} onCancel={() => store.setView("inbox")} onSend={() => setPendingSend(store.composeState)} /> : store.currentView === "detail" && store.selectedEmail ? <DetailPanel email={store.selectedEmail} onBack={() => store.setView("inbox")} onReply={() => executeTool("reply_to_email", {})} /> : <><div className="search-row"><label className="search-box"><Search size={17} /><input value={store.searchQuery} onChange={(event) => store.setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadMessages(); }} placeholder="Search mail" /><kbd>⌘ K</kbd></label><button className={store.filters.unread ? "filter-button selected" : "filter-button"} onClick={() => { const unread = !store.filters.unread; store.setFilters({ unread }); void loadMessages("inbox", { ...store.filters, unread }); }}><Mail size={15} /> Unread</button><TimeframeButtons selected={selectedTimeframe} onSelect={selectTimeframe} /></div><div className="list-heading"><span>{store.filters.unread ? "Unread" : store.currentView === "sent" ? "All sent" : "All inbox"}</span><span>{store.emails.length} messages</span></div><div className="email-list">{store.emails.length ? store.emails.map((email) => <EmailRow key={email.id} email={email} onClick={() => void openEmail(email)} />) : <EmptyState connected={isConnected} />}</div>{(pageTokenHistory.length > 0 || nextPageToken) && <div className="pagination"><button className="load-more" onClick={loadPreviousPage} disabled={Boolean(store.loadingLabel) || !pageTokenHistory.length}>Previous page <ArrowUpRight size={14} /></button><button className="load-more" onClick={loadNextPage} disabled={Boolean(store.loadingLabel) || !nextPageToken}>Next page <ArrowUpRight size={14} /></button></div>}</>}</div>
      </main>
    <Assistant messages={assistantMessages} input={assistantInput} onInput={setAssistantInput} onAsk={() => void askAssistant()} onSuggestion={(value) => void askAssistant(value)} pendingSend={pendingSend} onCancelSend={() => setPendingSend(null)} onConfirmSend={() => void sendConfirmed()} />
    {openPanel && <div className="modal-backdrop" onClick={() => setOpenPanel(null)}><section className="modal-panel" onClick={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={() => setOpenPanel(null)} aria-label="Close panel"><X size={18} /></button>{openPanel === "settings" ? <><div className="eyebrow">WORKSPACE SETTINGS</div><h2>Settings</h2><p className="modal-copy">Manage the Nebula workspace and open the complete Gmail settings.</p><div className="settings-section"><div className="section-label">General</div><button className="setting-row" onClick={toggleTheme}><span>{darkMode ? <Sun size={17} /> : <Moon size={17} />} Appearance</span><strong>{darkMode ? "Dark" : "Light"}</strong></button><button className="setting-row" onClick={toggleDensity}><span>Reading density</span><strong>{compactMode ? "Compact" : "Comfortable"}</strong></button></div><div className="settings-section"><div className="section-label">Gmail</div><div className="connection-status"><span className={isConnected ? "status-dot online" : "status-dot"} />{isConnected ? "Connected and syncing" : "Not connected"}</div><span className="modal-copy">Inbox, Sent, search, read state, and sending use the Gmail API.</span><a href="https://mail.google.com/mail/u/0/#settings" target="_blank" rel="noreferrer">Open all Gmail settings <ArrowUpRight size={14} /></a></div></> : <><div className="eyebrow">GOOGLE ACCOUNT</div><div className="account-profile">{profile?.picture ? <img src={profile.picture} alt="" /> : <div className="avatar avatar-large">{initials(accountName)}</div>}<div><h2>{accountName}</h2><p>{store.userEmail || "Connect a Google account"}</p></div></div><div className="account-details"><span>Provider</span><strong>Google Gmail</strong><span>Session</span><strong>{isConnected ? "Secure and active" : "Not connected"}</strong><span>Permissions</span><strong>Mail read, modify, and send</strong></div>{isConnected ? <a className="setting-row" href="/api/auth/logout"><span><LogOut size={17} /> Sign out</span><strong>Exit</strong></a> : <a className="setting-row" href="/api/auth/login"><span><ArrowUpRight size={17} /> Connect Gmail</span><strong>Google</strong></a>}</>}</section></div>}
  </div>;
}

function EmailRow({ email, onClick }: { email: MailSummary; onClick: () => void }) { return <button className={email.isUnread ? "email-row unread" : "email-row"} onClick={onClick}><span className="row-check"><input type="checkbox" aria-label={`Select ${email.subject}`} onClick={(event) => event.stopPropagation()} /></span><span className="avatar">{initials(email.sender)}</span><span className="email-copy"><span className="email-top"><b>{email.sender}</b><time>{formatDate(email.date)}</time></span><span className="subject-line">{email.subject}{email.isUnread && <span className="unread-dot" />}</span><span className="preview">{email.preview}</span></span><Star size={16} className="star" /></button>; }

function TimeframeButtons({ selected, onSelect }: { selected: Timeframe | null; onSelect: (timeframe: Timeframe) => void }) { return <div className="timeframe-group" aria-label="Filter by timeframe">{timeframes.map((timeframe) => <button key={timeframe} className={selected === timeframe ? "filter-button selected" : "filter-button"} onClick={() => onSelect(timeframe)}><Clock3 size={15} /> {timeframe}</button>)}</div>; }

function ComposePanel({ state, onChange, onCancel, onSend }: { state: ComposeState; onChange: (state: Partial<ComposeState>) => void; onCancel: () => void; onSend: () => void }) { return <section className="compose-panel"><div className="panel-heading"><div><div className="eyebrow">{state.mode === "reply" ? "REPLY" : "COMPOSE"}</div><h2>{state.mode === "reply" ? "Reply to conversation" : "Write a new message"}</h2></div><button className="icon-button" onClick={onCancel} aria-label="Close compose"><X size={18} /></button></div><div className="compose-fields"><label>To<input value={state.to} onChange={(event) => onChange({ to: event.target.value })} placeholder="name@example.com" autoFocus /></label><label>Cc<input value={state.cc} onChange={(event) => onChange({ cc: event.target.value })} placeholder="Optional" /></label><label>Subject<input value={state.subject} onChange={(event) => onChange({ subject: event.target.value })} placeholder="Subject" /></label><textarea value={state.body} onChange={(event) => onChange({ body: event.target.value })} placeholder="Write your message..." /></div><div className="compose-footer"><div className="compose-tools"><button className="icon-button" aria-label="Attach file"><Paperclip size={18} /></button><button className="icon-button" aria-label="Schedule send"><Clock3 size={18} /></button></div><div><button className="text-button" onClick={onCancel}>Discard</button><button className="primary-button" onClick={onSend}><Send size={16} /> Send</button></div></div></section>; }

function DetailPanel({ email, onBack, onReply }: { email: MailDetail; onBack: () => void; onReply: () => void }) { const safeHtml = email.bodyHtml ? DOMPurify.sanitize(email.bodyHtml, { USE_PROFILES: { html: true } }) : ""; return <section className="detail-panel"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back to inbox</button><div className="detail-heading"><div className="avatar avatar-large">{initials(email.sender)}</div><div className="detail-meta"><div className="eyebrow">{email.senderEmail}</div><h2>{email.subject}</h2><p>To {email.to} · {new Date(email.date).toLocaleString()}</p></div><button className="primary-button reply-button" onClick={onReply}>Reply <ArrowUpRight size={15} /></button></div>{safeHtml ? <article className="message-body message-html" dangerouslySetInnerHTML={{ __html: safeHtml }} /> : <article className="message-body">{email.bodyText.split("\n").map((line, index) => <p key={`${line}-${index}`}>{line || "\u00a0"}</p>)}</article>}</section>; }

function EmptyState({ connected }: { connected: boolean }) { return <div className="empty-state"><div className="empty-icon"><Mail size={25} /></div><h2>{connected ? "Your inbox is clear" : "Connect Gmail to begin"}</h2><p>{connected ? "New messages will appear here when they arrive." : "Sign in with Google to securely load your real mailbox."}</p>{!connected && <a className="primary-button" href="/api/auth/login">Sign in with Google <ArrowUpRight size={15} /></a>}</div>; }

function Assistant({ messages, input, onInput, onAsk, onSuggestion, pendingSend, onCancelSend, onConfirmSend }: { messages: Array<{ role: "user" | "assistant"; content: string }>; input: string; onInput: (value: string) => void; onAsk: () => void; onSuggestion: (value: string) => void; pendingSend: ComposeState | null; onCancelSend: () => void; onConfirmSend: () => void }) { return <aside className="assistant"><div className="assistant-header"><div className="assistant-title"><span className="ai-spark"><Bot size={17} /></span><div><b>AI Mail Assistant</b><span>Connected to your workspace</span></div></div><button className="icon-button"><Archive size={17} /></button></div><div className="assistant-thread">{messages.map((message, index) => <div className={message.role === "user" ? "chat-bubble user" : "chat-bubble"} key={`${message.role}-${index}`}>{message.role === "assistant" && <span className="message-icon"><Sparkles size={13} /></span>}<span>{message.content}</span></div>)}{pendingSend && <div className="confirm-card"><div className="confirm-kicker"><Check size={14} /> Ready to send</div><strong>{pendingSend.subject || "(no subject)"}</strong><span>To {pendingSend.to}</span><p>{pendingSend.body}</p><div className="confirm-actions"><button className="text-button" onClick={onCancelSend}>Cancel</button><button className="primary-button" onClick={onConfirmSend}><Send size={14} /> Send email</button></div></div>}</div><div className="assistant-bottom"><div className="suggestions">{suggested.map((suggestion) => <button key={suggestion} onClick={() => onSuggestion(suggestion)}>{suggestion}</button>)}</div><div className="assistant-input"><textarea value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onAsk(); } }} placeholder="Ask me to find, compose, or manage your mail..." rows={2} /><button className="send-assistant" onClick={onAsk} aria-label="Send assistant message"><ArrowUpRight size={18} /></button></div><span className="assistant-note">AI can make mistakes. Review actions before sending.</span></div></aside>; }

