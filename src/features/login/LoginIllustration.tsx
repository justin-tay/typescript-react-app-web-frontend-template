import type { CSSProperties } from 'react'

/** A pale tint of the brand accent, so the illustration follows `--logo-accent` in `index.css`. */
const TINT = {
  '--login-tint': 'color-mix(in srgb, var(--logo-accent) 45%, white)',
} as CSSProperties

/** A login window with a shield, padlock and key, drawn in outline; decorative only. */
export function LoginIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 394 293"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={TINT}
      aria-hidden="true"
    >
      <ellipse cx="197" cy="270" rx="150" ry="9" fill="#E9EAEE" />
      <rect x="62" y="34" width="230" height="200" rx="8" fill="#fff" stroke="#000" strokeWidth={1.021} />
      <path
        d="M62 42a8 8 0 0 1 8-8h214a8 8 0 0 1 8 8v14H62V42Z"
        fill="var(--login-tint)"
        stroke="#000"
        strokeWidth={1.021}
      />
      <circle cx="76" cy="45" r="3" fill="#fff" stroke="#000" strokeWidth={1.021} />
      <circle cx="87" cy="45" r="3" fill="#fff" stroke="#000" strokeWidth={1.021} />
      <circle cx="98" cy="45" r="3" fill="#fff" stroke="#000" strokeWidth={1.021} />
      <circle cx="177" cy="92" r="19" fill="#E9EAEE" stroke="#000" strokeWidth={1.021} />
      <circle cx="177" cy="87" r="7" fill="#F5B896" stroke="#000" strokeWidth={1.021} />
      <path d="M164 104a13 10 0 0 1 26 0" fill="var(--logo-primary)" stroke="#000" strokeWidth={1.021} />
      <rect x="96" y="124" width="162" height="22" rx="5" fill="#fff" stroke="#000" strokeWidth={1.021} />
      <circle cx="108" cy="135" r="3.5" fill="#BABECB" />
      <rect x="117" y="132.5" width="52" height="5" rx="2.5" fill="#BFC2C8" />
      <rect x="96" y="154" width="162" height="22" rx="5" fill="#fff" stroke="#000" strokeWidth={1.021} />
      <circle cx="108" cy="165" r="3.5" fill="#BABECB" />
      <g fill="#000">
        <circle cx="120" cy="165" r="2" />
        <circle cx="129" cy="165" r="2" />
        <circle cx="138" cy="165" r="2" />
        <circle cx="147" cy="165" r="2" />
        <circle cx="156" cy="165" r="2" />
        <circle cx="165" cy="165" r="2" />
      </g>
      <rect
        x="96"
        y="188"
        width="162"
        height="24"
        rx="12"
        fill="var(--logo-primary)"
        stroke="#000"
        strokeWidth={1.021}
      />
      <rect x="150" y="197.5" width="54" height="5" rx="2.5" fill="#fff" />
      <path
        d="M44 52l28 10v28c0 19-12 31-28 37-16-6-28-18-28-37V62l28-10Z"
        fill="var(--login-tint)"
        stroke="#000"
        strokeWidth={1.021}
        strokeLinejoin="round"
      />
      <path d="M31.5 90l9 9 15-17" stroke="#000" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M289 176v-22a24 24 0 0 1 48 0v22" stroke="#000" strokeWidth={1.021} fill="none" />
      <rect x="274" y="172" width="78" height="66" rx="9" fill="#F5B896" stroke="#000" strokeWidth={1.021} />
      <path
        d="M313 193a9 9 0 0 1 4.6 16.7l3.4 14.3h-16l3.4-14.3A9 9 0 0 1 313 193Z"
        fill="var(--logo-primary)"
        stroke="#000"
        strokeWidth={1.021}
        strokeLinejoin="round"
      />
      <g transform="translate(20 226) rotate(-20)">
        <circle cx="14" cy="14" r="11" fill="#F5B896" stroke="#000" strokeWidth={1.021} />
        <circle cx="14" cy="14" r="4" fill="#fff" stroke="#000" strokeWidth={1.021} />
        <path d="M25 14h38v8h-6v-4h-5v4h-6v-4H25Z" fill="#F5B896" stroke="#000" strokeWidth={1.021} />
      </g>
      <path
        d="m344 60 2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4L344 60ZM32 150l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8L32 150Z"
        fill="#000"
      />
      <path d="m330 118 1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4 1.4-3.2Z" fill="#BFC2C8" />
    </svg>
  )
}
