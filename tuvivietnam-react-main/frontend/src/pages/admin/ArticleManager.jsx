import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft, Bold, Eye, FileImage, FileText, ImagePlus, Italic, Layout, Plus, Save, Send, Trash2, Underline } from 'lucide-react';
import './ArticleManager.css';
import './ArticleManagerFormatting.css';
import './ArticleManagerWord.css';
import { escapeRichText, hasRichText, parseArticleContent, sanitizeRichText, serializeArticleContent } from '../../shared/utils/articleContent';
import ArticleBody from '../../shared/ui/ArticleBody';

const initialBlocks = () => [{ type: 'text', text: '', align: 'left', font: 'Georgia, serif', color: '#3f3933', fontSize: 16 }];
const emptyArticle = { title: '', slug: '', excerpt: '', cover_image: '', category: 'Phật pháp', content: JSON.stringify(initialBlocks()), status: 'draft' };
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('tuvi_token') || ''}`, 'Content-Type': 'application/json' });

export default function ArticleManager() {
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(emptyArticle);
  const [editingId, setEditingId] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ribbonTab, setRibbonTab] = useState('home');
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [pageMargin, setPageMargin] = useState('normal');
  const [selectedColor, setSelectedColor] = useState('#3f3933');
  const [previewContent, setPreviewContent] = useState(emptyArticle.content);
  const coverInput = useRef(null);
  const bodyInput = useRef(null);
  const editorElements = useRef({});
  const editorHtml = useRef({});
  const savedSelection = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('tuvi_token') || ''}` } });
      const session = await auth.json().catch(() => ({}));
      if (!auth.ok || session.user?.role !== 'manager') throw new Error('Vui lòng đăng nhập bằng tài khoản quản trị viên.');
      setAuthorized(true);
      const response = await fetch('/api/admin/articles', { headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được bài viết.');
      setArticles(result.data || []);
    } catch (loadError) { setError(loadError.message || 'Không tải được dữ liệu.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setArticle((current) => ({ ...current, [key]: value }));
  const startNew = () => { setArticle(emptyArticle); setEditingId(null); editorHtml.current = {}; setNotice(''); setError(''); setPreview(false); };
  const editArticle = (item) => {
    editorHtml.current = {};
    setArticle({ title: item.title, slug: item.slug, excerpt: item.excerpt || '', cover_image: item.cover_image || '', category: item.category || 'Phật pháp', content: JSON.stringify(parseArticleContent(item.content)), status: item.status });
    setEditingId(item.id); setNotice(''); setError(''); setPreview(false);
    document.querySelector('.article-manager-editor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const blocks = parseArticleContent(article.content);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const setBlocks = (nextBlocks) => update('content', serializeArticleContent(nextBlocks));
  const getCurrentBlocks = () => blocksRef.current.map((block, index) => {
    const html = Object.hasOwn(editorHtml.current, index) ? editorHtml.current[index] : (editorElements.current[index]?.innerHTML ?? block.html);
    return html ? { ...block, html, text: editorElements.current[index]?.innerText || block.text || '' } : block;
  });
  const updateBlock = (index, values) => setBlocks(getCurrentBlocks().map((block, blockIndex) => blockIndex === index ? { ...block, ...values } : block));
  const activeBlock = blocks[activeBlockIndex] || {};
  const setActiveStyle = (key, value) => {
    if (activeBlock.type === 'text' || activeBlock.type === 'heading') updateBlock(activeBlockIndex, { [key]: value });
  };
  const toggleActiveStyle = (key) => setActiveStyle(key, !activeBlock[key]);
  const rememberSelection = (index) => {
    const selection = window.getSelection();
    const editor = editorElements.current[index];
    if (selection?.rangeCount && editor?.contains(selection.anchorNode)) savedSelection.current = selection.getRangeAt(0).cloneRange();
  };
  const applyInlineStyle = (styleName, value) => {
    const index = activeBlockIndex;
    const editor = editorElements.current[index];
    const range = savedSelection.current;
    if (!editor || !range || range.collapsed || !editor.contains(range.commonAncestorContainer)) return false;
    const span = document.createElement('span');
    span.style[styleName] = value;
    try {
      span.append(range.extractContents());
      range.insertNode(span);
      const selected = document.createRange();
      selected.selectNodeContents(span);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(selected);
      savedSelection.current = selected.cloneRange();
      editorHtml.current[index] = editor.innerHTML;
      const updatedBlocks = getCurrentBlocks();
      updatedBlocks[index] = { ...updatedBlocks[index], html: editor.innerHTML, text: editor.innerText || '' };
      setBlocks(updatedBlocks);
      return true;
    } catch { return false; }
  };
  const applySelectionCommand = (command, value = null) => {
    const editor = editorElements.current[activeBlockIndex];
    if (!editor || !savedSelection.current || savedSelection.current.collapsed) {
      setNotice('Bôi đen đoạn chữ muốn định dạng trước khi chọn công cụ.');
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(savedSelection.current);
    document.execCommand(command, false, value);
    editorHtml.current[activeBlockIndex] = editor.innerHTML;
    if (selection.rangeCount) savedSelection.current = selection.getRangeAt(0).cloneRange();
  };
  const applySelectedColor = (color) => {
    if (!applyInlineStyle('color', color)) {
      setNotice('Hãy bôi đen chữ cần đổi màu trước khi chọn màu.');
      return;
    }
    setNotice('Đã đổi màu phần chữ được chọn.');
    setSelectedColor(color);
  };
  const applySelectedFontSize = (fontSize) => {
    if (!applyInlineStyle('fontSize', `${fontSize}px`)) setActiveStyle('fontSize', fontSize);
  };
  const addBlock = (type) => {
    const block = type === 'heading' ? { type, text: '', align: 'left', font: 'Georgia, serif', color: '#713a2e', fontSize: 22 } : { type: 'text', text: '', align: 'left', font: 'Georgia, serif', color: '#3f3933', fontSize: 16 };
    const next = [...getCurrentBlocks(), block];
    setBlocks(next); setActiveBlockIndex(next.length - 1);
  };
  const insertUploadedImage = (url, file) => {
    const current = getCurrentBlocks();
    const imageBlock = { type: 'image', src: url, alt: file?.name || '', caption: '' };
    const index = activeBlockIndex;
    const editor = editorElements.current[index];
    const range = savedSelection.current;
    let beforeHtml;
    let afterHtml;
    if (editor && range && editor.contains(range.endContainer)) {
      const beforeRange = document.createRange();
      beforeRange.setStart(editor, 0);
      beforeRange.setEnd(range.endContainer, range.endOffset);
      const afterRange = document.createRange();
      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEnd(editor, editor.childNodes.length);
      const before = document.createElement('div');
      const after = document.createElement('div');
      before.append(beforeRange.cloneContents());
      after.append(afterRange.cloneContents());
      beforeHtml = before.innerHTML;
      afterHtml = after.innerHTML;
    }

    const paragraph = (html = '') => ({ type: current[index]?.type === 'heading' ? 'heading' : 'text',
      ...(current[index] || {}), html, text: '', align: current[index]?.align || 'left',
      font: current[index]?.font || 'Georgia, serif', color: current[index]?.color || '#3f3933',
      fontSize: current[index]?.fontSize || 16 });
    const next = [...current];
    if (beforeHtml !== undefined) {
      next.splice(index, 1, paragraph(beforeHtml), imageBlock, paragraph(afterHtml));
    } else {
      const insertAt = Math.min(index + 1, next.length);
      next.splice(insertAt, 0, imageBlock, paragraph());
    }
    editorHtml.current = Object.fromEntries(next.flatMap((block, blockIndex) =>
      block.type === 'image' ? [] : [[blockIndex, block.html || '']],
    ));
    setBlocks(next);
    setActiveBlockIndex(beforeHtml !== undefined ? index + 2 : Math.min(index + 2, next.length - 1));
    savedSelection.current = null;
  };
  const uploadImage = async (file, onUploaded) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setError('Chỉ hỗ trợ ảnh PNG, JPG, WebP hoặc GIF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh cần nhỏ hơn 5 MB.'); return; }
    update('content', serializeArticleContent(getCurrentBlocks()));
    setUploading(true); setError('');
    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'));
        reader.readAsDataURL(file);
      });
      const response = await fetch('/api/admin/article-images', { method: 'POST', headers: headers(), body: JSON.stringify({ image_data: imageData }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải lên được ảnh.');
      onUploaded(result.data.url);
      setNotice('Đã tải ảnh lên. Lưu bài viết để lưu thay đổi.');
    } catch (uploadError) { setError(uploadError.message || 'Không tải lên được ảnh.'); }
    finally { setUploading(false); }
  };

  const getCurrentContent = () => {
      return serializeArticleContent(getCurrentBlocks());
  };

  const save = async (status = article.status) => {
    const content = getCurrentContent();
    const contentBlocks = parseArticleContent(content);
    const hasContent = contentBlocks.some((block) => block.type === 'image' ? Boolean(block.src) : Boolean(block.text?.trim() || hasRichText(block.html)));
    if (!hasContent) { setError('Hãy nhập nội dung bài viết trước khi lưu.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(editingId ? `/api/admin/articles/${editingId}` : '/api/admin/articles', {
        method: editingId ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify({ ...article, content, status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không lưu được bài viết.');
      setArticle({ ...article, content, slug: result.data.slug, status: result.data.status });
      editorHtml.current = {};
      setEditingId(result.data.id);
      setNotice(status === 'published' ? 'Đã xuất bản bài viết lên trang Phật pháp.' : 'Đã lưu bài viết ở trạng thái nháp.');
      await load();
    } catch (saveError) { setError(saveError.message || 'Không lưu được bài viết.'); }
    finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xóa bài viết “${item.title}”?`)) return;
    try {
      const response = await fetch(`/api/admin/articles/${item.id}`, { method: 'DELETE', headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không xóa được bài viết.');
      setArticles((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) startNew();
    } catch (deleteError) { setError(deleteError.message || 'Không xóa được bài viết.'); }
  };

  return <div className="article-manager-page article-word-app">
    <header className="article-manager-header"><div className="article-word-title-area"><Link to="/quan-ly"><ArrowLeft size={16} /> Quản lý</Link><span className="article-word-brand"><FileText size={19} /> TU VI WRITER <i>·</i> {editingId ? article.title || 'Bài viết chưa đặt tên' : 'Bài viết mới'}</span><div className="article-word-save-state"><span className={article.status === 'published' ? 'is-live' : ''} /> {article.status === 'published' ? 'Đã xuất bản' : 'Đã lưu trên thiết bị khi bấm Lưu nháp'}</div></div><div className="article-word-header-actions"><button type="button" className="article-manager-new" onClick={startNew}><Plus size={17} /> Bài viết mới</button><button type="button" className="article-manager-publish" onClick={() => save('published')} disabled={saving || !article.title.trim()}><Send size={16} /> {saving ? 'Đang lưu…' : 'Xuất bản'}</button></div></header>
    {!authorized && !loading ? <div className="article-manager-message" role="alert">{error} <Link to="/">Về trang chủ</Link></div> : <>
      {error && <div className="article-manager-message" role="alert">{error}</div>}
      {notice && <div className="article-manager-notice" role="status">{notice}</div>}
      <div className={`article-manager-layout article-word-page ${pageMargin}`}>
        <section className="article-manager-editor">
          <div className="article-manager-section-title"><div><FileText size={18} /><h2>{editingId ? 'Chỉnh sửa bài viết' : 'Soạn bài mới'}</h2></div><span>{article.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></div>
          <label>Tiêu đề<input maxLength={240} value={article.title} onChange={(event) => update('title', event.target.value)} placeholder="Ví dụ: Tinh thần từ bi trong đời sống hằng ngày" /></label>
          <div className="article-manager-two-col"><label>Đường dẫn (slug)<input maxLength={255} value={article.slug} onChange={(event) => update('slug', event.target.value)} placeholder="Tự tạo từ tiêu đề nếu để trống" /></label><label>Chuyên mục<input value="Phật pháp" readOnly /></label></div>
          <label>Mô tả ngắn<textarea rows={2} maxLength={600} value={article.excerpt} onChange={(event) => update('excerpt', event.target.value)} placeholder="Một vài câu giới thiệu bài viết" /></label>
          <label>Ảnh bìa<input maxLength={1000} value={article.cover_image} onChange={(event) => update('cover_image', event.target.value)} placeholder="Dán URL ảnh hoặc tải ảnh lên" /><span className="article-manager-upload-row"><button type="button" onClick={() => coverInput.current?.click()} disabled={uploading}><ImagePlus size={15} /> {uploading ? 'Đang tải ảnh…' : 'Tải ảnh bìa lên'}</button><input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => uploadImage(event.target.files?.[0], (url) => update('cover_image', url))} /></span></label>
          <section className="article-manager-blocks">
    <nav className="article-word-ribbon" aria-label="Công cụ soạn bài"><div className="article-word-tabs"><button type="button" className={ribbonTab === 'home' ? 'active' : ''} onClick={() => setRibbonTab('home')}>Trang đầu</button><button type="button" className={ribbonTab === 'insert' ? 'active' : ''} onClick={() => setRibbonTab('insert')}>Chèn</button><button type="button" className={ribbonTab === 'layout' ? 'active' : ''} onClick={() => setRibbonTab('layout')}>Bố trí</button></div>
      {ribbonTab === 'home' && <div className="article-word-tools"><div className="article-word-tool-group"><select aria-label="Font chữ" value={activeBlock.font || 'Georgia, serif'} onChange={(event) => setActiveStyle('font', event.target.value)} disabled={activeBlock.type === 'image'}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="'Times New Roman', serif">Times New Roman</option><option value="system-ui, sans-serif">Be Vietnam Pro</option></select><select aria-label="Kiểu đoạn" value={activeBlock.type === 'heading' ? 'heading' : 'body'} onChange={(event) => setActiveStyle('type', event.target.value === 'heading' ? 'heading' : 'text')}><option value="body">Văn bản thường</option><option value="heading">Tiêu đề mục</option></select><select aria-label="Cỡ chữ" value={activeBlock.fontSize || 16} onMouseDown={() => rememberSelection(activeBlockIndex)} onChange={(event) => applySelectedFontSize(Number(event.target.value))}><option value={12}>12</option><option value={14}>14</option><option value={16}>16</option><option value={18}>18</option><option value={20}>20</option><option value={24}>24</option><option value={28}>28</option><option value={32}>32</option><option value={36}>36</option></select><small>Kiểu chữ</small></div><div className="article-word-tool-group article-word-inline-tools"><button type="button" aria-label="Đậm" title="Đậm phần chữ đang bôi đen" onMouseDown={(event) => event.preventDefault()} onClick={() => applySelectionCommand('bold')}><Bold size={16} /></button><button type="button" aria-label="Nghiêng" title="Nghiêng phần chữ đang bôi đen" onMouseDown={(event) => event.preventDefault()} onClick={() => applySelectionCommand('italic')}><Italic size={16} /></button><button type="button" aria-label="Gạch chân" title="Gạch chân phần chữ đang bôi đen" onMouseDown={(event) => event.preventDefault()} onClick={() => applySelectionCommand('underline')}><Underline size={16} /></button><div className="article-word-color" style={{ "--article-current-color": selectedColor }} title="Chọn màu cho phần chữ được chọn"><button type="button" aria-label="Mở bảng màu chữ" onMouseDown={(event) => { event.preventDefault(); rememberSelection(activeBlockIndex); }} onClick={() => setColorPickerOpen((open) => !open)}><span>A</span></button>{<div className="article-word-color-palette" role="group" aria-label="Bảng màu chữ">{["#000000", "#3f3933", "#7f2920", "#c62828", "#e65100", "#f9a825", "#2e7d32", "#00838f", "#1565c0", "#4527a0", "#ad1457", "#ffffff"].map((color) => <button type="button" key={color} aria-label={`Màu ${color}`} title={color} style={{ backgroundColor: color }} onMouseDown={(event) => event.preventDefault()} onClick={() => applySelectedColor(color)} />)}<input aria-label="Màu chữ tùy chọn" type="color" value={selectedColor} onMouseDown={() => rememberSelection(activeBlockIndex)} onChange={(event) => applySelectedColor(event.target.value)} /></div>}</div><small>Phông chữ</small></div><div className="article-word-tool-group article-word-inline-tools"><button type="button" className={activeBlock.align === 'left' || !activeBlock.align ? 'selected' : ''} aria-label="Căn trái" onClick={() => setActiveStyle('align', 'left')}><AlignLeft size={16} /></button><button type="button" className={activeBlock.align === 'center' ? 'selected' : ''} aria-label="Căn giữa" onClick={() => setActiveStyle('align', 'center')}><AlignCenter size={16} /></button><button type="button" className={activeBlock.align === 'right' ? 'selected' : ''} aria-label="Căn phải" onClick={() => setActiveStyle('align', 'right')}><AlignRight size={16} /></button><button type="button" className={activeBlock.align === 'justify' ? 'selected' : ''} aria-label="Căn đều" onClick={() => setActiveStyle('align', 'justify')}><AlignJustify size={16} /></button><small>Đoạn văn</small></div></div>}
      {ribbonTab === 'insert' && <div className="article-word-tools article-word-insert-tools"><button type="button" onClick={() => addBlock('text')}><Plus size={16} /> Đoạn văn</button><button type="button" onClick={() => addBlock('heading')}><Plus size={16} /> Tiêu đề mục</button><button type="button" onMouseDown={(event) => { event.preventDefault(); rememberSelection(activeBlockIndex); }} onClick={() => bodyInput.current?.click()} disabled={uploading}><FileImage size={16} /> {uploading ? 'Đang tải ảnh…' : 'Ảnh trong bài'}</button><button type="button" onClick={() => coverInput.current?.click()} disabled={uploading}><ImagePlus size={16} /> Ảnh bìa</button></div>}
      {ribbonTab === 'layout' && <div className="article-word-tools article-word-layout-tools"><span><Layout size={16} /> Lề trang</span>{[['narrow', 'Hẹp'], ['normal', 'Bình thường'], ['wide', 'Rộng']].map(([value, label]) => <button type="button" key={value} className={pageMargin === value ? 'selected' : ''} onClick={() => setPageMargin(value)}>{label}</button>)}</div>}
    </nav><div className="article-manager-blocks-heading"><div><strong>Nội dung bài viết</strong><small>Chọn một đoạn rồi dùng thanh công cụ để định dạng.</small></div><div><button type="button" onClick={() => addBlock('text')}><Plus size={14} /> Đoạn văn</button><button type="button" onClick={() => addBlock('heading')}><Plus size={14} /> Tiêu đề mục</button><button type="button" onMouseDown={(event) => { event.preventDefault(); rememberSelection(activeBlockIndex); }} onClick={() => bodyInput.current?.click()} disabled={uploading}><ImagePlus size={14} /> Ảnh trong bài</button><input ref={bodyInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; uploadImage(file, (url) => insertUploadedImage(url, file)); }} /></div></div>
            {blocks.map((block, index) => <div className="article-manager-block" key={index}><div className="article-manager-block-top"><span>{block.type === 'image' ? 'HÌNH ẢNH' : block.type === 'heading' ? 'TIÊU ĐỀ MỤC' : `ĐOẠN ${index + 1}`}</span><button type="button" onClick={() => setBlocks(blocks.filter((_, blockIndex) => blockIndex !== index))} aria-label="Xóa khối nội dung"><Trash2 size={14} /></button></div>
              {block.type === 'image' ? <><img className="article-manager-inline-preview" src={block.src} alt={block.alt || ''} /><input value={block.caption || ''} onFocus={() => setActiveBlockIndex(index)} onChange={(event) => updateBlock(index, { caption: event.target.value })} placeholder="Chú thích ảnh (không bắt buộc)" /></> : <div className={block.type === 'heading' ? 'article-manager-heading-input article-word-editable' : 'article-manager-content-input article-word-editable'} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={block.type === 'heading' ? 'Tiêu đề mục' : 'Nội dung đoạn văn'} data-placeholder={block.type === 'heading' ? 'Nhập tiêu đề mục' : 'Bắt đầu viết nội dung tại đây…'} spellCheck ref={(element) => { if (element) editorElements.current[index] = element; else delete editorElements.current[index]; }} onFocus={() => { setActiveBlockIndex(index); rememberSelection(index); }} onMouseUp={() => rememberSelection(index)} onKeyUp={() => rememberSelection(index)} onInput={(event) => { editorHtml.current[index] = event.currentTarget.innerHTML; }} dangerouslySetInnerHTML={{ __html: block.html ? sanitizeRichText(block.html) : escapeRichText(block.text || '') }} style={{ textAlign: block.align || 'left', fontFamily: block.font || 'Georgia, serif', color: block.color || '#3f3933', fontWeight: block.bold ? 700 : 400, fontStyle: block.italic ? 'italic' : 'normal', textDecoration: block.underline ? 'underline' : 'none', fontSize: block.fontSize ? `${block.fontSize}px` : undefined }} />}
            </div>)}
          </section>
          <div className="article-manager-actions"><button type="button" className="article-manager-preview" onClick={() => { setPreviewContent(getCurrentContent()); setPreview((value) => !value); }}><Eye size={16} /> {preview ? 'Đóng xem trước' : 'Xem trước'}</button><span className="article-manager-action-spacer" /><button type="button" className="article-manager-save" onClick={() => save('draft')} disabled={saving || !article.title.trim()}><Save size={16} /> Lưu nháp</button><button type="button" className="article-manager-publish" onClick={() => save('published')} disabled={saving || !article.title.trim()}><Send size={16} /> {saving ? 'Đang lưu…' : 'Xuất bản'}</button></div>
          {preview && <article className="article-manager-preview-pane"><span>{article.category || 'Phật pháp'}</span><h2>{article.title || 'Tiêu đề bài viết'}</h2>{article.excerpt && <p className="article-manager-preview-excerpt">{article.excerpt}</p>}<ArticleBody content={article.content} /></article>}
        </section>
        <aside className="article-manager-list"><div className="article-manager-list-title"><div><h2>Bài viết đã tạo</h2><span>{articles.length} bài</span></div><button type="button" onClick={load}>Làm mới</button></div>{loading ? <p>Đang tải bài viết…</p> : articles.length === 0 ? <p>Chưa có bài viết. Hãy bắt đầu soạn bài đầu tiên.</p> : articles.map((item) => <article className="article-manager-item" key={item.id}><button type="button" className="article-manager-item-main" onClick={() => editArticle(item)}><span className={item.status === 'published' ? 'is-published' : ''}>{item.status === 'published' ? 'ĐÃ XUẤT BẢN' : 'BẢN NHÁP'}</span><strong>{item.title}</strong><small>{item.category} · {new Date(item.updated_at).toLocaleDateString('vi-VN')}</small></button><button type="button" className="article-manager-delete" onClick={() => remove(item)} aria-label={`Xóa ${item.title}`}><Trash2 size={15} /></button></article>)}</aside>
      </div>
    </>}
  </div>;
}
