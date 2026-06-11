import { useState, useEffect, useRef, useCallback } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d - now) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
};

const priorityWeight = { high: 3, medium: 2, low: 1 };

const categoryEmoji = {
  personal: "🏠",
  study: "📚",
  work: "💼",
  shopping: "🛒",
  other: "📌",
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const STORAGE_KEY = "taskflow_tasks";
const THEME_KEY = "taskflow_theme";

const loadTasksFromStorage = () => {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : [];
  } catch {
    return [];
  }
};

const saveTasksToStorage = (tasks) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
};

// ── Logo SVG ─────────────────────────────────────────────────────────────────
const Logo = ({ dark }) => (
  <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8" style={{ flexShrink: 0 }}>
    <rect
      x="2" y="2" width="32" height="32" rx="8"
      stroke={dark ? "white" : "black"}
      strokeWidth="3"
    />
    <polyline
      points="11,18 16,23 25,13"
      stroke={dark ? "white" : "black"}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Global Styles ─────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      font-family: 'Inter', sans-serif;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }

    #root {
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-6px); }
      40%     { transform: translateX(6px); }
      60%     { transform: translateX(-4px); }
      80%     { transform: translateX(4px); }
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes celebPop {
      0%   { opacity: 0; transform: scale(0.7) translateY(20px); }
      60%  { transform: scale(1.05) translateY(-4px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    .lg-btn {
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.35);
      transition: all 0.22s cubic-bezier(.4,0,.2,1);
    }
    .lg-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 100%);
      pointer-events: none;
      border-radius: inherit;
    }
    .lg-btn::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 50%;
      background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%);
      pointer-events: none;
      border-radius: inherit;
    }
    .lg-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
    }
    .lg-btn:active { transform: translateY(1px) scale(0.98); }

    .lg-light {
      background: rgba(255,255,255,0.45);
      box-shadow: 0 4px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.8);
    }
    .lg-dark {
      background: rgba(38,38,40,0.65);
      border-color: rgba(255,255,255,0.12);
      box-shadow: 0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10);
    }
    .lg-dark::before {
      background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%);
    }
    .lg-dark::after {
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
    }

    .lg-primary-light {
      background: rgba(0,0,0,0.82);
      border-color: rgba(0,0,0,0.6);
      color: #fff;
    }
    .lg-primary-light::before {
      background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 100%);
    }
    .lg-primary-dark {
      background: rgba(255,255,255,0.88);
      border-color: rgba(255,255,255,0.5);
      color: #000;
    }
    .lg-primary-dark::before {
      background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 100%);
    }

    .lg-danger {
      background: rgba(220,38,38,0.75);
      border-color: rgba(254,202,202,0.4);
      color: white;
    }

    .lg-header-light {
      background: rgba(255,255,255,0.60);
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      border: 1px solid rgba(255,255,255,0.75);
      box-shadow: 0 4px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95);
    }
    .lg-header-dark {
      background: rgba(28,28,30,0.72);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 4px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08);
    }

    .animate-fadeInUp { animation: fadeInUp 0.35s ease both; }
    .animate-toastIn  { animation: toastIn 0.3s cubic-bezier(.34,1.56,.64,1) both; }
    .animate-celebPop { animation: celebPop 0.5s cubic-bezier(.34,1.56,.64,1) both; }

    /* Fix mobile overflow from date input */
    input[type="date"] {
      max-width: 100%;
    }

    /* Prevent any element from causing horizontal scroll */
    .no-overflow {
      overflow-x: hidden;
      max-width: 100%;
    }
  `}</style>
);

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const icons = {
    success: (
      <svg className="w-4 h-4" style={{ flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6,12 10,16 18,8" />
      </svg>
    ),
    danger: (
      <svg className="w-4 h-4" style={{ flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4" style={{ flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><circle cx="12" cy="8" r="0.5" fill="currentColor" />
      </svg>
    ),
  };

  const dotColor = type === "success" ? "bg-emerald-400" : type === "danger" ? "bg-red-400" : "bg-gray-400";

  return (
    <div className="animate-toastIn flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium pointer-events-auto"
      style={{
        background: "rgba(20,20,20,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
        color: "white",
        maxWidth: "calc(100vw - 48px)",
      }}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} style={{ flexShrink: 0 }} />
      {icons[type] || icons.info}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message}</span>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div style={{
    position: "fixed",
    bottom: "24px",
    right: "16px",
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "flex-end",
    pointerEvents: "none",
    maxWidth: "calc(100vw - 32px)",
  }}>
    {toasts.map((t) => (
      <Toast key={t.id} message={t.message} type={t.type} onDone={() => removeToast(t.id)} />
    ))}
  </div>
);

// ── Navbar ────────────────────────────────────────────────────────────────────
const Navbar = ({ dark, toggleDark, onHome, showHome }) => (
  <nav style={{
    position: "fixed",
    top: "12px",
    left: 0,
    right: 0,
    zIndex: 50,
    padding: "0 12px",
    width: "100%",
    boxSizing: "border-box",
  }}>
    <div
      className={dark ? "lg-header-dark" : "lg-header-light"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderRadius: "16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Left — logo + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <Logo dark={dark} />
        <span style={{
          fontWeight: 700,
          fontSize: "18px",
          letterSpacing: "-0.02em",
          color: dark ? "white" : "#111827",
          whiteSpace: "nowrap",
        }}>
          TaskFlow 👍
        </span>
      </div>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {showHome && (
          <button
            onClick={onHome}
            className={`lg-btn ${dark ? "lg-dark" : "lg-light"}`}
            style={{
              padding: "6px 14px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 500,
              color: dark ? "#e5e7eb" : "#1f2937",
              cursor: "pointer",
            }}
          >
            Home
          </button>
        )}

        <button
          onClick={toggleDark}
          aria-label="Toggle theme"
          className={`lg-btn ${dark ? "lg-dark" : "lg-light"}`}
          style={{
            padding: "8px",
            borderRadius: "12px",
            color: dark ? "white" : "#1f2937",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {dark ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  </nav>
);

// ── Modal base ────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, children, dark }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxSizing: "border-box",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-celebPop"
        style={{
          borderRadius: "24px",
          padding: "24px",
          width: "100%",
          maxWidth: "360px",
          background: dark ? "rgba(18,18,18,0.85)" : "rgba(255,255,255,0.82)",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.85)",
          boxShadow: dark
            ? "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)"
            : "0 32px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// ── Delete Modal ──────────────────────────────────────────────────────────────
const DeleteModal = ({ open, onClose, onConfirm, taskTitle, dark }) => (
  <Modal open={open} onClose={onClose} dark={dark}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)",
      }}>
        <svg style={{ width: "28px", height: "28px", color: dark ? "white" : "black" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </div>
      <div>
        <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px", color: dark ? "white" : "#111827" }}>Delete Task?</h3>
        <p style={{ fontSize: "14px", color: dark ? "#9ca3af" : "#4b5563" }}>
          {taskTitle ? `"${taskTitle.length > 30 ? taskTitle.slice(0, 30) + "…" : taskTitle}" will be removed.` : "This action cannot be undone."}
        </p>
      </div>
      <div style={{ display: "flex", gap: "12px", width: "100%" }}>
        <button
          onClick={onClose}
          className={`lg-btn ${dark ? "lg-dark" : "lg-light"}`}
          style={{ flex: 1, padding: "10px 16px", borderRadius: "12px", fontSize: "14px", fontWeight: 500, color: dark ? "#e5e7eb" : "#374151", cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="lg-btn lg-danger"
          style={{ flex: 1, padding: "10px 16px", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
        >
          Delete
        </button>
      </div>
    </div>
  </Modal>
);

// ── Celebration Modal ─────────────────────────────────────────────────────────
const CelebrationModal = ({ open, onClose, dark }) => (
  <Modal open={open} onClose={onClose} dark={dark}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
      <div style={{ fontSize: "48px" }} className="animate-bounce">✨</div>
      <h3 style={{ fontSize: "20px", fontWeight: 700, color: dark ? "white" : "#111827" }}>All Tasks Complete!</h3>
      <p style={{ fontSize: "14px", color: dark ? "#9ca3af" : "#4b5563" }}>
        You've accomplished all your goals. Amazing work! 🎉
      </p>
      <div style={{ display: "flex", gap: "8px", fontSize: "24px" }}>
        {["🎊","⭐","🌟","🎉","💫"].map((e, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.1}s` }} className="animate-bounce inline-block">{e}</span>
        ))}
      </div>
      <button
        onClick={onClose}
        className={`lg-btn ${dark ? "lg-primary-dark" : "lg-primary-light"}`}
        style={{ padding: "10px 32px", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
      >
        Continue
      </button>
    </div>
  </Modal>
);

// ── Add Task Modal ────────────────────────────────────────────────────────────
const AddTaskModal = ({ open, onClose, onAdd, dark }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("personal");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const handleAdd = () => {
    if (!title.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      inputRef.current?.focus();
      return;
    }
    onAdd({ title: title.trim(), category, priority, due: due || null });
    setTitle(""); setCategory("personal"); setPriority("medium"); setDue("");
    onClose();
  };

  const today = new Date().toISOString().split("T")[0];

  const fieldStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "12px",
    fontSize: "14px",
    border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.10)",
    outline: "none",
    background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    color: dark ? "white" : "#111827",
    boxSizing: "border-box",
    WebkitAppearance: "none",
    appearance: "none",
  };

  return (
    <Modal open={open} onClose={onClose} dark={dark}>
      <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: dark ? "white" : "#111827" }}>New Task</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="What needs to be done?"
          aria-label="New task title"
          style={{
            ...fieldStyle,
            padding: "12px 16px",
            animation: shake ? "shake 0.3s ease" : "none",
          }}
        />
        {/* Stacked selects on mobile for better UX */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" style={fieldStyle}>
            <option value="personal">🏠 Personal</option>
            <option value="study">📚 Study</option>
            <option value="work">💼 Work</option>
            <option value="shopping">🛒 Shopping</option>
            <option value="other">📌 Other</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority" style={fieldStyle}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <input
          type="date"
          value={due}
          min={today}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date"
          style={{ ...fieldStyle, colorScheme: dark ? "dark" : "light" }}
        />
      </div>
      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button
          onClick={onClose}
          className={`lg-btn ${dark ? "lg-dark" : "lg-light"}`}
          style={{ flex: 1, padding: "10px 16px", borderRadius: "12px", fontSize: "14px", fontWeight: 500, color: dark ? "#e5e7eb" : "#374151", cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          className={`lg-btn ${dark ? "lg-primary-dark" : "lg-primary-light"}`}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 16px", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Task
        </button>
      </div>
    </Modal>
  );
};

// ── Task Item ─────────────────────────────────────────────────────────────────
const priorityStripe = { high: "#111827", medium: "#6b7280", low: "#d1d5db" };
const priorityStripeDark = { high: "#ffffff", medium: "#9ca3af", low: "#4b5563" };

const TaskItem = ({ task, dark, onToggle, onDelete, onEdit, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, animDelay }) => {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.title);
  const editRef = useRef();

  useEffect(() => {
    if (editing) { setTimeout(() => { editRef.current?.focus(); editRef.current?.select(); }, 30); }
  }, [editing]);

  const finishEdit = (save) => {
    if (save) {
      const val = editVal.trim();
      if (val && val !== task.title) onEdit(task.id, val);
    } else {
      setEditVal(task.title);
    }
    setEditing(false);
  };

  const dueDateStr = task.due ? formatDate(task.due) : "";
  const overdue = task.due && !task.completed && isOverdue(task.due);
  const stripes = dark ? priorityStripeDark : priorityStripe;

  return (
    <li
      data-id={task.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        animationDelay: `${animDelay}ms`,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "16px",
        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.70)",
        opacity: task.completed ? 0.55 : 1,
        cursor: "grab",
        width: "100%",
        boxSizing: "border-box",
        listStyle: "none",
      }}
      className="animate-fadeInUp"
    >
      {/* Priority stripe */}
      <div style={{
        width: "4px",
        alignSelf: "stretch",
        borderRadius: "4px",
        flexShrink: 0,
        background: stripes[task.priority],
      }} />

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`lg-btn ${task.completed ? (dark ? "lg-primary-dark" : "lg-primary-light") : (dark ? "lg-dark" : "lg-light")}`}
        style={{
          flexShrink: 0,
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {task.completed && (
          <svg style={{ width: "14px", height: "14px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,12 10,16 18,8" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={editRef}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); finishEdit(true); }
              if (e.key === "Escape") { e.preventDefault(); finishEdit(false); }
            }}
            onBlur={() => finishEdit(true)}
            aria-label="Edit task title"
            style={{
              width: "100%",
              padding: "4px 8px",
              borderRadius: "8px",
              fontSize: "14px",
              border: dark ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(0,0,0,0.15)",
              outline: "none",
              background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)",
              color: dark ? "white" : "#111827",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: task.completed ? "line-through" : "none",
              color: dark ? "#f3f4f6" : "#111827",
            }}
          >
            {task.title}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "2px",
            padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 500,
            background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
            color: dark ? "#d1d5db" : "#374151",
          }}>
            {categoryEmoji[task.category]} {capitalize(task.category)}
          </span>
          <span style={{
            padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 500,
            background: task.priority === "high"
              ? dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"
              : task.priority === "medium"
              ? dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"
              : dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            color: task.priority === "high"
              ? dark ? "white" : "#111827"
              : task.priority === "medium"
              ? dark ? "#d1d5db" : "#374151"
              : dark ? "#6b7280" : "#6b7280",
          }}>
            {capitalize(task.priority)}
          </span>
          {dueDateStr && (
            <span style={{
              padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 500,
              background: overdue ? "rgba(239,68,68,0.20)" : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              color: overdue ? "#ef4444" : dark ? "#9ca3af" : "#6b7280",
            }}>
              {overdue ? "⚠ " : "📅 "}{dueDateStr}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit task"
          className={`lg-btn ${dark ? "lg-dark" : "lg-light"}`}
          style={{ padding: "6px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#d1d5db" : "#4b5563" }}
        >
          <svg style={{ width: "14px", height: "14px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
          className="lg-btn lg-danger"
          style={{ padding: "6px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg style={{ width: "14px", height: "14px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </li>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ dark }) => (
  <div style={{
    borderRadius: "24px",
    border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.10)",
    minHeight: "320px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "48px 24px",
    background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.70)",
  }}>
    <svg style={{ width: "80px", height: "80px", marginBottom: "24px", color: dark ? "#6b7280" : "#9ca3af" }} viewBox="0 0 80 80" fill="none">
      <rect x="20" y="10" width="40" height="52" rx="6" stroke="currentColor" strokeWidth="3" />
      <rect x="32" y="6" width="16" height="8" rx="4" fill="currentColor" opacity="0.4" />
      <line x1="30" y1="30" x2="50" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="40" x2="44" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <polyline points="28,50 34,56 52,42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <h2 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "12px", color: dark ? "white" : "#111827" }}>All Clear!</h2>
    <p style={{ fontSize: "15px", color: dark ? "#9ca3af" : "#6b7280" }}>Add your first task to get started</p>
  </div>
);

// ── App Page ──────────────────────────────────────────────────────────────────
const AppPage = ({ dark, toggleDark, onHome, addToast }) => {
  const [tasks, setTasks] = useState(loadTasksFromStorage);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [celebOpen, setCelebOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const prevAllDone = useRef(false);
  const dragSrcId = useRef(null);

  useEffect(() => { saveTasksToStorage(tasks); }, [tasks]);

  useEffect(() => {
    const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
    if (allDone && !prevAllDone.current) setTimeout(() => setCelebOpen(true), 300);
    prevAllDone.current = allDone;
  }, [tasks]);

  const addTask = ({ title, category, priority, due }) => {
    const t = { id: uid(), title, completed: false, category, priority, due, createdAt: Date.now(), order: tasks.length };
    setTasks((prev) => [t, ...prev]);
    addToast("Task added", "success");
  };

  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
    addToast(task?.completed ? "Task uncompleted" : "Task completed!", "success");
  };

  const editTask = (id, newTitle) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, title: newTitle } : t));
    addToast("Task updated", "info");
  };

  const confirmDelete = () => {
    setTasks((prev) => prev.filter((t) => t.id !== deleteTarget));
    addToast("Task deleted", "danger");
    setDeleteTarget(null);
  };

  const handleDragStart = (e, id) => {
    dragSrcId.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.5";
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.style.outline = "2px solid rgba(128,128,128,0.5)";
    e.currentTarget.style.outlineOffset = "2px";
  };
  const handleDragLeave = (e) => {
    e.currentTarget.style.outline = "";
    e.currentTarget.style.outlineOffset = "";
  };
  const handleDrop = (e, destId) => {
    e.preventDefault();
    e.currentTarget.style.outline = "";
    e.currentTarget.style.outlineOffset = "";
    if (!dragSrcId.current || dragSrcId.current === destId) return;
    setTasks((prev) => {
      const arr = [...prev];
      const srcIdx = arr.findIndex((t) => t.id === dragSrcId.current);
      const dstIdx = arr.findIndex((t) => t.id === destId);
      if (srcIdx === -1 || dstIdx === -1) return prev;
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(dstIdx, 0, moved);
      arr.forEach((t, i) => (t.order = i));
      return arr;
    });
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
    dragSrcId.current = null;
  };

  const visibleTasks = (() => {
    let list = [...tasks];
    if (filter === "active") list = list.filter((t) => !t.completed);
    else if (filter === "completed") list = list.filter((t) => t.completed);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    switch (sort) {
      case "newest":   list.sort((a, b) => b.createdAt - a.createdAt); break;
      case "oldest":   list.sort((a, b) => a.createdAt - b.createdAt); break;
      case "priority": list.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]); break;
      case "due":      list.sort((a, b) => { if (!a.due && !b.due) return 0; if (!a.due) return 1; if (!b.due) return -1; return new Date(a.due) - new Date(b.due); }); break;
      case "completed": list.sort((a, b) => Number(a.completed) - Number(b.completed)); break;
    }
    return list;
  })();

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const deleteTask = tasks.find((t) => t.id === deleteTarget);
  const filterBtns = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Done" },
  ];

  const glassCard = dark ? {
    background: "rgba(38,38,40,0.55)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
  } : {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.85)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "12px",
    fontSize: "14px",
    border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
    outline: "none",
    background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    color: dark ? "white" : "#111827",
    boxSizing: "border-box",
    WebkitAppearance: "none",
    appearance: "none",
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      maxWidth: "100vw",
      overflowX: "hidden",
      background: dark ? "#1c1c1e" : "linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)",
      boxSizing: "border-box",
    }}>
      <Navbar dark={dark} toggleDark={toggleDark} onHome={onHome} showHome={true} />

      <div style={{
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto",
        padding: "80px 16px 100px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>

        {/* Stats */}
        <div style={{ ...glassCard, borderRadius: "24px", padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "12px" }}>
            {[
              { label: "Total", value: total, color: dark ? "white" : "#10b981" },
              { label: "Pending", value: pending, color: dark ? "white" : "#f59e0b" },
              { label: "Done", value: completed, color: dark ? "white" : "#10b981" },
              { label: "Progress", value: `${pct}%`, color: dark ? "white" : "#111827" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="lg-btn"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "14px 8px",
                  borderRadius: "16px",
                  background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
                  border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.07)",
                  boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1, color }}>{value}</span>
                <span style={{ fontSize: "11px", marginTop: "6px", fontWeight: 500, color: dark ? "#9ca3af" : "#6b7280" }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 4px" }}>
            <div style={{ flex: 1, height: "8px", borderRadius: "999px", overflow: "hidden", background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)" }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: "999px",
                background: dark ? "white" : "#10b981",
                transition: "width 0.7s ease",
              }} />
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, flexShrink: 0, color: dark ? "#9ca3af" : "#374151" }}>{pct}%</span>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ ...glassCard, borderRadius: "24px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg style={{
              position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
              width: "16px", height: "16px", color: "#9ca3af", pointerEvents: "none",
            }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              style={{ ...inputStyle, paddingLeft: "36px" }}
            />
          </div>

          {/* Filter + Sort + Delete All */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Sliding filter pill */}
            <div style={{
              position: "relative",
              display: "flex",
              borderRadius: "12px",
              overflow: "hidden",
              border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "33.333%",
                borderRadius: "10px",
                background: dark ? "white" : "#10b981",
                transform: filter === "all" ? "translateX(0%)" : filter === "active" ? "translateX(100%)" : "translateX(200%)",
                transition: "transform 0.4s cubic-bezier(.22,1,.36,1)",
              }} />
              {filterBtns.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    padding: "7px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    color: filter === key ? (dark ? "black" : "white") : (dark ? "#9ca3af" : "#374151"),
                    transition: "color 0.3s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort tasks"
              style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: "13px", flex: 1, minWidth: "100px" }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority ↓</option>
              <option value="due">Due Date</option>
              <option value="completed">Completed</option>
            </select>

            <button
              onClick={() => setDeleteAllOpen(true)}
              style={{
                padding: "7px 12px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                border: dark ? "1px solid rgba(239,68,68,0.30)" : "1px solid rgba(239,68,68,0.20)",
                background: dark ? "rgba(239,68,68,0.20)" : "rgba(239,68,68,0.08)",
                color: dark ? "#fca5a5" : "#dc2626",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Delete All
            </button>
          </div>
        </div>

        {/* Task list */}
        <ul style={{ display: "flex", flexDirection: "column", gap: "8px", padding: 0, margin: 0, width: "100%" }} role="list" aria-label="Task list">
          {visibleTasks.length === 0 ? (
            <EmptyState dark={dark} />
          ) : (
            visibleTasks.map((task, i) => (
              <TaskItem
                key={task.id}
                task={task}
                dark={dark}
                animDelay={i * 40}
                onToggle={toggleTask}
                onDelete={(id) => setDeleteTarget(id)}
                onEdit={editTask}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </ul>

        <footer style={{ marginTop: "16px", paddingTop: "16px", borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>
            <span style={{ fontWeight: 600 }}>Developed by Dasari Vamsi Krishna</span>
            {" · "}All rights reserved © 2026
          </p>
        </footer>
      </div>

      {/* Modals */}
      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addTask} dark={dark} />
      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        taskTitle={deleteTask?.title}
        dark={dark}
      />
      <DeleteModal
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={() => {
          setTasks([]);
          addToast("All tasks deleted", "danger");
          setDeleteAllOpen(false);
        }}
        taskTitle="All Tasks"
        dark={dark}
      />

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Add new task"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "20px",
          zIndex: 50,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: dark ? "white" : "#10b981",
          color: dark ? "black" : "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg style={{ width: "28px", height: "28px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <CelebrationModal open={celebOpen} onClose={() => setCelebOpen(false)} dark={dark} />
    </div>
  );
};

// ── Home Page ─────────────────────────────────────────────────────────────────
const HomePage = ({ dark, toggleDark, onEnter }) => (
  <div style={{
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100vw",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 16px 32px",
    boxSizing: "border-box",
    background: dark ? "#1c1c1e" : "linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)",
    position: "relative",
  }}>
    <Navbar dark={dark} toggleDark={toggleDark} showHome={false} />

    {/* Decorative blobs */}
    <div style={{
      position: "absolute", top: "80px", left: "-80px",
      width: "280px", height: "280px", borderRadius: "50%",
      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
      filter: "blur(40px)", pointerEvents: "none",
    }} />
    <div style={{
      position: "absolute", bottom: "80px", right: "-80px",
      width: "320px", height: "320px", borderRadius: "50%",
      background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
      filter: "blur(40px)", pointerEvents: "none",
    }} />

    {/* Hero card */}
    <div
      style={{
        position: "relative",
        zIndex: 1,
        borderRadius: "28px",
        padding: "40px 32px",
        textAlign: "center",
        width: "100%",
        maxWidth: "360px",
        background: dark ? "rgba(18,18,18,0.72)" : "rgba(255,255,255,0.72)",
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(255,255,255,0.95)",
        boxShadow: dark
          ? "0 40px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)"
          : "0 40px 100px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,1)",
        animation: "fadeInUp 0.7s cubic-bezier(.34,1.56,.64,1) both",
        boxSizing: "border-box",
      }}
    >
      {/* Icon */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "24px",
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          backdropFilter: "blur(12px)",
          border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.10)",
          boxShadow: dark
            ? "inset 0 1px 0 rgba(255,255,255,0.18)"
            : "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(0,0,0,0.08)",
        }}>
          <Logo dark={dark} />
        </div>
      </div>

      <h1 style={{ fontSize: "30px", fontWeight: 700, marginBottom: "12px", letterSpacing: "-0.02em", color: dark ? "white" : "#111827" }}>
        To-do list
      </h1>
      <p style={{ fontSize: "16px", marginBottom: "32px", color: dark ? "#9ca3af" : "#6b7280" }}>
        Stay organised, stay ahead ✨
      </p>

      <button
        onClick={onEnter}
        className={`lg-btn ${dark ? "lg-primary-dark" : "lg-primary-light"}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 32px",
          borderRadius: "999px",
          fontSize: "16px",
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <span>Get Started</span>
        <svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>

    <footer style={{ marginTop: "32px", textAlign: "center" }}>
      <p style={{ fontSize: "12px", color: "#6b7280" }}>
        <span style={{ fontWeight: 600 }}>Developed by Dasari Vamsi Krishna</span>
        {" · "}All rights reserved © 2026
      </p>
    </footer>
  </div>
);

// ── Root ──────────────────────────────────────────────────────────────────────
export default function TaskFlow() {
  const [page, setPage] = useState("home");
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch { return false; }
  });
  const [toasts, setToasts] = useState([]);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch {}
      return next;
    });
  };

  const addToast = useCallback((message, type = "info") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      <GlobalStyles />
      {page === "home" ? (
        <HomePage dark={dark} toggleDark={toggleDark} onEnter={() => setPage("app")} />
      ) : (
        <AppPage dark={dark} toggleDark={toggleDark} onHome={() => setPage("home")} addToast={addToast} />
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}