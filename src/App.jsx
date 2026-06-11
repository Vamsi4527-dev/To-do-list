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
  <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
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

// ── Liquid Glass CSS ──────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    * { font-family: 'Inter', sans-serif; }

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

    /* ── Liquid Glass base ── */
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

    /* Light mode glass */
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

    /* Primary CTA glass (white bg on dark, black bg on light) */
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

    /* Danger glass */
    .lg-danger {
      background: rgba(220,38,38,0.75);
      border-color: rgba(254,202,202,0.4);
      color: white;
    }

    /* Header/Navbar glass */
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
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6,12 10,16 18,8" />
      </svg>
    ),
    danger: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      }}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      {icons[type] || icons.info}
      <span>{message}</span>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
    {toasts.map((t) => (
      <Toast key={t.id} message={t.message} type={t.type} onDone={() => removeToast(t.id)} />
    ))}
  </div>
);

// ── Navbar ────────────────────────────────────────────────────────────────────
const Navbar = ({ dark, toggleDark, onHome, showHome, onAddTask }) => (
  <nav className="fixed top-3 left-0 right-0 z-50 px-4">
    <div className={`flex items-center justify-between px-6 py-4 rounded-2xl ${dark ? "lg-header-dark" : "lg-header-light"}`}>
      {/* Left — logo + title */}
      <div className="flex items-center gap-2.5">
        <Logo dark={dark} />
        <span className={`font-bold text-lg tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
          TaskFlow
        </span>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {showHome && (
          <button
            onClick={onHome}
            className={`lg-btn px-3.5 py-1.5 rounded-xl text-sm font-medium ${dark ? "lg-dark text-gray-200" : "lg-light text-gray-800"}`}
          >
            Home
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleDark}
          aria-label="Toggle theme"
          className={`lg-btn p-2 rounded-xl ${dark ? "lg-dark text-white" : "lg-light text-gray-800"}`}
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`animate-celebPop rounded-3xl shadow-2xl p-6 w-full max-w-sm`}
        style={{
          background: dark ? "rgba(18,18,18,0.85)" : "rgba(255,255,255,0.82)",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.85)",
          boxShadow: dark
            ? "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)"
            : "0 32px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1)",
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
    <div className="flex flex-col items-center text-center gap-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${dark ? "bg-white/10" : "bg-black/5"}`}>
        <svg className={`w-7 h-7 ${dark ? "text-white" : "text-black"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </div>
      <div>
        <h3 className={`text-lg font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Delete Task?</h3>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
          {taskTitle ? `"${taskTitle.length > 30 ? taskTitle.slice(0, 30) + "…" : taskTitle}" will be removed.` : "This action cannot be undone."}
        </p>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onClose}
          className={`lg-btn flex-1 px-4 py-2.5 rounded-xl text-sm font-medium ${dark ? "lg-dark text-gray-200" : "lg-light text-gray-700"}`}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="lg-btn lg-danger flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold"
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
    <div className="flex flex-col items-center text-center gap-4">
      <div className="text-5xl animate-bounce">✨</div>
      <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>All Tasks Complete!</h3>
      <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
        You've accomplished all your goals. Amazing work! 🎉
      </p>
      <div className="flex gap-2 text-2xl">
        {["🎊","⭐","🌟","🎉","💫"].map((e, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.1}s` }} className="animate-bounce inline-block">{e}</span>
        ))}
      </div>
      <button
        onClick={onClose}
        className={`lg-btn px-8 py-2.5 rounded-xl text-sm font-semibold ${dark ? "lg-primary-dark" : "lg-primary-light"}`}
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

  const fieldClass = `w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${
    dark
      ? "bg-white/5 border-white/15 text-white placeholder-white/30 focus:border-white/40"
      : "bg-black/5 border-black/10 text-gray-900 placeholder-gray-500 focus:border-black/30"
  }`;

  return (
    <Modal open={open} onClose={onClose} dark={dark}>
      <h3 className={`text-lg font-bold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>New Task</h3>
      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="What needs to be done?"
          aria-label="New task title"
          className={`${fieldClass} px-4 py-3 ${shake ? "animate-[shake_0.3s_ease]" : ""}`}
        />
        <div className="grid grid-cols-3 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={fieldClass}>
            <option value="personal">🏠 Personal</option>
            <option value="study">📚 Study</option>
            <option value="work">💼 Work</option>
            <option value="shopping">🛒 Shopping</option>
            <option value="other">📌 Other</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority" className={fieldClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={due}
            min={today}
            onChange={(e) => setDue(e.target.value)}
            aria-label="Due date"
            className={fieldClass}
          />
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className={`lg-btn flex-1 px-4 py-2.5 rounded-xl text-sm font-medium ${dark ? "lg-dark text-gray-200" : "lg-light text-gray-700"}`}
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          className={`lg-btn flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${dark ? "lg-primary-dark" : "lg-primary-light"}`}
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
const priorityStipe = { high: "bg-black", medium: "bg-gray-500", low: "bg-gray-300" };
const priorityStipeDark = { high: "bg-white", medium: "bg-gray-400", low: "bg-gray-600" };

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
  const stripes = dark ? priorityStipeDark : priorityStipe;

  return (
    <li
      data-id={task.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{ animationDelay: `${animDelay}ms` }}
      className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing animate-fadeInUp ${
        task.completed ? "opacity-55" : ""
      } ${
        dark
          ? "bg-white/5 border-white/8 hover:border-white/20 hover:bg-white/8"
          : "bg-white/70 border-black/8 hover:border-black/15 hover:shadow-sm"
      }`}
    >
      {/* Priority stripe */}
      <div className={`w-1 self-stretch rounded-full shrink-0 ${stripes[task.priority]}`} />

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`lg-btn shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
          task.completed
            ? dark ? "lg-primary-dark" : "lg-primary-light"
            : dark ? "lg-dark" : "lg-light"
        }`}
      >
        {task.completed && (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,12 10,16 18,8" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
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
            className={`w-full px-2 py-1 rounded-lg text-sm border outline-none ${
              dark ? "bg-white/10 border-white/20 text-white" : "bg-black/5 border-black/15 text-gray-900"
            }`}
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`block text-sm font-medium truncate ${task.completed ? "line-through" : ""} ${dark ? "text-gray-100" : "text-gray-900"}`}
          >
            {task.title}
          </span>
        )}
        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${dark ? "bg-white/10 text-gray-300" : "bg-black/8 text-gray-700"}`}>
            {categoryEmoji[task.category]} {capitalize(task.category)}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            task.priority === "high"
              ? dark ? "bg-white/15 text-white" : "bg-black/15 text-gray-900"
              : task.priority === "medium"
              ? dark ? "bg-white/10 text-gray-300" : "bg-black/8 text-gray-700"
              : dark ? "bg-white/6 text-gray-500" : "bg-black/5 text-gray-600"
          }`}>
            {capitalize(task.priority)}
          </span>
          {dueDateStr && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              overdue
                ? "bg-red-500/20 text-red-600"
                : dark ? "bg-white/8 text-gray-400" : "bg-black/6 text-gray-600"
            }`}>
              {overdue ? "⚠ " : "📅 "}{dueDateStr}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit task"
          title="Edit"
          className={`lg-btn p-1.5 rounded-lg ${dark ? "lg-dark text-gray-300" : "lg-light text-gray-600"}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
          title="Delete"
          className="lg-btn lg-danger p-1.5 rounded-lg"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  <div
    className={`rounded-3xl border min-h-[380px] flex flex-col items-center justify-center text-center p-12 ${
      dark
        ? "bg-white/[0.03] border-white/10"
        : "bg-white/70 border-black/10"
    }`}
  >
    <svg
      className={`w-24 h-24 mb-6 ${
        dark ? "text-gray-500" : "text-gray-400"
      }`}
      viewBox="0 0 80 80"
      fill="none"
    >
      <rect x="20" y="10" width="40" height="52" rx="6" stroke="currentColor" strokeWidth="3" />
      <rect x="32" y="6" width="16" height="8" rx="4" fill="currentColor" opacity="0.4" />
      <line x1="30" y1="30" x2="50" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="40" x2="44" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <polyline points="28,50 34,56 52,42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

    <h2
      className={`text-4xl font-bold mb-3 ${
        dark ? "text-white" : "text-gray-900"
      }`}
    >
      All Clear!
    </h2>

    <p
      className={`text-base ${
        dark ? "text-gray-400" : "text-gray-500"
      }`}
    >
      Add your first task to get started
    </p>
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
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
    e.currentTarget.classList.add("opacity-50", "scale-95");
  };
  const handleDragOver = (e) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
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
    e.currentTarget.classList.remove("opacity-50", "scale-95");
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
  const filterBtns = ["all", "active", "completed"];

  const cardBase = dark
    ? "bg-white/4 border-white/8 backdrop-blur-sm"
    : "bg-white/75 border-black/6 backdrop-blur-sm shadow-sm";

  return (
    <div className={`min-h-screen transition-colors ${!dark ? "bg-gradient-to-br from-gray-50 via-white to-gray-100" : ""}`} style={dark ? { background: "#1c1c1e" } : {}}>
      <Navbar dark={dark} toggleDark={toggleDark} onHome={onHome} showHome onAddTask={() => setAddOpen(true)} />

      <div className="w-full max-w-2xl mx-auto px-4 pt-24 pb-8 flex flex-col gap-4 min-h-[calc(100vh-120px)] overflow-x-hidden">

        {/* Stats — outer glass wrapper with 4 individual cards + progress bar */}
        <div
          className="rounded-3xl p-4 border"
          style={dark ? {
            background: "rgba(38,38,40,0.55)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
          } : {
            background: "rgba(255,255,255,0.60)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
          }}
        >
          {/* 4 individual stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            {[
              { label: "Total",    value: total },
              { label: "Pending",  value: pending },
              { label: "Done",     value: completed },
              { label: "Progress", value: `${pct}%` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="lg-btn flex flex-col items-center py-4 px-3 rounded-2xl border"
                style={dark ? {
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                } : {
                  background: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
                }}
              >
                <span className={`text-2xl font-bold leading-none tracking-tight ${
                  dark
                    ? "text-white"
                    : label === "Pending"
                        ? "text-amber-500"
                        : label === "Progress"
                            ? "text-gray-900"
                            : "text-emerald-500"
                  }`}>{value}
                </span>
                <span className={`text-xs mt-2 font-medium ${dark ? "text-gray-400" : "text-gray-600"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Progress bar inside wrapper */}
          <div className="flex items-center gap-3 px-1">
            <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-black/8"}`}>
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                    dark ? "bg-white" : "bg-emerald-500"
                    }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-xs font-semibold tabular-nums shrink-0 ${dark ? "text-gray-400" : "text-gray-700"}`}>
              {pct}%
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className={`rounded-3xl border p-5 flex flex-col gap-4 ${cardBase}`}>
          <div className="relative flex-1">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? "text-gray-500" : "text-gray-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border outline-none transition-colors ${
                dark
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-white/25"
                  : "bg-black/4 border-black/8 text-gray-900 placeholder-gray-500 focus:border-black/20"
              }`}
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Filter buttons */}
                        <div
              className={`relative flex rounded-xl overflow-hidden border ${
                dark ? "border-white/10" : "border-black/8"
              }`}
            >
              {/* Sliding Pill */}
              <div
                className={`absolute top-0 bottom-0 rounded-xl transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]
                  ${
                    dark
                      ? "bg-white"
                      : "bg-emerald-500"
                  }`}
                style={{
                  width: "33.333%",
                  transform:
                    filter === "all"
                      ? "translateX(0%)"
                      : filter === "active"
                      ? "translateX(100%)"
                      : "translateX(200%)",
                }}
              />

              {filterBtns.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`relative z-10 px-4 py-2 text-xs font-semibold rounded-full flex-1 transition-colors duration-300 ${
                    filter === f
                      ? dark
                        ? "text-black"
                        : "text-white"
                      : dark
                        ? "text-gray-400"
                        : "text-gray-700"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "active"
                    ? "Active"
                    : "Done"}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort tasks"
              className={`px-3 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
                dark
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-black/4 border-black/8 text-gray-900"
              }`}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority ↓</option>
              <option value="due">Due Date</option>
              <option value="completed">Completed</option>
            </select>
            <button
  onClick={() => setDeleteAllOpen(true)}
  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
    dark
      ? "bg-red-500/20 text-red-300 border border-red-500/30"
      : "bg-red-100 text-red-600 border border-red-200"
  }`}
