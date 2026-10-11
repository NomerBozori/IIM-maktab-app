import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

// Bir quti uchun kerak bo'ladigan coin (9 katak × 50)
const COINS_PER_BOX = 450;

// Ixcham, lekin ko'zga tashlanadigan coin chip'i (sarlavha yonida turadi).
// 3×3 katta panara o'rniga: oltin ramka + progress halqa.
function CoinChip({ coins, t }) {
  const pct = Math.min(100, Math.round((coins / COINS_PER_BOX) * 100));
  const left = Math.max(0, COINS_PER_BOX - coins);
  return (
    <div className="coin-chip" title={t('st.coinsTitle')}>
      <span className="coin-chip-ic">
        <UI.Icon.Coin width={20} height={20} />
      </span>
      <span className="coin-chip-body">
        <b>{coins}</b>
        <span className="muted tiny">{t('st.coinsShort')}</span>
      </span>
      <span className="coin-chip-bar" aria-hidden="true">
        <i style={{ width: pct + '%' }} />
      </span>
      <span className="coin-chip-hint muted tiny">
        {left > 0 ? left + ' ' + t('st.coinsGoal').toLowerCase() : t('st.coinsFull')}
      </span>
    </div>
  );
}

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
          <p className="muted">
            {user.className ? user.className + ' sinf' : ''}
            {user.streamLabel ? ' · ' + user.streamLabel : ''} · {t('st.welcome')}
          </p>
        </div>
        <div className="hello-right">
          {data && <CoinChip coins={coins} t={t} />}
          <div className="hello-date muted small">{UI.fmtDate(new Date().toISOString(), t)}</div>
        </div>
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

          {/* ---------- O'NG ustun: ixcham coinlar ---------- */}
          <div className="col-coins">
            {/* Ixcham coin kartasi — katta panara o'rniga (joyni egallamaydi) */}
            <UI.Card title={t('st.coinsTitle')} icon={<UI.Icon.Coin />} tone="coin-card" className="coins-sticky">
              <div className="coins-compact">
                <div className="coins-compact-top">
                  <span className="coins-big">{coins}</span>
                  <span className="muted tiny">{t('c.coin')}</span>
                  <UI.Icon.Coin width={26} height={26} />
                </div>
                <UI.Bar value={Math.min(100, (coins / COINS_PER_BOX) * 100)} color="#C9A227" />
                <div className="muted tiny">
                  {COINS_PER_BOX - coins > 0
                    ? t('st.coinsGoal') + ': ' + (COINS_PER_BOX - coins) + ' ' + t('st.coinsShort')
                    : t('st.coinsFull') + ' 🎉'}
                </div>
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
