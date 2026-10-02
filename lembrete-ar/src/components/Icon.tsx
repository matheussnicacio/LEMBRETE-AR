const PATHS: Record<string, React.ReactNode> = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  inbox: <><path d="M4 13l2-7h12l2 7v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M4 13h5a3 3 0 0 0 6 0h5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 5a3.5 3.5 0 0 1 0 7M18 14.5c2.2.6 3.5 2.6 3.5 5.5" /></>,
  pencil: <path d="M4 20l1-4L16 5l3 3L8 19z" />,
  bellOff: <><path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5z" /><path d="M10 20a2 2 0 0 0 4 0M3 3l18 18" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
};
export type IconName = keyof typeof PATHS;

export default function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function IconCircle({ name, color, size = 36 }: { name: IconName; color: string; size?: number }) {
  return (
    <span className="ico" style={{ background: color, width: size, height: size, padding: size * 0.24 }}>
      <Icon name={name} />
    </span>
  );
}
