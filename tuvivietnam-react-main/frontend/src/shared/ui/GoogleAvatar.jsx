import React, { useEffect, useState } from 'react';

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('vi-VN')
    : (parts[0]?.slice(0, 2) || '?').toLocaleUpperCase('vi-VN');
}

export default function GoogleAvatar({ src, name, className, fallbackClassName }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={fallbackClassName} role="img" aria-label={name || 'Ảnh đại diện'}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Ảnh đại diện Google'}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
