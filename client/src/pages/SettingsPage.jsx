import React, { useState } from 'react';
import { useApp, LANGS } from '../store.jsx';
import * as UI from '../ui.jsx';

const FAQ_KEYS = ['fq.q1', 'fq.q2', 'fq.q3', 'fq.q4', 'fq.q5', 'fq.q6', 'fq.q7'];

export default function SettingsPage() {
  const { t, theme, setTheme, lang, setLang, request, user, updateUser } = useApp();
  const [name, setName] = useState(user.displayName);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2600);
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const d = await request('/me', { method: 'PUT', body: { displayName: name.trim() } });
      updateUser(d.user);
      flash(t('c.saved') + ': ' + t('stt.changeName'));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await request('/me', { method: 'PUT', body: { password: pw.trim() } });
      setPw('');
      flash(t('c.saved') + ': ' + t('stt.changePassword'));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-head">
        <div>
          <h1>{t('stt.title')}</h1>
          <p className="muted">
            {user.displayName} · {t(user.role === 'student' ? 'c.student' : user.role === 'teacher' ? 'c.teacher' : 'c.director')}
          </p>
        </div>
      </div>

      {msg && <div className="alert ok">{msg}</div>}
      {err && <div className="alert">{err}</div>}

      <div className="settings-grid">
        <UI.Card title={t('stt.display')} icon={theme === 'light' ? <UI.Icon.Sun /> : <UI.Icon.Moon />} subtitle="Yorug' / qorong'i rejim">
          <div className="theme-toggle">
            <button className={'theme-opt' + (theme === 'light' ? ' active' : '')} onClick={() => setTheme('light')}>
              <span className="to-ic">
                <UI.Icon.Sun />
              </span>
              <b>{t('stt.light')}</b>
              <span className="muted tiny">Light</span>
            </button>
            <button className={'theme-opt' + (theme === 'dark' ? ' active' : '')} onClick={() => setTheme('dark')}>
              <span className="to-ic">
                <UI.Icon.Moon />
              </span>
              <b>{t('stt.dark')}</b>
              <span className="muted tiny">Dark</span>
            </button>
          </div>
        </UI.Card>

        <UI.Card title={t('stt.language')} icon={<UI.Icon.Globe />} subtitle="O'zbekcha · Русский · English">
          <div className="lang-options">
            {LANGS.map((l) => (
              <button key={l.id} className={'lang-opt' + (lang === l.id ? ' active' : '')} onClick={() => setLang(l.id)}>
                <span className="lang-code">{l.id.toUpperCase()}</span>
                <b>{l.label}</b>
                {lang === l.id && <UI.Icon.Check width={16} height={16} />}
              </button>
            ))}
          </div>
        </UI.Card>

        <UI.Card title={t('stt.profile')} icon={<UI.Icon.Users />} subtitle={t('c.loginField') + ': ' + user.login}>
          <form className="form" onSubmit={saveName}>
            <UI.Field label={t('c.displayName')}>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </UI.Field>
            <UI.Button type="submit" icon={<UI.Icon.Check />} loading={busy}>
              {t('stt.changeName')}
            </UI.Button>
          </form>
        </UI.Card>

        <UI.Card title={t('stt.changePassword')} icon={<UI.Icon.Key />}>
          <form className="form" onSubmit={savePw}>
            <UI.Field label={t('c.newPassword')}>
              <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••" />
            </UI.Field>
            <UI.Button type="submit" variant="subtle" icon={<UI.Icon.Lock />} loading={busy}>
              {t('c.save')}
            </UI.Button>
          </form>
        </UI.Card>

        <UI.Card title={t('stt.faq')} icon={<UI.Icon.Help />} className="faq-card">
          <div className="faq">
            {FAQ_KEYS.map((k, i) => (
              <div key={k} className={'faq-item' + (openFaq === i ? ' open' : '')}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  <span>{t(k)}</span>
                  <span className="faq-plus">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="faq-a muted small">{t(k.replace('.q', '.a'))}</div>}
              </div>
            ))}
          </div>
        </UI.Card>
      </div>
    </div>
  );
}
