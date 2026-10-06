import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

const STATUSES = [
  { id: 'keldi', tone: 'good', icon: 'Check' },
  { id: 'ketdi', tone: 'warn', icon: 'LogOut' },
  { id: 'kirmadi', tone: 'bad', icon: 'X' },
];

export default function TeacherAttendance() {
  const { request, t } = useApp();
  const [myClasses, setMyClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [cls, setCls] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState({});
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [records, setRecords] = useState([]);
  const [computed, setComputed] = useState(null);

  const loadStudents = useCallback(
    async (classId) => {
      try {
        const d = await request('/my-students');
        const list = d.students.filter((s) => s.classId === classId);
        setStudents(list);
        setMarks(Object.fromEntries(list.map((s) => [s.id, null])));
      } catch (e) {
        setErr(e.message);
      }
    },
    [request]
  );

  useEffect(() => {
    (async () => {
      try {
        const [me, rec] = await Promise.all([request('/me'), request('/attendance')]);
        const cls = me.user.classes || [];
        setMyClasses(cls);
        setRecords(rec.records);
        if (cls.length) {
          setCls(cls[0]);
          loadStudents((await request('/my-students')).students.find((s) => s.className === cls[0]).classId);
        }
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  const mark = (studentId, status) => setMarks((p) => ({ ...p, [studentId]: status }));

  const save = async () => {
    setErr('');
    setOk('');
    const entries = Object.entries(marks)
      .filter(([, v]) => v)
      .map(([studentId, status]) => ({ studentId, status }));
    if (!entries.length) return setErr("Kamida bitta o'quvchini belgilang");
    try {
      const d = await request('/attendance', { method: 'POST', body: { date, entries } });
      setOk(`${d.saved} ta ${t('tc.attendanceSaved').toLowerCase()}`);
      const rec = await request('/attendance');
      setRecords(rec.records);
      setComputed(null);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const compute = () => {
    const day = records.filter((r) => r.date === date);
    if (!day.length) {
      setComputed({ empty: true });
      return;
    }
    const byStudent = {};
    day.forEach((r) => {
      byStudent[r.studentId] = byStudent[r.studentId] || { name: r.studentName, className: r.className, keldi: 0, ketdi: 0, kirmadi: 0 };
      byStudent[r.studentId][r.status] += 1;
    });
    const rows = Object.entries(byStudent).map(([id, v]) => {
      const total = v.keldi + v.ketdi + v.kirmadi;
      const present = v.keldi + v.ketdi;
      return { id, ...v, total, present, pct: total ? Math.round((present / total) * 100) : 0 };
    });
    setComputed({ rows, date, count: day.length });
  };

  const todayCount = useMemo(() => {
    const day = records.filter((r) => r.date === date);
    return {
      keldi: day.filter((r) => r.status === 'keldi').length,
      ketdi: day.filter((r) => r.status === 'ketdi').length,
      kirmadi: day.filter((r) => r.status === 'kirmadi').length,
    };
  }, [records, date]);

  return (
    <div className="teacher-attendance">
      <div className="page-head">
        <div>
          <h1>{t('tc.attendanceTitle')}</h1>
          <p className="muted">{t('tc.attendanceDesc')}</p>
        </div>
        <div className="head-actions">
          <UI.Select
            value={cls}
            onChange={(v) => {
              setCls(v);
              const s = students.find((x) => x.className === v);
              if (s) loadStudents(s.classId);
            }}
            options={myClasses.map((c) => ({ value: c, label: c }))}
          />
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {err && <div className="alert">{err}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="stat-row">
        <UI.Stat icon={<UI.Icon.Check />} label={t('tc.keldi')} value={todayCount.keldi} tone="green" />
        <UI.Stat icon={<UI.Icon.LogOut />} label={t('tc.ketdi')} value={todayCount.ketdi} tone="orange" />
        <UI.Stat icon={<UI.Icon.X />} label={t('tc.kirmadi')} value={todayCount.kirmadi} tone="red" />
        <UI.Stat icon={<UI.Icon.Users />} label={t('tc.students')} value={students.length} tone="blue" />
      </div>

      <UI.Card
        title={cls ? cls + ' sinf' : t('c.class')}
        icon={<UI.Icon.Check />}
        subtitle={UI.fmtDate(date, t)}
        actions={
          <div className="card-actions-row">
            <UI.Button variant="subtle" icon={<UI.Icon.Trend />} onClick={compute}>
              {t('tc.compute')}
            </UI.Button>
            <UI.Button icon={<UI.Icon.Check />} onClick={save}>
              {t('tc.saveAttendance')}
            </UI.Button>
          </div>
        }
      >
        {students.length === 0 ? (
          <UI.Empty icon={<UI.Icon.Users />} text={t('c.empty')} />
        ) : (
          <div className="att-list">
            {students.map((s) => (
              <div key={s.id} className="att-row">
                <UI.Avatar name={s.displayName} color="#1B3A5C" size={34} />
                <div className="att-name">
                  <b>{s.displayName}</b>
                  <span className="muted tiny">
                    {s.coins} {t('c.coin')}
                  </span>
                </div>
                <div className="att-buttons">
                  {STATUSES.map((st) => {
                    const Ic = UI.Icon[st.icon];
                    return (
                      <button
                        key={st.id}
                        className={'att-btn ' + st.tone + (marks[s.id] === st.id ? ' active' : '')}
                        onClick={() => mark(s.id, st.id)}
                      >
                        <Ic width={15} height={15} />
                        <span>{t(st.id === 'keldi' ? 'tc.keldi' : st.id === 'ketdi' ? 'tc.ketdi' : 'tc.kirmadi')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </UI.Card>

      {computed && (
        <UI.Card title={t('tc.compute')} icon={<UI.Icon.Trend />} subtitle={computed.empty ? '' : UI.fmtDate(computed.date, t)}>
          {computed.empty ? (
            <p className="muted">{t('c.empty')}</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('c.name')}</th>
                    <th className="right">{t('tc.keldi')}</th>
                    <th className="right">{t('tc.ketdi')}</th>
                    <th className="right">{t('tc.kirmadi')}</th>
                    <th className="right">{t('c.percent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td className="right">{r.keldi}</td>
                      <td className="right">{r.ketdi}</td>
                      <td className="right">{r.kirmadi}</td>
                      <td className="right strong">{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </UI.Card>
      )}
    </div>
  );
}
