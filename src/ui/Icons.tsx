import { ComponentChildren, h } from 'preact';

export function Icon({
  name,
  size = 16,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const s = size;
  let path: ComponentChildren = null;

  switch (name) {
    case 'logo':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 32 32"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="32" height="32" rx="8" fill="#1b1b1d" />
          <g fill="#e5e3dd">
            <circle cx="9.5" cy="9.5" r="2.6" />
            <circle cx="16" cy="9.5" r="2.6" />
            <circle cx="9.5" cy="16" r="2.6" />
            <circle cx="16" cy="16" r="2.6" />
            <circle cx="22.5" cy="16" r="2.6" />
            <circle cx="9.5" cy="22.5" r="2.6" />
            <circle cx="16" cy="22.5" r="2.6" />
            <circle cx="22.5" cy="22.5" r="2.6" />
          </g>
          <circle cx="22.5" cy="9.5" r="2.6" fill="#ff6a2b" />
        </svg>
      );
    case 'select':
      path = <path d="m3 3 7 18 3-7 7-3L3 3Z" />;
      break;
    case 'pan':
      path = (
        <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v8M10 10.5V6a2 2 0 0 0-4 0v8M6 14.5v-1a2 2 0 0 0-4 0v5a7 7 0 0 0 7 7h5a7 7 0 0 0 7-7v-6a2 2 0 0 0-4 0v3" />
      );
      break;
    case 'connect':
      path = (
        <>
          <circle cx="5" cy="19" r="3" />
          <path d="M8 19h4a4 4 0 0 0 4-4V9a4 4 0 0 1 4-4h1" />
          <circle cx="19" cy="5" r="3" />
        </>
      );
      break;
    case 'monitor':
      path = (
        <>
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </>
      );
      break;
    case 'text':
      path = (
        <>
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" x2="15" y1="20" y2="20" />
          <line x1="12" x2="12" y1="4" y2="20" />
        </>
      );
      break;
    case 'sticky':
      path = (
        <>
          <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
          <path d="M15 3v6h6" />
        </>
      );
      break;
    case 'shapes':
      path = (
        <>
          <circle cx="7" cy="7" r="4" />
          <rect width="8" height="8" x="13" y="13" rx="1" />
          <path d="m14 4 5 7H9l5-7Z" />
        </>
      );
      break;
    case 'frame':
      path = (
        <>
          <line x1="22" x2="2" y1="6" y2="6" />
          <line x1="22" x2="2" y1="18" y2="18" />
          <line x1="6" x2="6" y1="2" y2="22" />
          <line x1="18" x2="18" y1="2" y2="22" />
        </>
      );
      break;
    case 'image':
      path = (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </>
      );
      break;
    case 'undo':
      path = (
        <>
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </>
      );
      break;
    case 'redo':
      path = (
        <>
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </>
      );
      break;
    case 'zoomIn':
      path = (
        <>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" x2="16.65" y1="21" y2="16.65" />
          <line x1="11" x2="11" y1="8" y2="14" />
          <line x1="8" x2="14" y1="11" y2="11" />
        </>
      );
      break;
    case 'zoomOut':
      path = (
        <>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" x2="16.65" y1="21" y2="16.65" />
          <line x1="8" x2="14" y1="11" y2="11" />
        </>
      );
      break;
    case 'zoomFit':
      path = (
        <>
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </>
      );
      break;
    case 'trash':
      path = (
        <>
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </>
      );
      break;
    case 'copy':
      path = (
        <>
          <rect width="13" height="13" x="9" y="9" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      );
      break;
    case 'download':
      path = (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </>
      );
      break;
    case 'upload':
      path = (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </>
      );
      break;
    case 'close':
      path = (
        <>
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </>
      );
      break;
    case 'search':
      path = (
        <>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" x2="16.65" y1="21" y2="16.65" />
        </>
      );
      break;
    case 'plus':
      path = (
        <>
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </>
      );
      break;
    case 'check':
      path = <polyline points="20 6 9 17 4 12" />;
      break;
    case 'grid':
      path = (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <line x1="3" x2="21" y1="9" y2="9" />
          <line x1="3" x2="21" y1="15" y2="15" />
          <line x1="9" x2="9" y1="3" y2="21" />
          <line x1="15" x2="15" y1="3" y2="21" />
        </>
      );
      break;
    case 'tool':
      path = (
        <>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </>
      );
      break;
    case 'sliders':
      path = (
        <>
          <line x1="4" x2="20" y1="21" y2="21" />
          <line x1="4" x2="20" y1="14" y2="14" />
          <line x1="4" x2="20" y1="7" y2="7" />
          <circle cx="8" cy="7" r="2" />
          <circle cx="16" cy="14" r="2" />
          <circle cx="12" cy="21" r="2" />
        </>
      );
      break;
    case 'sparkles':
      path = (
        <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
      );
      break;
    default:
      path = <circle cx="12" cy="12" r="10" />;
  }

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  );
}

