import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

export default function DirectorHome() {
  const { request, t, user } = useApp();
  const [budgets, setBudgets] = useState([]);
  const [monitor, setMonitor] = useState([]);
  const [smsLog, setSmsLog] = useState([]);
  const [overview, setOverview] = useState({ teachers: 0, students: 0 });
  const [draft, setDraft] = useState({});
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, m] = await Promise.all([request('/director/budgets'), request('/director/attendance-check')]);
      setBudgets(b.teachers);
      setMonitor(m.teachers);
      setDraft(Object.fromEntries(b.teachers.map((x) => [x.id, x.amount])));
      const totalAllocated = b.teachers.reduce((a, x) => a + x.amount, 0);
      const totalDistributed = b.teachers.reduce((a, x) => a + x.distributed, 0);
      const all = await request('/rankings');
      const studentCount = (all.byCoins || []).length;
      setOverview({ teachers: b.teachers.length, students: studentCount, totalAllocated, totalDistributed });
    } catch (e) {
      setErr(e.message);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const d = await request('/director/sms-log');
        setSmsLog(d.sms.slice().reverse());
      } catch (e) {
        /* ignore */
      }
    })();
  }, [request]);

  const saveBudget = async (id) => {
    setErr('');
    setOk('');
    try {
      await request('/director/budgets', { method: 'POST', body: { teacherId: id, amount: draft[id] } });
      setOk(t('dr.budgetSaved') + ' ✓');
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const sendSms = async (teacher) => {
    setErr('');
    setOk('');
    setBusyId(teacher.id);
    try {
      const cls = teacher.classes.join(', ');
      const d = await request('/director/send-sms', {
        method: 'POST',
        body: { teacherId: teacher.id, text: t('dr.smsText') + ': ' + cls + '.' },
      });
      setSmsLog((p) => [d.sms, ...p]);
      setOk(t('dr.smsSent') + ' → ' + teacher.displayName);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusyId('');
    }
  };

  const missing = monitor.filter((x) => !x.submittedToday);

  return (
    <div className="director-home">
      <div className="page-head">
        <div>
          <h1>
            {t('dr.overview')} 👋 <span className="muted">{user.displayName}</span>
          </h1>
          <p className="muted">{t('dr.budgetDesc')}</p>
        </div>
      </div>

      {err && <div className="alert">{err}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="stat-row">
        <UI.Stat icon={<UI.Icon.Users />} label={t('dr.teachersCount')} value={overview.teachers} tone="blue" />
        <UI.Stat icon={<UI.Icon.Star />} label={t('dr.studentsCount')} value={overview.students} tone="orange" />
        <UI.Stat icon={<UI.Icon.Coin />} label={t('dr.coinsOut')} value={overview.totalAllocated || 0} tone="green" />
        <UI.Stat icon={<UI.Icon.Bell />} label={t('dr.notSubmitted')} value={missing.length} tone="red" />
      </div>

      {/* Davomat nazorati */}
      <UI.Card
        title={t('dr.monitorTitle')}
        subtitle={t('dr.monitorDesc')}
        icon={<UI.Icon.Bell />}
        tone={missing.length ? 'warn-tone' : 'default'}
        actions={
          <span className={'pill ' + (missing.length ? 'warn' : 'ok')}>
            {missing.length ? missing.length + ' ' + t('dr.notSubmitted').toLowerCase() : t('c.yes')}
          </span>
        }
      >
        <div className="monitor-list">
          {monitor.map((x) => (
            <div key={x.id} className={'monitor-row' + (x.submittedToday ? ' ok' : ' bad')}>
              <UI.Avatar name={x.displayName} color={x.submittedToday ? '#1F6B4A' : '#C0503F'} size={36} />
              <div className="monitor-body">
                <b>{x.displayName}</b>
                <div className="muted tiny">
                  {x.subject} · {x.classes.join(', ') || '—'}
                </div>
              </div>
              <span className={'badge ' + (x.submittedToday ? 'ok' : 'warn')}>
                {x.submittedToday ? t('dr.submitted') : t('dr.notSubmitted')}
              </span>
              {!x.submittedToday && (
                <UI.Button
                  size="sm"
                  variant="subtle"
                  icon={<UI.Icon.Send width={15} height={15} />}
                  loading={busyId === x.id}
                  onClick={() => sendSms(x)}
                >
                  {t('dr.sendSms')}
                </UI.Button>
              )}
            </div>
          ))}
        </div>

        {smsLog.length > 0 && (
          <div className="sms-log">
            <div className="muted tiny sms-log-title">{t('dr.smsLog')}</div>
            {smsLog.map((s) => (
              <div key={s.id} className="sms">
                <div className="sms-txt">
                  <b>{s.teacherName}:</b> {s.text}
                </div>
                <div className="muted tiny">
                  {s.phone} · {UI.fmtDate(s.sentAt, t)}
                </div>
              </div>
            ))}
          </div>
        )}
      </UI.Card>

      {/* Ustozlarga coin belgilash */}
      <UI.Card title={t('dr.budgetTitle')} subtitle={t('dr.budgetDesc')} icon={<UI.Icon.Coin />} tone="coin-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('c.name')}</th>
                <th>{t('c.subject')}</th>
                <th className="right">{t('c.distributed')}</th>
                <th className="right">{t('c.left')}</th>
                <th className="right">{t('c.coin')} / {t('c.month')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {budgets.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div className="cell-user">
                      <UI.Avatar name={x.displayName} color="#1B3A5C" size={28} />
                      <span>{x.displayName}</span>
                    </div>
                  </td>
                  <td className="muted">{x.subject}</td>
                  <td className="right">{x.distributed}</td>
                  <td className="right strong">{x.left}</td>
                  <td className="right">
                    <input
                      className="input tiny-input"
                      type="number"
                      min="0"
                      value={draft[x.id] ?? ''}
                      onChange={(e) => setDraft((p) => ({ ...p, [x.id]: e.target.value }))}
                    />
                  </td>
                  <td className="right">
                    <UI.Button size="sm" icon={<UI.Icon.Check width={15} height={15} />} onClick={() => saveBudget(x.id)}>
                      {t('dr.setBudget')}
                    </UI.Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </UI.Card>
    </div>
  );
}
