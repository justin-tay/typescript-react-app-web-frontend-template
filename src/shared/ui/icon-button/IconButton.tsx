import { Button, Tooltip, TooltipTrigger, type ButtonProps } from '@opengovsg/oui'
import type { LucideIcon } from 'lucide-react'

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'isIconOnly' | 'aria-label'> {
  icon: LucideIcon
  /** The accessible name, also shown as a tooltip on hover and focus. */
  label: string
}

/** An icon-only button. It always carries a label, because an icon alone is not a name. */
export function IconButton({ icon: Icon, label, variant = 'clear', ...props }: IconButtonProps) {
  return (
    <TooltipTrigger>
      <Button variant={variant} isIconOnly aria-label={label} {...props}>
        <Icon aria-hidden className="size-4" />
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  )
}
