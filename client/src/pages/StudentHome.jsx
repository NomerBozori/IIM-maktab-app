import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

const DAY_KEYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const todayKey = () => DAY_KEYS[new Date().getDay()];

const GRADE_TONE = { 5: 'good', 4: 'ok', 3: 'bad' };

export default function StudentHome() {
  const { request, t, user } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const d = await request('/student/dashboard');
      setData(d);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
    // qisqa yangilanish: boshqa oynada o'zgarishlar ko'rinsin
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const today = todayKey();

  const todayLessons = useMemo(() => {
    if (!data) return [];
    return data.schedule.filter((s) => s.day === today).sort((a, b) => a.start.localeCompare(b.start));
  }, [data, today]);

  const tasks = (data && data.tasks) || [];
  const pending = tasks.filter((x) => !x.done);
  const done = tasks.filter((x) => x.done);

  const coins = data ? data.coins : 0;
  const filled = Math.min(9, Math.floor(coins / 50));

  const markDone = async (id) => {
    await request('/tasks/' + id + '/done', { method: 'POST' });
    load();
  };

  return (
    <div className="student-home">
      <div className="home-hello">
        <div>
          <h1>
            {t('st.hello')}, {user.displayName.split(' ')[0]} 👋
          </h1>
          <p className="muted">{user.className ? user.className + ' sinf' : ''} · {t('st.welcome')}</p>
        </div>
        <div className="hello-date muted small">{UI.fmtDate(new Date().toISOString(), t)}</div>
      </div>

      {err && <div className="alert">{err}</div>}
      {!data && !err && <p className="muted">{t('c.loading')}</p>}

      {data && (
        <div className="student-grid">
          {/* ---------- CHAP ustun: vazifalar → baholar → jadval ---------- */}
          <div className="col-main">
            {/* Vazifalar (coinlar ro'parasida / oldida) */}
            <UI.Card
              title={t('st.tasksTitle')}
              subtitle={pending.length ? pending.length + ' ta bajarilmagan' : t('st.tasksEmpty')}
              icon={<UI.Icon.Clipboard />}
              tone="coins-tone"
              actions={
                <span className="pill">
                  <UI.Icon.Clock width={14} height={14} /> {pending.length}/{tasks.length}
                </span>
              }
            >
              {tasks.length === 0 && <UI.Empty icon={<UI.Icon.Clipboard />} text={t('st.tasksEmpty')} />}
              <div className="task-list">
                {tasks.map((x) => (
                  <div key={x.id} className={'task' + (x.done ? ' done' : '')}>
                    <button
                      className={'task-check' + (x.done ? ' on' : '')}
                      onClick={() => !x.done && markDone(x.id)}
                      title={t('st.markDone')}
                    >
                      {x.done && <UI.Icon.Check width={14} height={14} />}
                    </button>
                    <div className="task-body">
                      <div className="task-title">{x.title}</div>
                      <div className="muted tiny">
                        {x.subject} · {t('st.givenBy')}: {x.teacherName}
                        {x.dueDate ? ' · ' + t('c.deadline') + ': ' + UI.fmtDate(x.dueDate, t) : ''}
                      </div>
                      {x.description && <div className="small">{x.description}</div>}
                    </div>
                    {x.done ? (
                      <span className="badge ok">{t('st.done')}</span>
                    ) : (
                      <span className="badge warn">{t('c.today')}</span>
                    )}
                  </div>
                ))}
              </div>
            </UI.Card>

            {/* Fanlar bo'yicha baholar */}
            <UI.Card title={t('st.gradesTitle')} icon={<UI.Icon.Book />} subtitle="Har fandan olingan baholar">
              <div className="subject-grid">
                {data.grades.map((g) => {
                  const avg = g.grades.length ? (g.grades.reduce((a, b) => a + b, 0) / g.grades.length).toFixed(1) : '—';
                  return (
                    <div key={g.subject} className="subject-card">
                      <div className="subject-top">
                        <div className="subject-name">{g.subject}</div>
                        <div className="subject-avg">
                          <span className="muted tiny">{t('c.average')}</span> <b>{avg}</b>
                        </div>
                      </div>
                      <div className="grade-chips">
                        {g.grades.map((gr, i) => (
                          <span key={i} className={'grade-chip ' + (GRADE_TONE[gr] || '')}>
                            {gr}
                          </span>
                        ))}
                      </div>
                      <div className="muted tiny">{g.grades.length} ta baho</div>
                    </div>
                  );
                })}
              </div>
            </UI.Card>

            {/* Bugungi dars jadvali */}
            <UI.Card title={t('st.scheduleTitle')} icon={<UI.Icon.Calendar />} subtitle={t('c.today')}>
              {todayLessons.length === 0 ? (
                <UI.Empty icon={<UI.Icon.Calendar />} text={t('st.noLessons')} />
              ) : (
                <div className="lesson-list">
                  {todayLessons.map((l) => (
                    <div key={l.id} className="lesson">
                      <div className="lesson-time">
                        <b>{l.start}</b>
                        <span className="muted tiny">{l.end}</span>
                      </div>
                      <div className="lesson-body">
                        <div className="lesson-subject">{l.subject}</div>
                        <div className="muted tiny">{l.className} sinf</div>
                      </div>
                      <span className="lesson-hours">{l.hours} {t('c.hour1')}</span>
                    </div>
                  ))}
                </div>
              )}
            </UI.Card>
          </div>

          {/* ---------- O'NG ustun: coinlar 3×3 ---------- */}
          <div className="col-coins">
            <UI.Card title={t('st.coinsTitle')} icon={<UI.Icon.Coin />} tone="coin-card" className="coins-sticky">
              <div className="coins-total">
                <span className="coins-big">{coins}</span>
                <span className="muted tiny">{t('c.coin')}</span>
              </div>
              <div className="coin-grid" aria-label={t('c.coins')}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={'coin-cell' + (i < filled ? ' on' : ' ' ) + (i === 4 ? ' center' : '')}>
                    {i === 4 ? <span className="coin-center-num">{coins}</span> : <UI.Icon.Coin width={22} height={22} />}
                  </div>
                ))}
              </div>
              <div className="muted tiny center">{t('st.coinsHint')}</div>
              <UI.Bar value={Math.min(100, (coins / 450) * 100)} color="#C9A227" />
              <div className="coins-next muted tiny">
                {450 - coins > 0 ? 450 - coins + " coin qoldi → to'liq quti" : "To'liq quti! 🎉"}
              </div>
            </UI.Card>

            <UI.Card title={t('st.attendancePct')} icon={<UI.Icon.Check />}>
              <StatPct rows={attendanceRows(user)} />
            </UI.Card>

            <UI.Card title={t('st.monitoringPct')} icon={<UI.Icon.Trend />}>
              <StatPct rows={monitoringRows(user)} />
            </UI.Card>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPct({ rows }) {
  const { t } = useApp();
  if (!rows || !rows.length) return <p className="muted small">{t('c.empty')}</p>;
  return (
    <div className="mini-rows">
      {rows.map((r) => (
        <div key={r.label} className="mini-row">
          <span className="mini-label">{r.label}</span>
          <UI.Bar value={r.percent} color={r.percent >= 85 ? '#1F6B4A' : r.percent >= 70 ? '#A8871F' : '#C0503F'} />
          <span className="mini-val">{r.percent}%</span>
        </div>
      ))}
    </div>
  );
}

function attendanceRows(u) {
  return (u.attendance || []).slice(-4);
}
function monitoringRows(u) {
  return (u.monitoring || []).slice(-4);
}
