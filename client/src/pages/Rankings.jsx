import React, { useEffect, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

const TABS = [
  { id: 'byCoins', labelKey: 'rk.byCoins', icon: 'Coin', tone: '#C9A227' },
  { id: 'byAttendance', labelKey: 'rk.byAttendance', icon: 'Check', tone: '#1F6B4A' },
  { id: 'byMonitoring', labelKey: 'rk.byMonitoring', icon: 'Trend', tone: '#1B3A5C' },
];

export default function RankingsPage() {
  const { request, t, user } = useApp();
  const [tab, setTab] = useState('byCoins');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await request('/rankings');
        const suffix = tab === 'byCoins' ? ' ' + t('c.coin') : '%';
        setRows((d[tab] || []).map((r) => ({ ...r, scoreText: r.score + suffix })));
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [tab]);

  const openStats = async (row) => {
    if (row.id === user.id) {
      setStats(meStats(user));
      setOpen(row);
      return;
    }
    try {
      const d = await request('/students/' + row.id + '/stats');
      setStats(d);
      setOpen(row);
    } catch (e) {
      setErr(e.message);
    }
  };

  const myRow = rows.find((r) => r.id === user.id);
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="rankings-page">
      <div className="page-head">
        <div>
          <h1>{t('rk.title')}</h1>
          <p className="muted">{t('rk.sub')}</p>
        </div>
        {myRow && (
          <div className="my-place">
            <span className="muted tiny">{t('rk.myPlace')}</span>
            <b>
              #{myRow.rank} <span className="muted tiny">{myRow.scoreText}</span>
            </b>
          </div>
        )}
      </div>

      {err && <div className="alert">{err}</div>}

      <div className="rank-tabs">
        {TABS.map((x) => {
          const Ic = UI.Icon[x.icon];
          return (
            <button key={x.id} className={'rank-tab' + (tab === x.id ? ' active' : '')} style={{ '--tone': x.tone }} onClick={() => setTab(x.id)}>
              <Ic />
              <span>{t(x.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Eng yaxshi 3 */}
      <div className="podium">
        {top.map((r, i) => (
          <button key={r.id} className={'podium-card place' + (i + 1)} onClick={() => openStats(r)} style={{ '--tone': r.avatarColor }}>
            <span className="podium-medal">{['🥇', '🥈', '🥉'][i]}</span>
            <UI.Avatar name={r.displayName} color={r.avatarColor} size={i === 0 ? 62 : 52} ring={i === 0} />
            <b>{r.displayName}</b>
            <span className="muted tiny">{r.className}</span>
            <div className="podium-score">
              {r.scoreText}
              <span className="muted tiny"> {t('c.place')} #{r.rank}</span>
            </div>
            <span className="podium-view muted tiny">{t('rk.viewStats')} →</span>
          </button>
        ))}
      </div>

      {/* Qolganlar jadvali */}
      <UI.Card title={t('rk.title') + ' — ' + t(TABS.find((x) => x.id === tab).labelKey)} icon={<UI.Icon.Trophy />} subtitle={rows.length + " ta o'quvchi"}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('c.place')}</th>
                <th>{t('c.name')}</th>
                <th>{t('c.class')}</th>
                <th className="right">{t('c.coins')}</th>
                <th className="right">{t('st.attendancePct')}</th>
                <th className="right">{t('st.monitoringPct')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === user.id ? 'me' : ''}>
                  <td>
                    <span className={'rank-badge' + (r.rank <= 3 ? ' top' : '')}>#{r.rank}</span>
                  </td>
                  <td>
                    <div className="cell-user">
                      <UI.Avatar name={r.displayName} color={r.avatarColor} size={30} />
                      <span>{r.displayName}{r.id === user.id ? ' (' + t('c.you') + ')' : ''}</span>
                    </div>
                  </td>
                  <td className="muted">{r.className}</td>
                  <td className="right strong">{r.coins}</td>
                  <td className="right">{r.attendance}%</td>
                  <td className="right">{r.monitoring}%</td>
                  <td className="right">
                    <button className="btn ghost sm" onClick={() => openStats(r)}>
                      {t('rk.viewStats')}
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan="7" className="center muted">
                    {t('c.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </UI.Card>

      <UI.Modal open={!!open} title={open ? t('pr.title') : ''} subtitle={open ? open.displayName + ' · ' + open.className : ''} onClose={() => setOpen(null)} width={560}>
        {stats && open && (
          <div className="stats-modal">
            <p className="notice">
              <UI.Icon.Lock width={15} height={15} /> {t('pr.onlyStats')}
            </p>
            <div className="stats-head">
              <UI.Avatar name={open.displayName} color={open.avatarColor || stats.avatarColor} size={56} />
              <div>
                <b>{open.displayName}</b>
                <div className="muted small">{open.className}</div>
              </div>
              <div className="stats-coins">
                <UI.Icon.Coin width={16} height={16} /> {stats.coins}
              </div>
            </div>

            <div className="stats-block">
              <h4>{t('st.attendancePct')}</h4>
              <div className="mini-rows">
                {(stats.attendance || []).map((r) => (
                  <div key={r.label} className="mini-row">
                    <span className="mini-label">{r.label}</span>
                    <UI.Bar value={r.percent} color="#1F6B4A" />
                    <span className="mini-val">{r.percent}%</span>
                  </div>
                ))}
                {!(stats.attendance || []).length && <p className="muted small">{t('c.empty')}</p>}
              </div>
            </div>

            <div className="stats-block">
              <h4>{t('st.monitoringPct')}</h4>
              <div className="mini-rows">
                {(stats.monitoring || []).map((r) => (
                  <div key={r.label} className="mini-row">
                    <span className="mini-label">{r.label}</span>
                    <UI.Bar value={r.percent} color="#1B3A5C" />
                    <span className="mini-val">{r.percent}%</span>
                  </div>
                ))}
                {!(stats.monitoring || []).length && <p className="muted small">{t('c.empty')}</p>}
              </div>
            </div>

            <div className="stats-block">
              <h4>{t('c.grades')}</h4>
              <div className="stats-grades">
                {(stats.grades || []).map((g) => {
                  const avg = g.grades.length ? (g.grades.reduce((a, b) => a + b, 0) / g.grades.length).toFixed(1) : '—';
                  return (
                    <div key={g.subject} className="sg">
                      <span>{g.subject}</span>
                      <div className="grade-chips">
                        {g.grades.map((gr, i) => (
                          <span key={i} className="grade-chip">
                            {gr}
                          </span>
                        ))}
                      </div>
                      <b>{avg}</b>
                    </div>
                  );
                })}
                {!(stats.grades || []).length && <p className="muted small">{t('c.empty')}</p>}
              </div>
            </div>
          </div>
        )}
      </UI.Modal>
    </div>
  );
}

function meStats(u) {
  return {
    id: u.id,
    displayName: u.displayName,
    className: u.className,
    avatarColor: u.role === 'student' ? '#C9A227' : '#1B3A5C',
    coins: u.coins || 0,
    attendance: u.attendance || [],
    monitoring: u.monitoring || [],
    grades: u.grades || [],
  };
}
