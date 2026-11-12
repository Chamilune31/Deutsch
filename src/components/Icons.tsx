import type { ReactNode } from 'react';

const PATHS: Record<string, ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  cours: (
    <>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l2 2h6.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <path d="M12 10.5v5M9.5 13 12 10.5 14.5 13" />
    </>
  ),
  grammaire: (
    <>
      <path d="M4 18 8.5 6h1L14 18M5.6 14h6.8" />
      <path d="M16 11.5c.6-.7 1.4-1 2.3-1 1.4 0 2.2.8 2.2 2.2V18M20.5 14.6c-3.5 0-4.8.8-4.8 2 0 .9.7 1.5 1.8 1.5 1.6 0 3-1.1 3-3" />
    </>
  ),
  verbes: (
    <>
      <path d="M5 9h11.5l-3-3M19 15H7.5l3 3" />
    </>
  ),
  vocabulaire: (
    <>
      <rect x="4" y="7" width="12" height="13" rx="1.5" />
      <path d="M8 4h10.5A1.5 1.5 0 0 1 20 5.5V16" />
    </>
  ),
  lecture: (
    <>
      <path d="M12 7c-1.8-1.3-4.3-2-7.5-2v12.5c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2V5c-3.2 0-5.7.7-7.5 2z" />
      <path d="M12 7v12.5" />
    </>
  ),
  ecoute: (
    <>
      <path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3" />
      <rect x="4" y="14" width="4" height="6" rx="1.5" />
      <rect x="16" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  ecriture: (
    <>
      <path d="m14.5 5.5 4 4L9 19H5v-4z" />
      <path d="m12.5 7.5 4 4" />
    </>
  ),
  oral: (
    <>
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
    </>
  ),
  revision: (
    <>
      <path d="M19 12a7 7 0 1 1-2.05-4.95" />
      <path d="M19.5 4.5V8h-3.5" />
    </>
  ),
  progres: <path d="M4 19h16M7 16v-4M11 16V8M15 16v-6M19 16V5" />,
  apprendre: (
    <>
      <path d="m12 4 8.5 4.5L12 13 3.5 8.5z" />
      <path d="M7 10.8V15c1.3 1.3 3 2 5 2s3.7-.7 5-2v-4.2" />
    </>
  ),
  pratiquer: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z" fill="currentColor" stroke="none" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  upload: <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19h14" />,
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      {PATHS[name]}
    </svg>
  );
}
