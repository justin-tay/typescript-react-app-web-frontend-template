import { LogoMark } from './LogoMark'

export interface BrandLogoProps {
  /** The app name, written as text to the right of the mark. */
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { mark: 24, text: 'text-base' },
  md: { mark: 32, text: 'text-lg' },
  lg: { mark: 44, text: 'text-2xl' },
} as const

/**
 * The logo mark with the app name to its right. The name is real text in the page font,
 * not part of the drawing, so it follows the app's configured name and stays readable.
 */
export function BrandLogo({ name, size = 'md', className }: BrandLogoProps) {
  const { mark, text } = SIZES[size]
  return (
    <span className={['inline-flex min-w-0 items-center gap-2', className].filter(Boolean).join(' ')}>
      <LogoMark size={mark} className="shrink-0" />
      <span className={`truncate font-semibold tracking-tight ${text}`}>{name}</span>
    </span>
  )
}
