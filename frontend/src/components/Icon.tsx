import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };

  switch (name) {
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "arrow-left":
      return <svg {...common}><path d="M19 12H5m6 6-6-6 6-6" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "check-circle":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.7 2.8L16.5 9" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "x":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "chevron-down":
      return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
    case "save":
      return <svg {...common}><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></svg>;
    case "download":
      return <svg {...common}><path d="M12 3v12m-4-4 4 4 4-4M5 20h14" /></svg>;
    case "edit":
      return <svg {...common}><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></svg>;
    case "alert":
      return <svg {...common}><path d="M12 3 2.7 20h18.6L12 3Z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case "spark":
      return <svg {...common}><path d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></svg>;
    case "heart":
      return <svg {...common}><path d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.1a5 5 0 0 0 0-7.1Z" /></svg>;
    case "dumbbell":
      return <svg {...common}><path d="M2 12h1M21 12h1M9 12h6" /><path d="M6 8H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" /><rect x="6" y="6" width="3" height="12" rx="1" /><rect x="15" y="6" width="3" height="12" rx="1" /></svg>;
    case "pulse":
      return <svg {...common}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>;
    case "flag":
      return <svg {...common}><path d="M5 21V4m0 1h11l-2 4 2 4H5" /></svg>;
    case "mobility":
      return <svg {...common}><circle cx="16" cy="5" r="1" /><path d="M5 20l5-.5 1-2" /><path d="M18 20v-5h-5.5l2.5-6.5-5.5 1 1.5 2" /></svg>;
    case "refresh":
      return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 8a7 7 0 0 1 11.7-1L20 9M4 15l2.2 2a7 7 0 0 0 11.7-1" /></svg>;
    case "scale":
      return <svg {...common}><path d="M7 20h10M12 3v17M6 6l6-1 6 1" /><path d="M9 12 6 6l-3 6a3 3 0 0 0 6 0ZM21 12l-3-6-3 6a3 3 0 0 0 6 0Z" /></svg>;
    case "run":
      return <svg {...common}><circle cx="13" cy="4" r="1" /><path d="M4 17l5 1 .75-1.5" /><path d="M15 21v-4l-4-3 1-6" /><path d="M7 12V9l5-1 3 3 3 1" /></svg>;
    case "mountain":
      return <svg {...common}><path d="M3 20h18L14.08 5.39a2.3 2.3 0 0 0-4.16 0L3 20Z" /><path d="M7.5 11l2 2.5 2.5-2.5 2 3 2.5-2" /></svg>;
    case "bike":
      return <svg {...common}><circle cx="5" cy="18" r="3" /><circle cx="19" cy="18" r="3" /><circle cx="17" cy="5" r="1" /><path d="M12 19v-4l-3-3 5-4 2 3h3" /></svg>;
    case "swim":
      return <svg {...common}><circle cx="16" cy="9" r="1" /><path d="M6 11l4-2 3.5 3-1.5 2" /><path d="M3 16.75a2.4 2.4 0 0 0 1 .25 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 1-.25" /></svg>;
    case "triathlon":
      return <svg {...common}><circle cx="12" cy="6" r="3" /><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M10.5 8.6 7.5 14.2M13.5 8.6l3 5.6M9 17h6" /></svg>;
    case "steps":
      return <svg {...common}><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" /><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" /><path d="M16 17h4M4 13h4" /></svg>;
    case "home":
      return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
    case "building":
      return <svg {...common}><path d="M4 21V5h10v16M14 9h6v12M8 9h2m-2 4h2m-2 4h2m9-4h-2m2 4h-2M2 21h20" /></svg>;
    case "sun":
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="7" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>;
    case "bolt":
      return <svg {...common}><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 5 6v5c0 4.8 2.8 8.3 7 10 4.2-1.7 7-5.2 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
    case "leaf":
      return <svg {...common}><path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16Z" /><path d="M4 21c3-6 7-9 13-12" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}
