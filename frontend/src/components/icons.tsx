import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const CarIcon = () => (
  <svg {...base}>
    <path d="M5 16V11l2-5h10l2 5v5" />
    <path d="M3 11h18v5H3z" />
    <circle cx="7.5" cy="13.5" r="0.5" />
    <circle cx="16.5" cy="13.5" r="0.5" />
    <path d="M5 16v2M19 16v2" />
  </svg>
);

export const FuelIcon = () => (
  <svg {...base}>
    <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M3 21h12M4 10h10" />
    <path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3" />
  </svg>
);

export const WrenchIcon = () => (
  <svg {...base}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
