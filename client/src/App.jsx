import React, { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useApp, LANGS } from './store.jsx';
import * as UI from './ui.jsx';
import LoginPage from './pages/Login.jsx';
import StudentHome from './pages/StudentHome.jsx';
import RankingsPage from './pages/Rankings.jsx';
import ChatPage from './pages/ChatPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import TeacherHome from './pages/TeacherHome.jsx';
import TeacherTasks from './pages/TeacherTasks.jsx';
import TeacherSchedule from './pages/TeacherSchedule.jsx';
import TeacherAttendance from './pages/TeacherAttendance.jsx';
import DirectorHome from './pages/DirectorHome.jsx';

const MENUS = {
  student: [
    { to: '/', key: 'nav.home', icon: 'Home' },
    { to: '/rankings', key: 'nav.rankings', icon: 'Trophy' },
    { to: '/chat', key: 'nav.chat', icon: 'Chat' },
    { to: '/settings', key: 'nav.settings', icon: 'Settings' },
  ],
  teacher: [
    { to: '/', key: 'nav.home', icon: 'Home' },
    { to: '/tasks', key: 'nav.tasks', icon: 'Clipboard' },
    { to: '/schedule', key: 'nav.schedule', icon: 'Calendar' },
    { to: '/attendance', key: 'nav.attendance', icon: 'Check' },
    { to: '/chat', key: 'nav.chat', icon: 'Chat' },
    { to: '/settings', key: 'nav.settings', icon: 'Settings' },
  ],
  director: [
    { to: '/', key: 'nav.home', icon: 'Home' },
    { to: '/chat', key: 'nav.chat', icon: 'Chat' },
    { to: '/settings', key: 'nav.settings', icon: 'Settings' },
  ],
};

const ROLE_LABEL = { student: 'c.student', teacher: 'c.teacher', director: 'c.director' };

function Layout({ children }) {
  const { user, logout, t, theme, setTheme, lang, setLang } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);

  const menu = MENUS[user.role] || [];
  const current = menu.find((m) => m.to === loc.pathname) || menu[0];

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div className={'app' + (drawer ? ' drawer-open' : '')}>
      <aside className="sidebar" onClick={() => setDrawer(false)}>
        <div className="brand">
          <span className="brand-mark">
            <UI.Logo size={38} title="Intellekt Innovatsion Maktabi" />
          </span>
          <div className="brand-txt">
            <b>Intellekt</b>
            <i>Innovatsion Maktabi</i>
          </div>
        </div>

        <nav className="nav">
          {menu.map((m) => {
            const Ic = UI.Icon[m.icon];
            const active = loc.pathname === m.to;
            return (
              <button
                key={m.to}
                className={'nav-item' + (active ? ' active' : '')}
                onClick={() => {
                  nav(m.to);
                  setDrawer(false);
                }}
              >
                <span className="nav-ic">
                  <Ic />
                </span>
                <span>{t(m.key)}</span>
              </button>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="user-chip">
            <UI.Avatar name={user.displayName} color={user.role === 'director' ? '#6B4E9B' : user.role === 'teacher' ? '#1B3A5C' : '#C9A227'} size={36} />
            <div className="min">
              <div className="strong">{user.displayName}</div>
              <div className="muted tiny">{t(ROLE_LABEL[user.role])}</div>
            </div>
          </div>
          <button
            className="nav-item logout"
            onClick={() => {
              logout();
              nav('/');
            }}
          >
            <span className="nav-ic">
              <UI.Icon.LogOut />
            </span>
            <span>{t('c.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-mobile" title="Menyu" onClick={() => setDrawer((v) => !v)}>
            <UI.Icon.Menu />
          </button>
          <span className="topbar-brand only-mobile">
            <UI.Logo size={30} />
          </span>
          <h2 className="page-title">{t(current.key)}</h2>
          <div className="spacer" />
          <div className="lang-wrap">
            <span className="only-desktop muted tiny">
              <UI.Icon.Globe width={14} height={14} />
            </span>
            <select
              className="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label={t('stt.language')}
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <UI.IconButton title={t('stt.display')} onClick={toggleTheme}>
            {theme === 'light' ? <UI.Icon.Moon /> : <UI.Icon.Sun />}
          </UI.IconButton>
          <UI.Avatar name={user.displayName} color={user.role === 'director' ? '#6B4E9B' : user.role === 'teacher' ? '#1B3A5C' : '#C9A227'} size={34} />
        </header>

        <main className="content">{children}</main>
      </div>

      {drawer && <div className="drawer-mask" onClick={() => setDrawer(false)} />}
    </div>
  );
}

function RoleRoutes() {
  const { user } = useApp();
  if (user.role === 'student') {
    return (
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  if (user.role === 'teacher') {
    return (
      <Routes>
        <Route path="/" element={<TeacherHome />} />
        <Route path="/tasks" element={<TeacherTasks />} />
        <Route path="/schedule" element={<TeacherSchedule />} />
        <Route path="/attendance" element={<TeacherAttendance />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<DirectorHome />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user } = useApp();
  if (!user) return <LoginPage />;
  return (
    <Layout>
      <RoleRoutes />
    </Layout>
  );
}
