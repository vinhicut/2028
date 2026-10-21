import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Send, X } from 'lucide-react';
import AuthModal from '../../features/auth/AuthModal';
import './ChatWidget.css';

function readSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('tuvi_user') || 'null');
  } catch {
    return null;
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(readSavedUser);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const listRef = useRef(null);
  const isAdmin = user?.role === 'manager' || user?.account_type === 'admin';

  const loadConversations = useCallback(async () => {
    const token = localStorage.getItem('tuvi_token');
    if (!token) return;
    try {
      const response = await fetch('/api/admin/chat/conversations', { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được danh sách hội thoại.');
      const next = result.data || [];
      setConversations(next);
      setSelectedConversation((current) => current && next.find((item) => item.customer_id === current.customer_id) || current);
      setError('');
    } catch (loadError) { setError(loadError.message || 'Không tải được danh sách hội thoại.'); }
  }, []);

  const loadMessages = useCallback(async () => {
    const token = localStorage.getItem('tuvi_token');
    if (!token) return;
    if (isAdmin && !selectedConversation) return;
    try {
      const url = isAdmin ? `/api/admin/chat/conversations/${selectedConversation.customer_id}/messages` : '/api/chat/messages';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được tin nhắn.');
      setMessages(result.data || []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Không tải được tin nhắn.');
    }
  }, [isAdmin, selectedConversation]);

  useEffect(() => {
    const syncUser = () => setUser(readSavedUser());
    window.addEventListener('tuvi-auth-updated', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('tuvi-auth-updated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversations([]);
      setSelectedConversation(null);
      return;
    }
    if (!isAdmin) loadMessages();
  }, [user, isAdmin, loadMessages, loadConversations]);

  useEffect(() => {
    if (!open || !user || isAdmin) return;
    loadMessages();
  }, [open, user, isAdmin, loadMessages]);

  useEffect(() => {
    if (!open || !user || !isAdmin) return;
    loadConversations();
  }, [open, user, isAdmin, loadConversations]);

  useEffect(() => {
    if (!open || !isAdmin || !selectedConversation) return;
    loadMessages();
  }, [open, isAdmin, selectedConversation, loadMessages]);

  useEffect(() => {
    if (!open || !user || isAdmin) return undefined;
    const refreshVisibleChat = () => {
      if (document.visibilityState === 'visible') loadMessages();
    };
    const timer = window.setInterval(refreshVisibleChat, 2500);
    document.addEventListener('visibilitychange', refreshVisibleChat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshVisibleChat);
    };
  }, [open, user, isAdmin, loadMessages]);

  const refreshChat = () => {
    if (isAdmin) loadConversations();
    loadMessages();
  };

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError('');
    try {
      const url = isAdmin ? `/api/admin/chat/conversations/${selectedConversation.customer_id}/messages` : '/api/chat/messages';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('tuvi_token') || ''}`,
        },
        body: JSON.stringify({ message }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không gửi được tin nhắn.');
      setDraft('');
      setMessages((current) => [...current, result.data]);
      if (isAdmin) loadConversations();
    } catch (sendError) {
      setError(sendError.message || 'Không gửi được tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('tuvi_token');
    try {
      if (token) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch { /* The local session is still cleared. */ }
    localStorage.removeItem('tuvi_token');
    localStorage.removeItem('tuvi_user');
    setUser(null);
    setMessages([]);
    window.dispatchEvent(new Event('tuvi-auth-updated'));
  };

  return (
    <>
      <div className="site-chat-widget">
        {open && (
          <section className="site-chat-panel" aria-label={isAdmin ? 'Hộp thư hỗ trợ khách hàng' : 'Chat với chúng tôi'}>
            <header className="site-chat-header">
              <span className="site-chat-header-icon"><MessageCircle size={19} /></span>
              <button type="button" className="site-chat-close" onClick={refreshChat} aria-label="Làm mới tin nhắn" title="Làm mới"><RefreshCw size={16} /></button>
              <div><strong>{isAdmin ? 'Tin nhắn khách hàng' : 'Chat với chúng tôi'}</strong><small>{user ? `Xin chào, ${user.name || 'bạn'}` : 'Đăng nhập để bắt đầu trò chuyện'}</small></div>
              <button type="button" className="site-chat-close" onClick={() => setOpen(false)} aria-label="Đóng chat"><X size={19} /></button>
            </header>
            {!user ? (
              <div className="site-chat-login">
                <MessageCircle size={34} />
                <p>Vui lòng đăng nhập bằng Google để gửi tin nhắn và nhận phản hồi từ quản trị viên.</p>
                <button type="button" onClick={() => setAuthOpen(true)}>Đăng nhập để chat</button>
              </div>
            ) : (
              <>
                {isAdmin && !selectedConversation && (
                  <nav className="site-chat-inbox" aria-label="Danh sách hội thoại">
                    {conversations.length === 0 ? <p className="site-chat-empty">Chưa có khách nhắn tin.</p> : conversations.map((conversation) => (
                      <button type="button" key={conversation.customer_id} onClick={() => { setSelectedConversation(conversation); setMessages([]); }}>
                        <span><strong>{conversation.display_name}</strong><small>{conversation.last_message}</small></span>
                        {Number(conversation.unread_count) > 0 && <b>{conversation.unread_count}</b>}
                      </button>
                    ))}
                  </nav>
                )}
                {isAdmin && selectedConversation && <button type="button" className="site-chat-back" onClick={() => { setSelectedConversation(null); setMessages([]); }}>← Danh sách · {selectedConversation.display_name}</button>}
                {(!isAdmin || selectedConversation) && <>
                <div className="site-chat-messages" ref={listRef} aria-live="polite">
                  {messages.length === 0 && <p className="site-chat-empty">{isAdmin ? 'Chưa có tin nhắn trong hội thoại này.' : 'Hãy gửi lời nhắn. Quản trị viên sẽ phản hồi tại đây.'}</p>}
                  {messages.map((item) => (
                    <article className={`site-chat-message ${item.sender_role === (isAdmin ? 'manager' : 'customer') ? 'is-customer' : 'is-admin'}`} key={item.id}>
                      <span>{item.sender_role === 'manager' ? 'Quản trị viên' : isAdmin ? item.sender_name : 'Bạn'}</span>
                      <p>{item.message}</p>
                      <time>{new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time>
                    </article>
                  ))}
                </div>
                {error && <p className="site-chat-error" role="alert">{error}</p>}
                <form className="site-chat-compose" onSubmit={sendMessage}>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Nhập tin nhắn…" maxLength={2000} rows={2} aria-label="Tin nhắn" />
                  <button type="submit" disabled={!draft.trim() || sending} aria-label="Gửi tin nhắn"><Send size={18} /></button>
                </form>
                </>}
              </>
            )}
          </section>
        )}
        <button type="button" className={`site-chat-launcher ${open ? 'is-open' : ''}`} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Đóng hộp chat' : 'Mở chat với quản trị viên'}>
          {open ? <X size={23} /> : <><MessageCircle size={22} /><span>Chat với chúng tôi</span></>}
        </button>
      </div>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        user={user}
        onAuthSuccess={(nextUser) => { setUser(nextUser); setOpen(true); }}
        onLogout={handleLogout}
      />
    </>
  );
}
