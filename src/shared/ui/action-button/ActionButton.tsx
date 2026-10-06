import { Button, Tooltip, TooltipTrigger, type ButtonProps } from '@opengovsg/oui'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface ActionButtonProps extends Omit<ButtonProps, 'children' | 'isIconOnly' | 'aria-label'> {
  icon: LucideIcon
  /** The visible word beside the icon, for example `Edit`. Leave it out for an icon-only button, such as a "…" menu. */
  children?: ReactNode
  /** The accessible name, for when the word alone does not say what it acts on, as in `Edit ada`. It starts with the visible word. */
  label: string
  /** Shown on hover and focus. An icon-only button always shows its `label`; a button with a word shows it only when this is given, for a reason the word has no room for, such as why it is disabled. */
  tooltip?: string
}

/** An outlined button with an icon and, usually, its word beside it, for the actions of a table row. */
export function ActionButton({
  icon: Icon,
  children,
  label,
  tooltip,
  variant = 'outline',
  size = 'sm',
  ...props
}: ActionButtonProps) {
  const isIconOnly = children === undefined
  const button = (
    <Button variant={variant} size={size} isIconOnly={isIconOnly} aria-label={label} {...props}>
      <Icon aria-hidden className="size-4" />
      {children}
    </Button>
  )
  const shownTip = tooltip ?? (isIconOnly ? label : undefined)
  if (shownTip === undefined) return button
  return (
    <TooltipTrigger>
      {button}
      <Tooltip>{shownTip}</Tooltip>
    </TooltipTrigger>
  )
}
