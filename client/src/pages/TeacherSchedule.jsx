import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

const DAY_BY_JS = { 1: 'dushanba', 2: 'seshanba', 3: 'chorshanba', 4: 'payshanba', 5: 'juma', 6: 'shanaba' };
const todayKey = () => DAY_BY_JS[new Date().getDay()] || null;
const DAY_ORDER = ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanaba'];

export default function TeacherSchedule() {
  const { request, t } = useApp();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [view, setView] = useState('today');

  useEffect(() => {
    (async () => {
      try {
        const d = await request('/schedule');
        setRows(d.schedule);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  const today = todayKey();

  const todayLessons = useMemo(
    () => rows.filter((r) => r.day === today).sort((a, b) => a.start.localeCompare(b.start)),
    [rows, today]
  );

  // kunlik umumiy soat va qaysi sinfga necha soat
  const todaySummary = useMemo(() => {
    const byClass = {};
    let hours = 0;
    todayLessons.forEach((l) => {
      hours += l.hours;
      byClass[l.className] = (byClass[l.className] || 0) + l.hours;
    });
    return { hours, byClass };
  }, [todayLessons]);

  // haftalik: har kunda necha soat va qaysi sinfga
  const week = useMemo(() => {
    return DAY_ORDER.map((day) => {
      const list = rows.filter((r) => r.day === day);
      const byClass = {};
      let hours = 0;
      list.forEach((l) => {
        hours += l.hours;
        byClass[l.className] = (byClass[l.className] || 0) + l.hours;
      });
      return { day, list, hours, byClass, count: list.length };
    });
  }, [rows]);

  const totalWeek = week.reduce((a, w) => a + w.hours, 0);

  return (
    <div className="teacher-schedule">
      <div className="page-head">
        <div>
          <h1>{t('tc.scheduleTitle')}</h1>
          <p className="muted">Bugun qaysi sinfga necha soat kirishingizni ko'rasiz</p>
        </div>
        <UI.Tabs
          active={view}
          onChange={setView}
          items={[
            { id: 'today', label: t('tc.todayLessons') },
            { id: 'week', label: t('c.week') },
          ]}
        />
      </div>

      {err && <div className="alert">{err}</div>}

      {view === 'today' ? (
        <>
          <div className="stat-row">
            <UI.Stat icon={<UI.Icon.Clock />} label={t('tc.dayHours')} value={todaySummary.hours + ' ' + t('c.hour1')} tone="blue" />
            <UI.Stat icon={<UI.Icon.Book />} label={t('c.today')} value={todayLessons.length + ' ta dars'} tone="orange" />
            <UI.Stat icon={<UI.Icon.Users />} label={t('c.classes')} value={Object.keys(todaySummary.byClass).length + ' ta'} tone="green" />
          </div>

          {todayLessons.length > 0 && (
            <UI.Card title={t('tc.whichClass')} icon={<UI.Icon.Users />} subtitle={t('tc.dayHours')}>
              <div className="class-hours">
                {Object.entries(todaySummary.byClass).map(([cls, h]) => (
                  <div key={cls} className="class-hour">
                    <b>{cls}</b>
                    <span>
                      {h} {t('c.hour1')}
                    </span>
                  </div>
                ))}
              </div>
            </UI.Card>
          )}

          <UI.Card title={t('tc.todayLessons')} icon={<UI.Icon.Calendar />}>
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
                    <span className="lesson-hours">
                      {l.hours} {t('c.hour1')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </UI.Card>
        </>
      ) : (
        <UI.Card title={t('c.week')} icon={<UI.Icon.Calendar />} subtitle={totalWeek + ' ' + t('c.hour1') + ' / hafta'}>
          <div className="week-table">
            {week.map((w) => (
              <div key={w.day} className={'week-day' + (w.day === today ? ' today' : '')}>
                <div className="week-day-head">
                  <b>{t('d.' + w.day)}</b>
                  <span className="muted tiny">
                    {w.hours} {t('c.hour1')} · {w.count} dars
                  </span>
                </div>
                {w.hours === 0 ? (
                  <div className="muted small pad-s">{t('st.noLessons')}</div>
                ) : (
                  <>
                    <div className="class-hours sm">
                      {Object.entries(w.byClass).map(([cls, h]) => (
                        <span key={cls} className="class-hour">
                          <b>{cls}</b>
                          <span>{h} {t('c.hour1')}</span>
                        </span>
                      ))}
                    </div>
                    <div className="week-lessons">
                      {w.list.map((l) => (
                        <div key={l.id} className="wl">
                          <span className="muted tiny">
                            {l.start}–{l.end}
                          </span>
                          <span>{l.subject}</span>
                          <span className="badge sm">{l.className}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </UI.Card>
      )}
    </div>
  );
}
