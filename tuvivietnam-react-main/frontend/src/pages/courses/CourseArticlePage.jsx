import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArticleBody from '../../shared/ui/ArticleBody';
import '../articles/PhatPhapPage.css';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

export default function CourseArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/articles?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Không tải được bài viết.');
        setArticle(result.data);
        setState('ready');
      })
      .catch((error) => { if (error.name !== 'AbortError') setState('error'); });
    return () => controller.abort();
  }, [slug]);

  return <main className="dharma-page course-article-page">
    <Link className="dharma-back" to="/khoa-hoc">← Quay lại khóa học</Link>
    {state === 'loading' && <p className="dharma-state">Đang tải bài viết…</p>}
    {state === 'error' && <p className="dharma-state">Không tìm thấy bài viết khóa học.</p>}
    {state === 'ready' && article && <article className="dharma-article">
      {article.cover_image && <img className="dharma-cover" src={article.cover_image} alt="" />}
      <span className="dharma-category">{article.category}</span>
      <h1>{article.title}</h1>
      <div className="dharma-meta">{article.author} · {formatDate(article.published_at)}</div>
      {article.excerpt && <p className="dharma-excerpt">{article.excerpt}</p>}
      <ArticleBody content={article.content} />
    </article>}
  </main>;
}
