import { APP_NAME, LOGIN_BACKGROUND_IMAGE, LOGIN_TAGLINE } from '@/config'
import { LogoMark } from '@/shared/ui/brand-logo'

/** A neutral skyline drawn in translucent white, used when no background picture is set. */
function SkylineIllustration() {
  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-3/5 w-full"
      aria-hidden="true"
    >
      <circle cx="310" cy="64" r="44" fill="white" opacity="0.14" />
      <g fill="white" opacity="0.12">
        <rect x="8" y="120" width="44" height="120" />
        <rect x="70" y="88" width="34" height="152" />
        <rect x="150" y="104" width="46" height="136" />
        <rect x="236" y="76" width="38" height="164" />
        <rect x="318" y="112" width="50" height="128" />
      </g>
      <g fill="white" opacity="0.2">
        <rect x="30" y="150" width="40" height="90" />
        <rect x="104" y="128" width="36" height="112" />
        <rect x="196" y="140" width="34" height="100" />
        <rect x="282" y="120" width="42" height="120" />
        <rect x="360" y="156" width="40" height="84" />
      </g>
      <g fill="white" opacity="0.32">
        <rect x="0" y="184" width="60" height="56" />
        <rect x="84" y="168" width="46" height="72" />
        <rect x="170" y="176" width="52" height="64" />
        <rect x="248" y="164" width="40" height="76" />
        <rect x="318" y="180" width="82" height="60" />
      </g>
    </svg>
  )
}

/** White, so the logo mark shows on the coloured panel. */
const PANEL_LOGO_COLOURS = {
  '--logo-primary': 'white',
  '--logo-accent': 'rgb(255 255 255 / 0.75)',
} as React.CSSProperties

/**
 * The left half of the login card: the logo, the app name and a welcome over a picture. The
 * picture is `LOGIN_BACKGROUND_IMAGE` when set, otherwise a blue gradient with a simple
 * skyline.
 */
export function BrandPanel() {
  return (
    <aside
      style={
        LOGIN_BACKGROUND_IMAGE
          ? {
              ...PANEL_LOGO_COLOURS,
              backgroundImage: `linear-gradient(to bottom, rgb(0 0 0 / 0.55), transparent 70%), url(${LOGIN_BACKGROUND_IMAGE})`,
            }
          : PANEL_LOGO_COLOURS
      }
      className="relative hidden min-h-[30rem] flex-col gap-3 overflow-hidden bg-linear-to-br from-sky-500 via-blue-600 to-indigo-900 bg-cover bg-center p-10 text-white md:flex"
    >
      {!LOGIN_BACKGROUND_IMAGE && <SkylineIllustration />}
      <LogoMark size={48} className="relative" />
      <p className="relative text-3xl leading-tight font-semibold">Welcome to {APP_NAME}</p>
      <p className="relative max-w-xs text-white/90">{LOGIN_TAGLINE}</p>
    </aside>
  )
}
