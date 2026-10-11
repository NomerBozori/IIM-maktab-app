import React, { useEffect, useState } from 'react';
import { useApp, api } from '../store.jsx';
import * as UI from '../ui.jsx';

const DEMO = [
  { role: 'student', login: 'oquvchi1', password: '1234', name: 'Aziz Karimov', extra: '1-A' },
  { role: 'teacher', login: 'ustoz1', password: '1234', name: 'Malika Tursunova', extra: 'Matematika' },
  { role: 'director', login: 'director', password: '1234', name: 'Sardor Karimov', extra: 'Direktor' },
];

const ROLE_TONE = { student: '#C9A227', teacher: '#1B3A5C', director: '#6B4E9B' };

export default function LoginPage() {
  const { login, register, t } = useApp();
  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ login: '', password: '', displayName: '', className: '8-A', subject: '', inviteCode: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    let alive = true;
    api('/classes')
      .then((d) => {
        if (!alive) return;
        const list = d.classes || [];
        setClasses(list);
        if (list.length && !list.some((c) => c.name === form.className)) {
          setForm((f) => ({ ...f, className: list[0].name }));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    // Xavfsizlik: direktor hisobi ilova ichida ochilmaydi
    if (mode === 'register' && role === 'director') {
      setErr(t('lg.directorClosed'));
      return;
    }
    if (mode === 'register' && form.password.length < 8) {
      setErr(t('lg.pwMin').replace('{n}', 8));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(form.login, form.password);
      else
        await register({
          login: form.login,
          password: form.password,
          displayName: form.displayName,
          role,
          className: form.className,
          subject: form.subject,
          inviteCode: form.inviteCode,
        });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const quick = async (d) => {
    setErr('');
    setBusy(true);
    try {
      await login(d.login, d.password);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="brand big">
          <span className="hero-logo">
            <UI.Logo size={84} title="Intellekt Innovatsion Maktabi" />
          </span>
          <div className="brand-txt">
            <b>Intellekt</b>
            <i>Innovatsion Maktabi</i>
          </div>
        </div>
        <div className="tagline">Bilim &bull; Innovatsiya &bull; Intellekt</div>
        <h1>
          Maktabning <span className="grad">raqamli</span> akkauntlari
        </h1>
        <p className="muted">O'quvchi, ustoz va direktor uchun alohida kabinetlar: coinlar, davomat, reyting, chat va sozlamalar bir joyda.</p>
        <ul className="hero-list">
          <li>
            <span className="hl-ic" style={{ background: '#C9A227' }}>
              <UI.Icon.Coin />
            </span>
            <div>
              <b>O'quvchi</b>
              <div className="muted small">{t('lg.studentDesc')}</div>
            </div>
          </li>
          <li>
            <span className="hl-ic" style={{ background: '#1B3A5C' }}>
              <UI.Icon.Clipboard />
            </span>
            <div>
              <b>Ustoz</b>
              <div className="muted small">{t('lg.teacherDesc')}</div>
            </div>
          </li>
          <li>
            <span className="hl-ic" style={{ background: '#6B4E9B' }}>
              <UI.Icon.Trend />
            </span>
            <div>
              <b>Direktor</b>
              <div className="muted small">{t('lg.directorDesc')}</div>
            </div>
          </li>
        </ul>
      </div>

      <div className="login-card">
        <div className="role-tabs">
          {['student', 'teacher', 'director'].map((r) => (
            <button
              key={r}
              className={'role-tab' + (role === r ? ' active' : '')}
              style={{ '--tone': ROLE_TONE[r] }}
              onClick={() => setRole(r)}
            >
              <span className="role-dot" />
              {t(r === 'student' ? 'c.student' : r === 'teacher' ? 'c.teacher' : 'c.director')}
            </button>
          ))}
        </div>

        <h2>{mode === 'login' ? t('lg.title') : t('lg.register')}</h2>
        <p className="muted small">{t('lg.sub')}</p>

        <form onSubmit={submit} className="form">
          {mode === 'register' && (
            <>
              <UI.Field label={t('c.displayName')}>
                <input className="input" value={form.displayName} onChange={set('displayName')} placeholder="Aziz Karimov" required />
              </UI.Field>
              {role === 'student' && (
                <UI.Field label={t('lg.pickSinf')} hint={t('lg.streamRu') + ' · ' + t('lg.streamUz')}>
                  <UI.Select
                    value={form.className}
                    onChange={set('className')}
                    options={classes.map((c) => ({
                      value: c.name,
                      label: c.name + ' — ' + (c.stream === 'ru' ? t('lg.streamRu') : t('lg.streamUz')),
                    }))}
                  />
                </UI.Field>
              )}
              {role === 'teacher' && (
                <UI.Field label={t('c.subject')}>
                  <input className="input" value={form.subject} onChange={set('subject')} placeholder="Matematika" />
                </UI.Field>
              )}
              {role === 'director' && <div className="alert">{t('lg.directorClosed')}</div>}
              {role === 'teacher' && (
                <UI.Field label={t('lg.invite')} hint={t('lg.inviteHint')}>
                  <input className="input" value={form.inviteCode} onChange={set('inviteCode')} placeholder="••••" autoComplete="off" />
                </UI.Field>
              )}
            </>
          )}
          <UI.Field label={t('c.loginField')}>
            <input className="input" value={form.login} onChange={set('login')} placeholder="login" autoComplete="username" required />
          </UI.Field>
          <UI.Field label={t('c.password')} hint={mode === 'register' ? t('lg.pwMin').replace('{n}', 8) : undefined}>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
          </UI.Field>

          {err && <div className="alert">{err}</div>}

          <UI.Button block type="submit" loading={busy} icon={mode === 'login' ? <UI.Icon.Key /> : <UI.Icon.Check />}>
            {mode === 'login' ? t('c.login') : t('lg.register')}
          </UI.Button>
        </form>

        <div className="login-switch">
          {mode === 'login' ? t('lg.noAcc') : t('lg.haveAcc')}
          <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? t('lg.register') : t('c.login')}
          </button>
        </div>

        <div className="demo">
          <div className="muted tiny demo-title">{t('lg.demo')}</div>
          <div className="muted tiny demo-warn">{t('lg.demoWarn')}</div>
          {DEMO.map((d) => (
            <button key={d.login} className="demo-row" onClick={() => quick(d)} disabled={busy}>
              <span className="role-dot" style={{ background: ROLE_TONE[d.role] }} />
              <span className="demo-name">{d.name}</span>
              <span className="muted tiny">{d.extra}</span>
              <span className="muted tiny demo-login">{d.login}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
