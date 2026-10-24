import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Clipboard,
  Clock3,
  FileText,
  Layers3,
  Menu,
  MessageSquare,
  Plus,
  Radio,
  ShieldCheck,
  X,
} from "lucide-react";
import type { AppData, Incident, NewIncident, Phase } from "../shared/schema";
import { phases, categories, createSchema } from "../shared/schema";
import { checks, checkIdsFor } from "../shared/runbooks";
import { handoff } from "../shared/engine";
import { apiRequest } from "./api";
import "./style.css";

const query = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const time = (at: string) =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
function App() {
  const dataQuery = useQuery({
    queryKey: ["incidents"],
    queryFn: () => apiRequest<AppData>("/api/incidents"),
  });
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<"Context" | "Timeline" | "Handoff">("Context");
  const [panel, setPanel] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [modal, setModal] = useState<"new" | "phase" | "about" | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [next, setNext] = useState<Phase>("Triage");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<NewIncident>({
    title: "",
    site: "",
    asset: "",
    severity: "SEV 3",
    category: "Unknown",
  });
  const log = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const retry = useRef<{
    incidentId: string;
    text: string;
    requestId: string;
  } | null>(null);
  const data = dataQuery.data;
  const incident =
    data?.incidents.find((i) => i.id === selected) || data?.incidents[0];
  const mutation = useMutation({
    mutationFn: ({ path, payload }: { path: string; payload: unknown }) =>
      apiRequest<AppData>(path, payload),
    onSuccess: (result) => {
      query.setQueryData(["incidents"], result);
      setError("");
    },
    onError: (e) => setError(e.message),
  });
  useEffect(() => {
    if (modal && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [modal]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [incident?.id, incident?.messages.length, mutation.isPending]);
  const choose = (i: Incident) => {
    setSelected(i.id);
    setSidebar(false);
    setTab("Context");
    setText("");
    setError("");
  };
  async function send() {
    if (!incident || !text.trim() || mutation.isPending) return;
    const content = text.trim();
    if (
      !retry.current ||
      retry.current.incidentId !== incident.id ||
      retry.current.text !== content
    ) {
      retry.current = {
        incidentId: incident.id,
        text: content,
        requestId: crypto.randomUUID(),
      };
    }
    try {
      await mutation.mutateAsync({
        path: `/api/incidents/${incident.id}/messages`,
        payload: { text: content, requestId: retry.current.requestId },
      });
      retry.current = null;
      setText("");
    } catch {
      /* preserve the operator's input on failure */
    }
  }
  async function create(event: React.SyntheticEvent) {
    event.preventDefault();
    const parsed = createSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    try {
      const result = await mutation.mutateAsync({
        path: "/api/incidents",
        payload: parsed.data,
      });
      setSelected(result.incidents[0].id);
      setText("");
      setModal(null);
      setSidebar(false);
      setPanel(false);
      setForm({
        title: "",
        site: "",
        asset: "",
        severity: "SEV 3",
        category: "Unknown",
      });
    } catch {}
  }
  async function transition(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!incident) return;
    try {
      await mutation.mutateAsync({
        path: `/api/incidents/${incident.id}/phase`,
        payload: { phase: next, note },
      });
      setModal(null);
      setNote("");
    } catch {}
  }
  async function copyHandoff() {
    if (!incident) return;
    try {
      await navigator.clipboard.writeText(handoff(incident));
      setCopied(true);
    } catch {
      setCopied(false);
      setError(
        "Clipboard permission is unavailable. Select and copy the handoff text below.",
      );
    }
  }
  const openPhase = () => {
    if (!incident) return;
    setNext(phases[phases.indexOf(incident.phase) + 1]);
    setNote("");
    setModal("phase");
  };
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to incident
      </a>
      {sidebar && (
        <button
          className="mobile-backdrop"
          aria-label="Close incident list"
          onClick={() => setSidebar(false)}
          data-testid="button-dismiss-sidebar"
        />
      )}
      <aside
        className={`sidebar ${sidebar ? "shown" : ""}`}
        aria-label="Incident workspace"
      >
        <div className="wordmark">
          <Activity size={22} strokeWidth={1.7} />
          <span>
            Incident Copilot
            <span className="wordmark-sub">DATA CENTER OPERATIONS</span>
          </span>
          <button
            className="sidebar-close"
            aria-label="Close incident list"
            onClick={() => setSidebar(false)}
            data-testid="button-close-sidebar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-dot" /> Fictional operations workspace
        </div>
        <button
          className="new-button"
          onClick={() => {
            setError("");
            setModal("new");
          }}
          data-testid="button-new-incident"
        >
          <Plus size={17} /> New incident <span className="shortcut">+</span>
        </button>
        <div className="list-label">
          INCIDENTS <span>{data?.incidents.length ?? "…"}</span>
        </div>
        <nav className="incident-list" aria-label="Select incident">
          {data?.incidents.map((i) => (
            <button
              key={i.id}
              className={`incident-link ${incident?.id === i.id ? "selected" : ""}`}
              aria-pressed={incident?.id === i.id}
              onClick={() => choose(i)}
              data-testid={`button-incident-${i.id}`}
            >
              <div>
                <span
                  className={`severity-dot ${i.severity === "SEV 1" ? "critical" : i.severity === "SEV 2" ? "warning" : ""}`}
                />
                <span className="incident-link-title">{i.title}</span>
              </div>
              <span className="incident-meta">
                {i.site} <span>·</span> {i.phase}
              </span>
            </button>
          ))}
          {dataQuery.isPending && (
            <div className="side-loading">Loading incidents…</div>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="boundary">
            <ShieldCheck size={17} />
            <div>
              Human decisions. Always.<p>No infrastructure control.</p>
            </div>
          </div>
          <button
            className="about-button"
            onClick={() => setModal("about")}
            data-testid="button-about"
          >
            <Layers3 size={16} /> Architecture &amp; limitations{" "}
            <ArrowRight size={14} />
          </button>
          <span className="built-note">
            Cloudflare submission project · v1.0
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open incident list"
            onClick={() => setSidebar(true)}
            data-testid="button-open-sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Incident room</strong>
          </div>
          <button
            className="model-label"
            onClick={() => setModal("about")}
            data-testid="button-model-status"
          >
            <Radio size={14} />
            <span>
              {data?.mode === "workers-ai" ? "Workers AI" : "Simulation mode"}
            </span>
            <ChevronDown size={13} />
          </button>
          <span className="operator-avatar" title="Demo operator">
            OP
          </span>
        </header>
        {dataQuery.isError ? (
          <main className="connection-error">
            <h1>Workspace unavailable</h1>
            <p>{dataQuery.error.message}</p>
            <button
              className="primary"
              onClick={() => dataQuery.refetch()}
              data-testid="button-retry"
            >
              Retry connection
            </button>
          </main>
        ) : !incident ? (
          <main className="loading-view" aria-busy="true">
            <div className="skeleton" />
            <div className="skeleton" />
            <p>Opening your incident workspace…</p>
          </main>
        ) : (
          <>
            <section className="incident-header" aria-label="Selected incident">
              <div className="incident-heading">
                <div className="eyebrow">
                  <span className="mono">
                    INC-{incident.id.slice(0, 6).toUpperCase()}
                  </span>
                  <span className="sample-label">FICTIONAL DATA</span>
                </div>
                <h1 data-testid="text-incident-title">{incident.title}</h1>
                <div className="incident-subline">
                  <span>{incident.site}</span>
                  <span className="divider">/</span>
                  <span>{incident.asset || "Asset not specified"}</span>
                  <span className="severity-tag">{incident.severity}</span>
                </div>
              </div>
              <button
                className="secondary context-toggle"
                onClick={() => setPanel(!panel)}
                aria-expanded={panel}
                data-testid="button-toggle-context"
              >
                <FileText size={16} />{" "}
                {panel ? "Hide context" : "Incident context"}
              </button>
              <div className="phase-pill">
                <span />
                {incident.phase}
              </div>
            </section>
            <div className="stage-bar" aria-label="Incident workflow">
              {phases.map((phase, index) => (
                <React.Fragment key={phase}>
                  <div
                    className={`stage ${phase === incident.phase ? "current" : index < phases.indexOf(incident.phase) ? "passed" : ""}`}
                    aria-current={phase === incident.phase ? "step" : undefined}
                  >
                    <span>
                      {index < phases.indexOf(incident.phase) ? (
                        <Check size={12} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <label>{phase}</label>
                  </div>
                  {index < phases.length - 1 && <div className="stage-line" />}
                </React.Fragment>
              ))}
            </div>
            <div className="work-grid">
              <main id="main-content" tabIndex={-1} className="conversation">
                <div className="conversation-toolbar">
                  <div>
                    <MessageSquare size={16} />
                    <h2>Incident conversation</h2>
                  </div>
                  <span className="muted">
                    {data?.mode === "simulation"
                      ? "Scripted responses · no LLM calls"
                      : "Llama 3.3 · advisory only"}
                  </span>
                </div>
                <div
                  className="message-log"
                  ref={log}
                  role="log"
                  aria-label="Incident messages"
                  aria-live="polite"
                  data-testid="message-log"
                >
                  <div className="conversation-date">
                    <span />
                    {new Date(incident.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span />
                  </div>
                  {incident.messages.map((message) => (
                    <article
                      key={message.id}
                      className={`message ${message.role}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={`message-avatar ${message.role === "user" ? "operator" : ""}`}
                      >
                        {message.role === "user" ? (
                          "OP"
                        ) : (
                          <Activity size={17} />
                        )}
                      </div>
                      <div className="message-content">
                        <div className="message-byline">
                          <strong>
                            {message.role === "user"
                              ? "Operator"
                              : "Incident Copilot"}
                          </strong>
                          <time dateTime={message.at}>{time(message.at)}</time>
                          {message.source && message.source !== "safety" && (
                            <span className="source-label">
                              {message.source === "simulation"
                                ? "SIMULATION"
                                : "WORKERS AI"}
                            </span>
                          )}
                        </div>
                        <p className="message-text">{message.text}</p>
                        {message.checkIds && message.checkIds.length > 0 && (
                          <div className="suggested-checks">
                            <span className="eyebrow">
                              SUGGESTED READ-ONLY CHECKS
                            </span>
                            {message.checkIds.map((id) => (
                              <div key={id}>
                                <Check size={14} />
                                <span>
                                  {checks.find((c) => c.id === id)?.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {mutation.isPending && (
                    <div className="pending-message" role="status">
                      Saving the operator update…
                    </div>
                  )}
                </div>
                <div className="composer-wrap">
                  {error && !modal && (
                    <div className="inline-error" role="alert">
                      {error}
                    </div>
                  )}
                  {incident.messages.length === 1 && (
                    <div className="starter-row">
                      <span>Try an update</span>
                      <button
                        onClick={() =>
                          setText(
                            "The issue began 15 minutes ago. Service impact is not yet confirmed. No equipment changes have been made.",
                          )
                        }
                        data-testid="button-starter"
                      >
                        Capture initial observations <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                  <form
                    className="composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      send();
                    }}
                  >
                    <label className="sr-only" htmlFor="message">
                      Operator observation
                    </label>
                    <textarea
                      id="message"
                      rows={3}
                      maxLength={2000}
                      placeholder={
                        incident.phase === "Closed"
                          ? "This incident is closed and read-only."
                          : "Describe what you observed, or add an incident update…"
                      }
                      value={text}
                      disabled={
                        incident.phase === "Closed" || mutation.isPending
                      }
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      data-testid="input-message"
                    />
                    <div className="composer-footer">
                      <span>
                        Enter to send <span>·</span> Shift + Enter for a new
                        line
                      </span>
                      <button
                        className="send-button"
                        type="button"
                        onClick={() => void send()}
                        disabled={
                          !text.trim() ||
                          mutation.isPending ||
                          incident.phase === "Closed"
                        }
                        aria-label="Send observation"
                        data-testid="button-send"
                      >
                        <ArrowUp size={18} />
                      </button>
                    </div>
                  </form>
                  <p className="advisory-note">
                    <ShieldCheck size={13} />
                    Advisory only. Follow approved site procedures. No commands
                    or autonomous changes.
                  </p>
                </div>
              </main>
              <aside
                className={`context-panel ${panel ? "shown" : ""}`}
                aria-label="Incident details"
              >
                <div
                  className="context-tabs"
                  role="tablist"
                  aria-label="Incident details views"
                >
                  {(["Context", "Timeline", "Handoff"] as const).map((t) => (
                    <button
                      role="tab"
                      key={t}
                      aria-selected={tab === t}
                      aria-controls={`panel-${t}`}
                      id={`tab-${t}`}
                      className={tab === t ? "active" : ""}
                      onClick={() => {
                        setTab(t);
                        setCopied(false);
                      }}
                      data-testid={`button-tab-${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div
                  className="context-body"
                  role="tabpanel"
                  id={`panel-${tab}`}
                  aria-labelledby={`tab-${tab}`}
                  tabIndex={0}
                >
                  {tab === "Context" && (
                    <>
                      <section className="detail-section">
                        <div className="section-heading">
                          <h2>Incident brief</h2>
                          <span className="tiny-label">OPERATOR SUPPLIED</span>
                        </div>
                        <dl>
                          <div>
                            <dt>Site</dt>
                            <dd>{incident.site}</dd>
                          </div>
                          <div>
                            <dt>Asset</dt>
                            <dd>{incident.asset || "Not specified"}</dd>
                          </div>
                          <div>
                            <dt>Category</dt>
                            <dd>{incident.category}</dd>
                          </div>
                          <div>
                            <dt>Severity</dt>
                            <dd>{incident.severity}</dd>
                          </div>
                        </dl>
                      </section>
                      <section className="detail-section">
                        <div className="section-heading">
                          <h2>Recorded observations</h2>
                          <span className="count">
                            {incident.observations.length}
                          </span>
                        </div>
                        {incident.observations.length ? (
                          <ul className="observations">
                            {incident.observations.map((o, i) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="empty-note">
                            Add an update in the conversation. Only
                            operator-reported information appears here.
                          </p>
                        )}
                        <p className="provenance">
                          Not independently verified telemetry.
                        </p>
                      </section>
                      <section className="detail-section">
                        <div className="section-heading">
                          <h2>Read-only checks</h2>
                          <span className="count">
                            {incident.checked.length}/
                            {checkIdsFor(incident.category).length}
                          </span>
                        </div>
                        <p className="empty-note check-intro">
                          Mark reviewed, not “passed.” Use approved monitoring
                          and qualified owners.
                        </p>
                        <div className="check-list">
                          {checks
                            .filter((c) =>
                              checkIdsFor(incident.category).includes(c.id),
                            )
                            .map((c) => (
                              <label className="check-row" key={c.id}>
                                <input
                                  type="checkbox"
                                  checked={incident.checked.includes(c.id)}
                                  disabled={
                                    mutation.isPending ||
                                    incident.phase === "Closed"
                                  }
                                  onChange={(e) =>
                                    mutation.mutate({
                                      path: `/api/incidents/${incident.id}/checks`,
                                      payload: {
                                        id: c.id,
                                        done: e.target.checked,
                                      },
                                    })
                                  }
                                  data-testid={`checkbox-${c.id}`}
                                />
                                <span>
                                  <strong>{c.title}</strong>
                                  <span>{c.detail}</span>
                                </span>
                              </label>
                            ))}
                        </div>
                      </section>
                    </>
                  )}
                  {tab === "Timeline" && (
                    <section className="detail-section timeline">
                      <h2>Operator activity</h2>
                      <p className="empty-note">
                        Phase changes are explicit operator decisions.
                      </p>
                      {incident.events.map((event, index) => (
                        <div className="timeline-event" key={index}>
                          <Clock3 size={14} />
                          <div>
                            <time>{time(event.at)}</time>
                            <p>{event.text}</p>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                  {tab === "Handoff" && (
                    <section className="detail-section handoff-panel">
                      <div className="section-heading">
                        <h2>Handoff draft</h2>
                        <FileText size={15} />
                      </div>
                      <p className="empty-note">
                        Review before sharing. No ticket is sent and no
                        receiving owner is assigned.
                      </p>
                      <button
                        className="secondary copy-button"
                        onClick={copyHandoff}
                        data-testid="button-copy-handoff"
                      >
                        {copied ? <Check size={15} /> : <Clipboard size={15} />}
                        {copied ? "Copied to clipboard" : "Copy handoff"}
                      </button>
                      <textarea
                        className="handoff-text"
                        readOnly
                        aria-label="Handoff text"
                        value={handoff(incident)}
                        data-testid="text-handoff"
                      />
                    </section>
                  )}
                </div>
                <div className="context-action">
                  {incident.phase !== "Closed" ? (
                    <>
                      <span>Next: operator decision</span>
                      <button
                        className="primary"
                        onClick={openPhase}
                        disabled={
                          mutation.isPending ||
                          (incident.phase === "Intake" &&
                            !incident.observations.length)
                        }
                        data-testid="button-advance"
                      >
                        {incident.phase === "Intake"
                          ? "Begin triage"
                          : incident.phase === "Triage"
                            ? "Escalate incident"
                            : incident.phase === "Escalated"
                              ? "Prepare handoff"
                              : "Close incident"}
                        <ArrowRight size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="closed-label">
                      <Check size={16} />
                      Closed by operator. History retained.
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
      {modal && (
        <dialog
          ref={dialog}
          onClose={() => {
            setModal(null);
            setError("");
          }}
          className="modal"
        >
          <div className="modal-heading">
            <h2>
              {modal === "new"
                ? "Create an incident"
                : modal === "phase"
                  ? "Confirm workflow change"
                  : "Architecture & limitations"}
            </h2>
            <button
              className="icon-button"
              aria-label="Close dialog"
              onClick={() => {
                setModal(null);
                setError("");
              }}
              data-testid="button-close-dialog"
            >
              <X size={18} />
            </button>
          </div>
          {modal === "new" ? (
            <form
              onSubmit={create}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  (e.target as HTMLElement).tagName === "INPUT"
                ) {
                  e.preventDefault();
                  void create(e);
                }
              }}
            >
              <p className="modal-description">
                Use fictional or sanitized information only.
              </p>
              <label>
                Incident title
                <input
                  autoFocus
                  value={form.title}
                  maxLength={100}
                  required
                  minLength={4}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  data-testid="input-new-title"
                />
              </label>
              <div className="form-grid">
                <label>
                  Site
                  <input
                    value={form.site}
                    required
                    minLength={2}
                    maxLength={40}
                    onChange={(e) => setForm({ ...form, site: e.target.value })}
                    data-testid="input-new-site"
                  />
                </label>
                <label>
                  Asset / rack
                  <input
                    value={form.asset}
                    maxLength={60}
                    onChange={(e) =>
                      setForm({ ...form, asset: e.target.value })
                    }
                    data-testid="input-new-asset"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as NewIncident["category"],
                      })
                    }
                    data-testid="select-new-category"
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Severity
                  <select
                    value={form.severity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        severity: e.target.value as NewIncident["severity"],
                      })
                    }
                    data-testid="select-new-severity"
                  >
                    {["SEV 1", "SEV 2", "SEV 3"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              {error && (
                <p className="inline-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary modal-submit"
                type="button"
                onClick={create}
                disabled={mutation.isPending}
                data-testid="button-create"
              >
                {mutation.isPending ? "Creating…" : "Create incident"}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : modal === "phase" ? (
            <form onSubmit={transition}>
              <p className="modal-description">
                You control this change. This records a phase only: it does not
                notify anyone, send a ticket, or verify recovery.
              </p>
              <label>
                Next phase
                <select
                  value={next}
                  onChange={(e) => setNext(e.target.value as Phase)}
                  data-testid="select-next-phase"
                >
                  <option>{next}</option>
                  {incident?.phase === "Triage" && next !== "Handoff" && (
                    <option>Handoff</option>
                  )}
                  {incident?.phase === "Triage" && next !== "Escalated" && (
                    <option>Escalated</option>
                  )}
                </select>
              </label>
              <label>
                Operator note
                <textarea
                  value={note}
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder={
                    next === "Closed"
                      ? "Record recovery verification evidence and responsible owner…"
                      : "Record the reason, evidence, and intended owner…"
                  }
                  onChange={(e) => setNote(e.target.value)}
                  data-testid="input-phase-note"
                />
              </label>
              {error && (
                <p className="inline-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary modal-submit"
                type="button"
                onClick={transition}
                disabled={mutation.isPending}
                data-testid="button-confirm-phase"
              >
                Confirm {next.toLowerCase()}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="about-content">
              <p>
                <strong>
                  {data?.mode === "simulation"
                    ? "Simulation mode is active."
                    : "Workers AI mode is active."}
                </strong>{" "}
                {data?.mode === "simulation"
                  ? "Responses are deterministic, not model-generated. The incident workflow and persistent state use the real Worker and Durable Object runtime."
                  : "Advisory responses use the Workers AI binding and Llama 3.3. Model output may be incorrect."}
              </p>
              <dl>
                <div>
                  <dt>Input</dt>
                  <dd>React chat, operator-supplied observations</dd>
                </div>
                <div>
                  <dt>Coordination</dt>
                  <dd>Worker routes and explicit phase transitions</dd>
                </div>
                <div>
                  <dt>Memory</dt>
                  <dd>SQLite-backed Durable Object per workspace</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{data?.model}</dd>
                </div>
              </dl>
              <p>
                There are no infrastructure tools, ticket integrations,
                authenticated telemetry, or automated remediation. Safety
                filtering reduces risk but is not a safety guarantee.
              </p>
              <p>
                The URL fragment contains your workspace capability. Anyone with
                the full URL can access this demo workspace. Use fictional data
                only; do not share its URL as an access-controlled production
                tool.
              </p>
              <a
                href="https://developers.cloudflare.com/durable-objects/"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-cloudflare-docs"
              >
                Cloudflare Durable Objects documentation{" "}
                <ArrowRight size={14} />
              </a>
            </div>
          )}
        </dialog>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={query}>
    <App />
  </QueryClientProvider>,
);
