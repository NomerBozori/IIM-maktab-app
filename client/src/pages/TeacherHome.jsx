import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

export default function TeacherHome() {
  const { request, t, user } = useApp();
  const [me, setMe] = useState(null);
  const [students, setStudents] = useState([]);
  const [sms, setSms] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  // coin berish
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');

  // vazifa berish
  const [task, setTask] = useState({ title: '', description: '', dueDate: '', className: '', subject: '' });

  const load = useCallback(async () => {
    try {
      const [m, s, sm] = await Promise.all([request('/me'), request('/my-students'), request('/teacher/sms')]);
      setMe(m.user);
      setStudents(s.students);
      setSms(sm.sms);
      const myClasses = (m.user.classes || []).map((c) => ({ value: c, label: c }));
      if (myClasses.length) setTask((p) => ({ ...p, className: p.className || myClasses[0].value, subject: p.subject || m.user.subject || '' }));
    } catch (e) {
      setErr(e.message);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const giveCoins = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');
    if (!studentId) return setErr(t('tc.pickStudent'));
    try {
      const d = await request('/teacher/coins', { method: 'POST', body: { studentId, amount, reason } });
      setOk(`${amount} ${t('c.coin')} → ${students.find((s) => s.id === studentId)?.displayName} ✓ (${t('tc.coinsGiven')})`);
      setAmount(10);
      setReason('');
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const giveTask = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');
    if (!task.title.trim()) return setErr(t('tc.taskTitle'));
    try {
      await request('/tasks', { method: 'POST', body: task });
      setOk(t('tc.giveTask') + ' ✓');
      setTask((p) => ({ ...p, title: '', description: '', dueDate: '' }));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const budget = me && me.budget;
  const myClasses = (me && me.classes) || [];

  return (
    <div className="teacher-home">
      <div className="page-head">
        <div>
          <h1>
            {t('st.hello')}, {user.displayName.split(' ')[0]} 👋
          </h1>
          <p className="muted">
            {user.subject || t('c.subject')} · {myClasses.join(', ') || '—'}
          </p>
        </div>
      </div>

      {err && <div className="alert">{err}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="teacher-grid">
        {/* Oylik coin byudjeti */}
        <UI.Card
          title={t('tc.budgetTitle')}
          subtitle={t('tc.budgetDesc')}
          icon={<UI.Icon.Coin />}
          tone="coin-card"
          actions={<span className="pill">{(budget && budget.month) || ''}</span>}
        >
          {budget && (
            <>
              <div className="budget-figures">
                <div>
                  <div className="muted tiny">{t('c.total')}</div>
                  <b className="big-num">{budget.amount}</b>
                </div>
                <div>
                  <div className="muted tiny">{t('c.distributed')}</div>
                  <b className="big-num warn">{budget.distributed}</b>
                </div>
                <div>
                  <div className="muted tiny">{t('c.left')}</div>
                  <b className="big-num good">{budget.left}</b>
                </div>
              </div>
              <UI.Bar value={budget.amount ? (budget.distributed / budget.amount) * 100 : 0} color="#C9A227" />
              <div className="muted tiny pad-top">
                {budget.amount ? Math.round((budget.distributed / budget.amount) * 100) : 0}% {t('c.distributed').toLowerCase()}
              </div>
            </>
          )}
        </UI.Card>

        {/* Coin berish */}
        <UI.Card title={t('tc.giveCoins')} icon={<UI.Icon.Plus />} subtitle={t('tc.pickStudent')}>
          <form className="form" onSubmit={giveCoins}>
            <UI.Field label={t('c.student')}>
              <UI.Select
                value={studentId}
                onChange={setStudentId}
                options={[{ value: '', label: t('c.select') + '…' }, ...students.map((s) => ({ value: s.id, label: s.displayName + ' — ' + s.className + ' (' + s.coins + ')' }))]}
              />
            </UI.Field>
            <div className="form-row">
              <UI.Field label={t('c.amount')}>
                <input className="input" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </UI.Field>
              <UI.Field label={t('c.reason')} hint="masalan: uyga vazifa bajarildi">
                <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
              </UI.Field>
            </div>
            <div className="quick-amounts">
              {[5, 10, 20, 50].map((v) => (
                <button key={v} type="button" className="chip" onClick={() => setAmount(v)}>
                  +{v}
                </button>
              ))}
            </div>
            <UI.Button type="submit" icon={<UI.Icon.Coin />} disabled={budget ? budget.left < 1 : false}>
              {budget && budget.left < 1 ? t('tc.budgetEmpty') : t('tc.give')}
            </UI.Button>
          </form>
        </UI.Card>

        {/* Vazifa berish */}
        <UI.Card title={t('tc.giveTask')} icon={<UI.Icon.Clipboard />} subtitle="Uyga vazifa">
          <form className="form" onSubmit={giveTask}>
            <UI.Field label={t('tc.taskTitle')}>
              <input className="input" value={task.title} onChange={(e) => setTask((p) => ({ ...p, title: e.target.value }))} placeholder="5-mashq, 45-51" />
            </UI.Field>
            <div className="form-row">
              <UI.Field label={t('c.class')}>
                <UI.Select
                  value={task.className}
                  onChange={(v) => setTask((p) => ({ ...p, className: v }))}
                  options={myClasses.map((c) => ({ value: c, label: c }))}
                />
              </UI.Field>
              <UI.Field label={t('c.deadline')}>
                <input className="input" type="date" value={task.dueDate} onChange={(e) => setTask((p) => ({ ...p, dueDate: e.target.value }))} />
              </UI.Field>
            </div>
            <UI.Field label={t('c.description')}>
              <textarea className="input" rows={2} value={task.description} onChange={(e) => setTask((p) => ({ ...p, description: e.target.value }))} />
            </UI.Field>
            <UI.Button type="submit" variant="subtle" icon={<UI.Icon.Send />}>
              {t('tc.createTask')}
            </UI.Button>
          </form>
        </UI.Card>

        {/* Direktor xabarlari */}
        <UI.Card title={t('tc.smsFromDirector')} icon={<UI.Icon.Bell />}>
          {sms.length === 0 && <UI.Empty icon={<UI.Icon.Bell />} text={t('tc.noSms')} />}
          <div className="sms-list">
            {sms
              .slice()
              .reverse()
              .map((s) => (
                <div key={s.id} className="sms">
                  <div className="sms-txt">{s.text}</div>
                  <div className="muted tiny">{UI.fmtDate(s.sentAt, t)}</div>
                </div>
              ))}
          </div>
        </UI.Card>
      </div>
    </div>
  );
}
