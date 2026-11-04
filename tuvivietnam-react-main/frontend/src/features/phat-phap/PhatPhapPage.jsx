import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './PhatPhapPage.css';
import ArticleBody from '../../shared/ui/ArticleBody';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

export default function PhatPhapPage() {
  const { slug } = useParams();
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setArticle(null);
    const url = slug ? `/api/articles?slug=${encodeURIComponent(slug)}` : '/api/articles?category=Phật pháp';
    fetch(url, { signal: controller.signal }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được bài viết.');
      if (slug) setArticle(result.data); else setArticles(result.data || []);
    }).catch((fetchError) => { if (fetchError.name !== 'AbortError') setError(fetchError.message || 'Không tải được bài viết.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);

  if (slug) return <main className="dharma-page"><Link className="dharma-back" to="/phat-phap">← Chuyên mục Phật pháp</Link>{loading ? <p className="dharma-state">Đang tải bài viết…</p> : error ? <p className="dharma-state">{error}</p> : article && <article className="dharma-article">{article.cover_image && <img className="dharma-cover" src={article.cover_image} alt="" />}<span className="dharma-category">{article.category}</span><h1>{article.title}</h1><div className="dharma-meta">{article.author} · {formatDate(article.published_at)}</div>{article.excerpt && <p className="dharma-excerpt">{article.excerpt}</p>}<ArticleBody content={article.content} /></article>}</main>;

  return <main className="dharma-page"><header className="dharma-heading"><span>GÓC CHIÊM NGHIỆM</span><h1>Phật pháp</h1><p>Chia sẻ giáo lý, thực hành tỉnh thức và nuôi dưỡng đời sống an lành.</p></header>{loading ? <p className="dharma-state">Đang tải bài viết…</p> : error ? <p className="dharma-state">{error}</p> : articles.length === 0 ? <p className="dharma-state">Chuyên mục đang được cập nhật bài viết.</p> : <div className="dharma-grid">{articles.map((item) => <Link className="dharma-card" to={`/phat-phap/${item.slug}`} key={item.id}>{item.cover_image ? <img src={item.cover_image} alt="" /> : <div className="dharma-card-placeholder">☸</div>}<div className="dharma-card-copy"><span>{item.category} · {formatDate(item.published_at)}</span><h2>{item.title}</h2><p>{item.excerpt}</p><b>Đọc bài viết →</b></div></Link>)}</div>}</main>;
}
