import React, { useEffect, useState } from 'react';

// ============================================================
//  Ikonkalar (inline SVG — hech qanday tashqi kutubxona kerak emas)
// ============================================================
const S = ({ children, ...p }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);

export const Icon = {
  Home: (p) => (
    <S {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </S>
  ),
  Trophy: (p) => (
    <S {...p}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M17 5h2a2 2 0 0 1 0 4h-1" />
      <path d="M7 5H5a2 2 0 0 0 0 4h1" />
    </S>
  ),
  Chat: (p) => (
    <S {...p}>
      <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-5A8 8 0 1 1 21 12Z" />
    </S>
  ),
  Settings: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
    </S>
  ),
  Calendar: (p) => (
    <S {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </S>
  ),
  Clipboard: (p) => (
    <S {...p}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </S>
  ),
  Coin: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h4a2 2 0 0 1 0 4h-4h4a2 2 0 0 1 0 4" />
    </S>
  ),
  Plus: (p) => (
    <S {...p}>
      <path d="M12 5v14M5 12h14" />
    </S>
  ),
  Send: (p) => (
    <S {...p}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </S>
  ),
  Sun: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </S>
  ),
  Moon: (p) => (
    <S {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </S>
  ),
  Globe: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </S>
  ),
  Check: (p) => (
    <S {...p}>
      <path d="M20 6 9 17l-5-5" />
    </S>
  ),
  X: (p) => (
    <S {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </S>
  ),
  Users: (p) => (
    <S {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1A4 4 0 0 1 16 11" />
    </S>
  ),
  Bell: (p) => (
    <S {...p}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </S>
  ),
  LogOut: (p) => (
    <S {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </S>
  ),
  Clock: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </S>
  ),
  Book: (p) => (
    <S {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </S>
  ),
  Help: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.6-1.6 1.2-1.6 2.4" />
      <path d="M12 17h.01" />
    </S>
  ),
  Key: (p) => (
    <S {...p}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3M17 6l3 3" />
    </S>
  ),
  Trend: (p) => (
    <S {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </S>
  ),
  Lock: (p) => (
    <S {...p}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </S>
  ),
  Star: (p) => (
    <S {...p}>
      <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9Z" />
    </S>
  ),
  Menu: (p) => (
    <S {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </S>
  ),
};

// ============================================================
//  Kartalar, tugmalar va boshqalar
// ============================================================
// ============================================================
//  Brend logotipi — INTELLEKT INNOVATSION MAKTABI
// ============================================================
export function Logo({ size = 44, rounded = false, title }) {
  return (
    <img
      className={rounded ? 'brand-mark rounded' : 'brand-mark'}
      src="/logo.png"
      alt="Intellekt Innovatsion Maktabi"
      title={title || 'Intellekt Innovatsion Maktabi'}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable="false"
    />
  );
}

export function BrandName({ sub }) {
  return (
    <span className="brand-name">
      <b>Intellekt</b>
      {sub ? <em>{sub}</em> : null}
    </span>
  );
}

export function Card({ title, subtitle, icon, actions, children, className = '', tone = 'default' }) {
  return (
    <section className={'card ' + tone + ' ' + className}>
      {(title || actions) && (
        <header className="card-head">
          <div className="card-head-txt">
            {icon && <span className="card-icon">{icon}</span>}
            <div>
              {title && <h3>{title}</h3>}
              {subtitle && <p className="muted small">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Button({ children, variant = 'primary', size = 'md', icon, block, loading, ...rest }) {
  return (
    <button className={'btn ' + variant + ' ' + size + (block ? ' block' : '')} disabled={rest.disabled || loading} {...rest}>
      {loading ? <span className="spinner" /> : icon && <span className="btn-ic">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ children, title, ...rest }) {
  return (
    <button className="icon-btn" title={title} aria-label={title} {...rest}>
      {children}
    </button>
  );
}

export function Modal({ open, title, subtitle, onClose, children, width = 520 }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose && onClose();
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <IconButton title="Yopish" onClick={onClose}>
            <Icon.X />
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Avatar({ name, color = '#1B3A5C', size = 38, ring }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className={'avatar' + (ring ? ' ring' : '')}
      style={{ background: color, width: size, height: size, fontSize: Math.round(size / 2.6) }}
    >
      {initials}
    </span>
  );
}

export function Bar({ value, max = 100, color }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: pct + '%', background: color || 'var(--accent)' }} />
    </div>
  );
}

export function Tabs({ items, active, onChange }) {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button key={it.id} className={'tab' + (active === it.id ? ' active' : '')} onClick={() => onChange(it.id)}>
          {it.label}
          {it.badge != null && it.badge !== '' && <span className="tab-badge">{it.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, text }) {
  return (
    <div className="empty">
      <div className="empty-ic">{icon || <Icon.Clipboard />}</div>
      <p className="muted">{text}</p>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Select({ value, onChange, options }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Stat({ label, value, sub, icon, tone }) {
  return (
    <div className={'stat ' + (tone || '')}>
      {icon && <span className="stat-ic">{icon}</span>}
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="muted small">{sub}</div>}
      </div>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

// qisqa sana: 2026-10-06 → 6-oktabr
export function fmtDate(iso, t) {
  if (!iso) return '—';
  const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.getDate() + ' ' + (months[d.getMonth()] || '') + ', ' + d.getFullYear();
}

export function timeAgo(iso, t) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return t('c.today');
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + ' soat';
  return Math.floor(diff / 86400) + ' kun';
}

export function useNow(interval = 30000) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((v) => v + 1), interval);
    return () => clearInterval(id);
  }, [interval]);
}
