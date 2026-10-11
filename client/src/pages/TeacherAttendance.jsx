import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

// Davomat qoidalari (server bilan bir xil):
//  * faqat ikki holat: Keldi / Kelmadi
//  * "Kelmadi" uchun sabab MAJBURIY (kasallik / oilaviy / boshqa) + ixtiyoriy izoh
//  * sinfdagi HAMMA o'quvchi belgilanmaguncha saqlanmaydi
//  * saqlangandan keyin 24 soat ichida tahrirlash mumkin, keyin qulflanadi
const REASONS = [
  { id: 'kasallik', labelKey: 'tc.reasonKasallik' },
  { id: 'oilaviy', labelKey: 'tc.reasonOilaviy' },
  { id: 'boshqa', labelKey: 'tc.reasonBoshqa' },
];

const HOUR = 3600 * 1000;

function hoursLeft(until) {
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / HOUR));
}

export default function TeacherAttendance() {
  const { request, t } = useApp();
  const [myClasses, setMyClasses] = useState([]); // { id, name, stream }
  const [students, setStudents] = useState([]);
  const [cls, setCls] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState({}); // studentId -> { status, reason, note }
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [records, setRecords] = useState([]);
  const [computed, setComputed] = useState(null);
  const [saving, setSaving] = useState(false);

  // ---------- ma'lumotlarni yuklash ----------
  const loadAll = useCallback(async () => {
    try {
      const [me, rec, all] = await Promise.all([request('/me'), request('/attendance'), request('/classes')]);
      const mine = (me.user.classIds || [])
        .map((id) => (all.classes || []).find((c) => c.id === id) || { id, name: '' })
        .filter((c) => c.name);
      setMyClasses(mine);
      setRecords(rec.records || []);
      setCls((prev) => prev || (mine[0] && mine[0].id) || '');
    } catch (e) {
      setErr(e.message);
    }
  }, [request]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!cls) return;
    (async () => {
      try {
        const d = await request('/my-students');
        setStudents((d.students || []).filter((s) => s.classId === cls));
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [cls, request]);

  // Shu sinf + sana uchun oldin saqlangan yozuvlar
  const existing = useMemo(
    () => records.filter((r) => r.classId === cls && r.date === date),
    [records, cls, date]
  );
  const editableUntil = existing.length
    ? existing.reduce((min, r) => (min === null || r.editableUntil < min ? r.editableUntil : min), null)
    : null;
  const locked = Boolean(existing.length && editableUntil && Date.now() >= editableUntil);

  // Oldin saqlangan bo'lsa — belgilarni u yerdan tiklaymiz
  useEffect(() => {
    if (!cls) return;
    const next = {};
    students.forEach((s) => {
      const rec = existing.find((r) => r.studentId === s.id);
      next[s.id] = rec
        ? { status: rec.status, reason: rec.reason || '', note: rec.note || '' }
        : { status: null, reason: '', note: '' };
    });
    setMarks(next);
  }, [students, cls, date, existing.length, records.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = (studentId, status) =>
    setMarks((p) => ({
      ...p,
      [studentId]: { ...(p[studentId] || {}), status, reason: status === 'keldi' ? '' : (p[studentId] || {}).reason || '' },
    }));

  const setReason = (studentId, reason) => setMarks((p) => ({ ...p, [studentId]: { ...p[studentId], reason } }));
  const setNote = (studentId, note) => setMarks((p) => ({ ...p, [studentId]: { ...p[studentId], note } }));

  const markedCount = students.filter((s) => marks[s.id] && marks[s.id].status).length;
  const allMarked = students.length > 0 && markedCount === students.length;
  const missingReasons = students.filter((s) => marks[s.id] && marks[s.id].status === 'kelmadi' && !marks[s.id].reason).length;

  // ---------- saqlash ----------
  const save = async () => {
    setErr('');
    setOk('');
    if (!cls) return setErr(t('c.class'));
    if (locked) return setErr(t('tc.locked'));
    if (!allMarked) {
      return setErr(t('tc.markAllFirst') + ' (' + markedCount + '/' + students.length + ')');
    }
    if (missingReasons) return setErr(t('tc.reason') + ': ' + missingReasons + ' ' + t('c.student').toLowerCase());
    setSaving(true);
    try {
      const entries = students.map((s) => ({
        studentId: s.id,
        status: marks[s.id].status,
        reason: marks[s.id].status === 'kelmadi' ? marks[s.id].reason : '',
        note: marks[s.id].status === 'kelmadi' ? (marks[s.id].note || '').trim() : '',
      }));
      const d = await request('/attendance', { method: 'POST', body: { classId: cls, date, entries } });
      setOk(
        (d.updated ? t('tc.attendanceUpdated') : t('tc.attendanceSaved')) +
          ': ' +
          d.saved +
          ' ' +
          t('tc.marked') +
          ' · ' +
          t('tc.editWindow')
      );
      const rec = await request('/attendance');
      setRecords(rec.records || []);
      setComputed(null);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- hisoblash ----------
  const compute = () => {
    const day = records.filter((r) => r.date === date);
    if (!day.length) {
      setComputed({ empty: true, date });
      return;
    }
    const byStudent = {};
    day.forEach((r) => {
      byStudent[r.studentId] = byStudent[r.studentId] || { name: r.studentName, className: r.className, keldi: 0, kelmadi: 0 };
      if (r.status === 'keldi') byStudent[r.studentId].keldi += 1;
      else byStudent[r.studentId].kelmadi += 1;
    });
    const rows = Object.entries(byStudent).map(([id, v]) => {
      const total = v.keldi + v.kelmadi;
      return { id, ...v, total, pct: total ? Math.round((v.keldi / total) * 100) : 0 };
    });
    setComputed({ rows, date, count: day.length });
  };

  const todayCount = useMemo(() => {
    const day = records.filter((r) => r.date === date);
    return {
      keldi: day.filter((r) => r.status === 'keldi').length,
      kelmadi: day.filter((r) => r.status === 'kelmadi').length,
    };
  }, [records, date]);

  const clsInfo = myClasses.find((c) => c.id === cls);
  const reasonLabel = (id) => t(REASONS.find((r) => r.id === id) ? REASONS.find((r) => r.id === id).labelKey : 'tc.reasonBoshqa');

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
            onChange={setCls}
            options={myClasses.map((c) => ({
              value: c.id,
              label: c.name + (c.stream ? ' — ' + (c.stream === 'ru' ? t('tc.streamRu') : t('tc.streamUz')) : ''),
            }))}
          />
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {err && <div className="alert">{err}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="stat-row">
        <UI.Stat icon={<UI.Icon.Check />} label={t('tc.keldi')} value={todayCount.keldi} tone="green" />
        <UI.Stat icon={<UI.Icon.X />} label={t('tc.kelmadi')} value={todayCount.kelmadi} tone="red" />
        <UI.Stat icon={<UI.Icon.Users />} label={t('tc.students')} value={students.length} tone="blue" />
      </div>

      <UI.Card
        title={clsInfo ? clsInfo.name + ' sinf' : t('c.class')}
        icon={<UI.Icon.Check />}
        subtitle={UI.fmtDate(date, t)}
        actions={
          <span className={'att-locked' + (locked ? '' : ' ok')}>
            <UI.Icon.Clock width={14} height={14} />
            {locked
              ? t('tc.locked')
              : existing.length
              ? t('tc.editableFor') + ': ' + hoursLeft(editableUntil) + ' ' + t('c.hours')
              : t('tc.editWindow')}
          </span>
        }
      >
        <div className="att-save-note">
          <span className={allMarked ? 'strong' : 'muted'}>
            {allMarked ? t('tc.allMarked') : t('tc.markAllFirst')} — {markedCount}/{students.length}
          </span>
          {missingReasons > 0 && <span className="muted">· {t('tc.reason')} ⚠</span>}
        </div>

        {students.length === 0 ? (
          <UI.Empty icon={<UI.Icon.Users />} text={t('c.empty')} />
        ) : (
          <div className="att-list">
            {students.map((s) => {
              const m = marks[s.id] || {};
              const absent = m.status === 'kelmadi';
              return (
                <div key={s.id} className={'att-block' + (locked ? ' locked' : '')}>
                  <div className="att-row">
                    <UI.Avatar name={s.displayName} color="#1B3A5C" size={34} />
                    <div className="att-name">
                      <b>{s.displayName}</b>
                      <span className="muted tiny">
                        {s.className} · {s.coins} {t('c.coin')}
                      </span>
                    </div>
                    <div className="att-buttons">
                      <button
                        className={'att-btn good' + (m.status === 'keldi' ? ' active' : '')}
                        onClick={() => !locked && mark(s.id, 'keldi')}
                        disabled={locked}
                      >
                        <UI.Icon.Check width={15} height={15} />
                        <span>{t('tc.keldi')}</span>
                      </button>
                      <button
                        className={'att-btn bad' + (absent ? ' active' : '')}
                        onClick={() => !locked && mark(s.id, 'kelmadi')}
                        disabled={locked}
                      >
                        <UI.Icon.X width={15} height={15} />
                        <span>{t('tc.kelmadi')}</span>
                      </button>
                    </div>
                  </div>

                  {absent && (
                    <div className="att-reason">
                      <span className="att-reason-label">{t('tc.reason')}:</span>
                      {REASONS.map((r) => (
                        <button
                          key={r.id}
                          className={'reason-btn' + (m.reason === r.id ? ' active' : '')}
                          onClick={() => !locked && setReason(s.id, r.id)}
                          disabled={locked}
                        >
                          {t(r.labelKey)}
                        </button>
                      ))}
                      <input
                        className="att-reason-note"
                        placeholder={t('tc.reasonNote')}
                        value={m.note || ''}
                        onChange={(e) => setNote(s.id, e.target.value)}
                        disabled={locked}
                      />
                      {m.reason && <span className="muted tiny">{reasonLabel(m.reason)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="card-actions-row att-actions">
          <UI.Button variant="subtle" icon={<UI.Icon.Trend />} onClick={compute}>
            {t('tc.compute')}
          </UI.Button>
          <UI.Button
            icon={<UI.Icon.Check />}
            onClick={save}
            loading={saving}
            disabled={locked || !allMarked || missingReasons > 0 || students.length === 0}
          >
            {existing.length ? t('tc.updateAttendance') : t('tc.saveAttendance')}
          </UI.Button>
        </div>
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
                    <th>{t('c.class')}</th>
                    <th className="right">{t('tc.keldi')}</th>
                    <th className="right">{t('tc.kelmadi')}</th>
                    <th className="right">{t('c.percent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td className="muted">{r.className}</td>
                      <td className="right">{r.keldi}</td>
                      <td className="right">{r.kelmadi}</td>
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
