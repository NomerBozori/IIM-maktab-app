import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import * as UI from '../ui.jsx';

export default function ChatPage() {
  const { request, t, user } = useApp();
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const endRef = useRef(null);

  const loadChats = useCallback(async () => {
    try {
      const d = await request('/chats');
      setChats(d.chats);
      setActive((prev) => prev || (d.chats[0] && d.chats[0].roomId));
    } catch (e) {
      setErr(e.message);
    }
  }, [request]);

  const loadMessages = useCallback(async () => {
    if (!active) return;
    try {
      const d = await request('/chats/' + encodeURIComponent(active) + '/messages');
      setMessages(d.messages);
    } catch (e) {
      setErr(e.message);
    }
  }, [active, request]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    loadMessages();
    const id = setInterval(loadMessages, 4000);
    return () => clearInterval(id);
  }, [loadMessages]);

  useEffect(() => {
    // scrollIntoView ba'zi muhitlarda (jsdom, eski brauzerlar) mavjud emas
    const el = endRef.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    try {
      await request('/chats/' + encodeURIComponent(active) + '/messages', { method: 'POST', body: { text } });
      setText('');
      await loadMessages();
      loadChats();
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const current = chats.find((c) => c.roomId === active);
  const filtered = chats.filter((c) => (c.title || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="chat-page">
      <div className="chat-list">
        <div className="chat-list-head">
          <h3>{t('nav.chat')}</h3>
          <span className="muted tiny">{chats.length}</span>
        </div>
        <div className="chat-search">
          <input className="input" placeholder={t('c.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chat-items">
          {filtered.map((c) => (
            <button
              key={c.roomId}
              className={'chat-item' + (active === c.roomId ? ' active' : '')}
              onClick={() => setActive(c.roomId)}
            >
              <UI.Avatar name={c.title} color={c.avatarColor || '#1B3A5C'} size={38} />
              <div className="ci-body">
                <div className="ci-top">
                  <b>{c.title}</b>
                  <span className="muted tiny">{c.lastMessage ? UI.timeAgo(c.lastMessage.createdAt, t) : ''}</span>
                </div>
                <div className="muted tiny ci-sub">{c.subtitle || (c.type === 'class' || c.type === 'group' ? t('tc.classChat') : '')}</div>
                {c.lastMessage && (
                  <div className="muted small ci-last">
                    {c.lastMessage.senderId === user.id ? t('c.you') + ': ' : ''}
                    {c.lastMessage.text}
                  </div>
                )}
              </div>
              {c.type === 'group' && (
                <span className="ci-type">
                  <UI.Icon.Users width={14} height={14} />
                </span>
              )}
            </button>
          ))}
          {!filtered.length && <p className="muted small pad">{t('c.empty')}</p>}
        </div>
      </div>

      <div className="chat-main">
        {current ? (
          <>
            <header className="chat-head">
              <UI.Avatar name={current.title} color={current.avatarColor || '#1B3A5C'} size={40} />
              <div>
                <b>{current.title}</b>
                <div className="muted tiny">
                  {current.subtitle || ''}
                  {current.memberCount != null ? ' · ' + current.memberCount + ' ' + t('tc.students').toLowerCase() : ''}
                </div>
              </div>
            </header>

            <div className="chat-messages">
              {messages.length === 0 && <p className="muted small center pad">{t('c.empty')}</p>}
              {messages.map((m) => {
                const mine = m.senderId === user.id;
                return (
                  <div key={m.id} className={'msg' + (mine ? ' mine' : '')}>
                    {!mine && <UI.Avatar name={m.senderName} color={mine ? '#C9A227' : m.senderRole === 'teacher' ? '#1B3A5C' : '#6B4E9B'} size={30} />}
                    <div className="msg-body">
                      {!mine && <div className="msg-who muted tiny">{m.senderName}</div>}
                      <div className="msg-text">{m.text}</div>
                      <div className="muted tiny msg-time">{UI.timeAgo(m.createdAt, t)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form className="chat-input" onSubmit={send}>
              <input
                className="input"
                placeholder={t('c.write')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              <UI.Button type="submit" icon={<UI.Icon.Send width={16} height={16} />} disabled={!text.trim()}>
                {t('c.send')}
              </UI.Button>
            </form>
          </>
        ) : (
          <div className="center pad muted">{t('c.empty')}</div>
        )}
      </div>
      {err && <div className="toast-err">{err}</div>}
    </div>
  );
}
