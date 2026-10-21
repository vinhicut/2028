import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Send, UserRound, X } from 'lucide-react';
import './AdminChatPanel.css';

const tokenHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('tuvi_token') || ''}` });

export default function AdminChatPanel() {
  const [conversations, setConversations] = useState([]);
  const [openConversations, setOpenConversations] = useState([]);
  const [messagesByCustomer, setMessagesByCustomer] = useState({});
  const [drafts, setDrafts] = useState({});
  const [sendingIds, setSendingIds] = useState([]);
  const [error, setError] = useState('');
  const [newMessageNotice, setNewMessageNotice] = useState(null);
  const listRefs = useRef({});
  const unreadCountsRef = useRef(null);
  const openCustomerIds = openConversations.map((conversation) => conversation.customer_id).join(',');

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/chat/conversations', { headers: tokenHeaders() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được danh sách chat.');
      const nextConversations = result.data || [];
      const previousCounts = unreadCountsRef.current;
      if (previousCounts) {
        const incoming = nextConversations.find((conversation) =>
          Number(conversation.unread_count) > (previousCounts.get(conversation.customer_id) || 0),
        );
        if (incoming) setNewMessageNotice(incoming);
      }
      unreadCountsRef.current = new Map(nextConversations.map((conversation) => [
        conversation.customer_id,
        Number(conversation.unread_count) || 0,
      ]));
      setConversations(nextConversations);
      setOpenConversations((current) => current.map((item) =>
        nextConversations.find((conversation) => conversation.customer_id === item.customer_id) || item,
      ));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Không tải được danh sách chat.');
    }
  }, []);

  const loadMessages = useCallback(async (customerId) => {
    try {
      const response = await fetch(`/api/admin/chat/conversations/${customerId}/messages`, { headers: tokenHeaders() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được hội thoại.');
      setMessagesByCustomer((current) => ({ ...current, [customerId]: result.data || [] }));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Không tải được hội thoại.');
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const customerIds = openCustomerIds ? openCustomerIds.split(',') : [];
    customerIds.forEach((customerId) => loadMessages(customerId));
  }, [openCustomerIds, loadMessages]);

  const refreshChats = () => {
    loadConversations();
    openConversations.forEach((conversation) => loadMessages(conversation.customer_id));
  };

  useEffect(() => {
    openConversations.forEach((conversation) => {
      const list = listRefs.current[conversation.customer_id];
      if (list) list.scrollTop = list.scrollHeight;
    });
  }, [messagesByCustomer, openConversations]);

  const openConversation = (conversation) => {
    setOpenConversations((current) => current.some((item) => item.customer_id === conversation.customer_id)
      ? current
      : [...current, conversation]);
    setNewMessageNotice((current) => current?.customer_id === conversation.customer_id ? null : current);
  };

  const closeConversation = (customerId) => {
    setOpenConversations((current) => current.filter((item) => item.customer_id !== customerId));
    setMessagesByCustomer((current) => {
      const next = { ...current };
      delete next[customerId];
      return next;
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[customerId];
      return next;
    });
  };

  const sendReply = async (event, conversation) => {
    event.preventDefault();
    const customerId = conversation.customer_id;
    const message = (drafts[customerId] || '').trim();
    if (!message || sendingIds.includes(customerId)) return;
    setSendingIds((current) => [...current, customerId]);
    setError('');
    try {
      const response = await fetch(`/api/admin/chat/conversations/${customerId}/messages`, {
        method: 'POST',
        headers: { ...tokenHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không gửi được phản hồi.');
      setDrafts((current) => ({ ...current, [customerId]: '' }));
      setMessagesByCustomer((current) => ({
        ...current,
        [customerId]: [...(current[customerId] || []), result.data],
      }));
      loadConversations();
    } catch (sendError) {
      setError(sendError.message || 'Không gửi được phản hồi.');
    } finally {
      setSendingIds((current) => current.filter((id) => id !== customerId));
    }
  };

  return (
    <section className="admin-chat-panel">
      <header className="admin-chat-heading">
        <div><span><MessageCircle size={16} /> HỖ TRỢ KHÁCH HÀNG</span><h2>Hội thoại chat</h2></div>
        <button type="button" onClick={refreshChats} aria-label="Làm mới danh sách và tin nhắn"><RefreshCw size={17} /></button>
      </header>
      {newMessageNotice && (
        <button type="button" className="admin-chat-notice" onClick={() => openConversation(newMessageNotice)} aria-live="polite">
          <MessageCircle size={16} />
          <span><strong>Tin nhắn mới từ {newMessageNotice.display_name}</strong><small>{newMessageNotice.last_message}</small></span>
          <span>Mở chat</span>
        </button>
      )}
      {error && <p className="admin-chat-error" role="alert">{error}</p>}
      <div className="admin-chat-layout">
        <nav className="admin-chat-conversations" aria-label="Danh sách hội thoại">
          {conversations.length === 0 ? <p className="admin-chat-empty-list">Chưa có khách nhắn tin.</p> : conversations.map((conversation) => {
            const isOpen = openConversations.some((item) => item.customer_id === conversation.customer_id);
            return (
              <button type="button" key={conversation.customer_id} onClick={() => openConversation(conversation)} className={isOpen ? 'is-selected' : ''}>
                {conversation.avatar_url ? <img src={conversation.avatar_url} alt="" /> : <span className="admin-chat-avatar"><UserRound size={17} /></span>}
                <span className="admin-chat-conversation-copy"><strong>{conversation.display_name}</strong><small>{conversation.last_message}</small></span>
                {Number(conversation.unread_count) > 0 && <b>{conversation.unread_count}</b>}
              </button>
            );
          })}
        </nav>
        <div className="admin-chat-windows">
          {openConversations.length === 0 ? (
            <div className="admin-chat-placeholder"><MessageCircle size={28} /><p>Chọn khách hàng để mở cửa sổ chat riêng.</p></div>
          ) : openConversations.map((conversation) => {
            const customerId = conversation.customer_id;
            const messages = messagesByCustomer[customerId] || [];
            return (
              <article className="admin-chat-window" key={customerId}>
                <header className="admin-chat-window-title">
                  <span><strong>{conversation.display_name}</strong><small>{conversation.email}</small></span>
                  <button type="button" onClick={() => closeConversation(customerId)} aria-label={`Đóng chat với ${conversation.display_name}`} title="Đóng cửa sổ chat"><X size={16} /></button>
                </header>
                <div className="admin-chat-thread-messages" ref={(element) => { listRefs.current[customerId] = element; }} aria-live="polite">
                  {messages.length === 0 && <p className="admin-chat-window-empty">Chưa có tin nhắn.</p>}
                  {messages.map((message) => (
                    <div key={message.id} className={`admin-chat-message ${message.sender_role === 'manager' ? 'is-manager' : ''}`}>
                      <span>{message.sender_role === 'manager' ? 'Quản trị viên' : message.sender_name}</span><p>{message.message}</p>
                      <time>{new Date(message.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                  ))}
                </div>
                <form className="admin-chat-compose" onSubmit={(event) => sendReply(event, conversation)}>
                  <textarea value={drafts[customerId] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [customerId]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Nhập phản hồi…" maxLength={2000} rows={2} aria-label={`Phản hồi ${conversation.display_name}`} />
                  <button type="submit" disabled={!(drafts[customerId] || '').trim() || sendingIds.includes(customerId)} aria-label="Gửi phản hồi"><Send size={17} /></button>
                </form>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