>
  Delete All
</button>
          </div>
        </div>

        {/* Task list */}
        <ul className="flex flex-col gap-2" role="list" aria-label="Task list">
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
        <footer className="mt-auto pt-6 border-t border-white/10 text-center">
        <p className="text-xs text-gray-500">
          <span className="font-semibold">
            Developed by Dasari Vamsi Krishna
          </span>
          {" · "}
          All rights reserved © 2026
        </p>
      </footer>
      </div>
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
      <button
  onClick={() => setAddOpen(true)}
  className={`fixed bottom-6 right-6 z-50 w-18 h-18 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 ${
    dark
      ? "bg-white text-black"
      : "bg-emerald-500 text-white"
  }`}
>
  <svg
    className="w-8 h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
  >
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
  <div className={`min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden transition-colors ${!dark ? "bg-gradient-to-br from-white via-gray-50 to-gray-100" : ""}`} style={dark ? { background: "#1c1c1e" } : {}}>
    <Navbar dark={dark} toggleDark={toggleDark} showHome={false} />

    {/* Subtle decorative blobs */}
    <div className={`absolute top-20 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none ${dark ? "bg-white/3" : "bg-black/4"}`} />
    <div className={`absolute bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${dark ? "bg-white/2" : "bg-black/3"}`} />

    <div
      className="relative z-10 rounded-3xl p-10 text-center max-w-md w-full"
      style={{
        background: dark ? "rgba(18,18,18,0.72)" : "rgba(255,255,255,0.72)",
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(255,255,255,0.95)",
        boxShadow: dark
          ? "0 40px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)"
          : "0 40px 100px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,1)",
        animation: "fadeInUp 0.7s cubic-bezier(.34,1.56,.64,1) both",
      }}
    >
      <div className="flex justify-center mb-6">
        <div
          className="w-18 h-18 md:w-16 md:h-16 rounded-2xl flex items-center justify-center backdrop-blur-xl"
          style={{
            background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            backdropFilter: "blur(12px)",
            border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.10)",
            boxShadow: dark
              ? "inset 0 1px 0 rgba(255,255,255,0.18)"
              : "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          <Logo dark={dark} />
        </div>
      </div>
      <h1 className={`text-3xl font-bold mb-3 tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
        To-do list
      </h1>
      <p className={`text-base mb-8 ${dark ? "text-gray-400" : "text-gray-600"}`}>
        Stay organised, stay ahead ✨
      </p>
      <button
        onClick={onEnter}
        className={`lg-btn inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-base font-semibold ${dark ? "lg-primary-dark" : "lg-primary-light"}`}
      >
        <span>Get Started</span>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>

    <footer className="w-full max-w-md mt-8 pt-5 border-t border-black/10 dark:border-white/10 text-center">
  <p className={`text-xs ${
    dark ? "text-gray-500" : "text-gray-500"
  }`}>
    <span className="font-semibold">
      Developed by Dasari Vamsi Krishna
    </span>
    {" "}·{" "}
    All rights reserved © 2026
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
  <div className={`${dark ? "dark" : ""} overflow-x-hidden`}>
      <GlobalStyles/>
      {page === "home" ? (
        <HomePage dark={dark} toggleDark={toggleDark} onEnter={() => setPage("app")} />
      ) : (
        <AppPage dark={dark} toggleDark={toggleDark} onHome={() => setPage("home")} addToast={addToast} />
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
