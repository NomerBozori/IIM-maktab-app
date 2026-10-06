import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

export default function TeacherTasks() {
  const { request, t, user } = useApp();
  const [tasks, setTasks] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', className: '', subject: '' });

  const load = useCallback(async () => {
    try {
      const [ts, me] = await Promise.all([request('/tasks'), request('/me')]);
      setTasks(ts.tasks);
      const cls = me.user.classes || [];
      setMyClasses(cls);
      if (cls.length) setForm((p) => ({ ...p, className: p.className || cls[0], subject: p.subject || me.user.subject || '' }));
    } catch (e) {
      setErr(e.message);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');
    if (!form.title.trim()) return setErr(t('tc.taskTitle'));
    try {
      await request('/tasks', { method: 'POST', body: form });
      setOk(t('tc.giveTask') + ' ✓');
      setForm((p) => ({ ...p, title: '', description: '', dueDate: '' }));
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const shown = filter === 'all' ? tasks : tasks.filter((x) => x.className === filter);

  return (
    <div className="teacher-tasks">
      <div className="page-head">
        <div>
          <h1>{t('nav.tasks')}</h1>
          <p className="muted">{t('tc.myTasks')}</p>
        </div>
      </div>

      {err && <div className="alert">{err}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="two-col">
        <UI.Card title={t('tc.giveTask')} icon={<UI.Icon.Plus />} subtitle="Uyga vazifa berish">
          <form className="form" onSubmit={submit}>
            <UI.Field label={t('tc.taskTitle')}>
              <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Vazifa nomi" />
            </UI.Field>
            <UI.Field label={t('c.subject')}>
              <input className="input" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
            </UI.Field>
            <div className="form-row">
              <UI.Field label={t('c.class')}>
                <UI.Select
                  value={form.className}
                  onChange={(v) => setForm((p) => ({ ...p, className: v }))}
                  options={myClasses.map((c) => ({ value: c, label: c }))}
                />
              </UI.Field>
              <UI.Field label={t('c.deadline')}>
                <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
              </UI.Field>
            </div>
            <UI.Field label={t('c.description')}>
              <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </UI.Field>
            <UI.Button type="submit" icon={<UI.Icon.Send />}>
              {t('tc.createTask')}
            </UI.Button>
          </form>
        </UI.Card>

        <UI.Card
          title={t('tc.myTasks')}
          icon={<UI.Icon.Clipboard />}
          actions={
            <UI.Select
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: t('c.all') }, ...myClasses.map((c) => ({ value: c, label: c }))]}
            />
          }
        >
          {shown.length === 0 && <UI.Empty icon={<UI.Icon.Clipboard />} text={t('tc.noTasks')} />}
          <div className="task-cards">
            {shown.map((x) => (
              <div key={x.id} className="task-card">
                <div className="tc-top">
                  <span className="badge">{x.className}</span>
                  <span className="muted tiny">{x.subject}</span>
                </div>
                <b>{x.title}</b>
                {x.description && <p className="small">{x.description}</p>}
                <div className="tc-foot">
                  <span className="muted tiny">
                    {t('c.deadline')}: {UI.fmtDate(x.dueDate, t)}
                  </span>
                  <span className="pill ok">
                    <UI.Icon.Check width={13} height={13} /> {(x.completedBy || []).length} {t('st.done').toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </UI.Card>
      </div>
    </div>
  );
}
