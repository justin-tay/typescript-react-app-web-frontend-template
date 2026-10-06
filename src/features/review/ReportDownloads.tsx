import { Button, Menu, MenuItem, MenuTrigger } from '@opengovsg/oui'
import { ChevronDown, Download, FileSpreadsheet, FileText, Table } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { reportUrl, type ReportFormat, type Task } from './api'
import { MENU_EDGE_PADDING } from '@/shared/ui/menu-edge-padding'

const FORMATS: { id: ReportFormat; label: string; detail: string; icon: LucideIcon }[] = [
  { id: 'pdf', label: 'PDF', detail: 'The full report, to read or file', icon: FileText },
  { id: 'xlsx', label: 'Excel', detail: 'The full report as a spreadsheet', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', detail: 'Active accounts only', icon: Table },
]

/**
 * One Download report button that opens the formats, each with an icon and what it holds. A completed task's PDF is
 * the stored report; everything else is generated when it is asked for and, while the task is open, is a draft built
 * from the data as it is now. The items are plain links: the server answers with an attachment, and every download is
 * recorded in the audit trail.
 */
export function ReportDownloads({ task }: { task: Task }) {
  const isDraft = task.status !== 'completed'
  return (
    <MenuTrigger>
      <Button variant="outline">
        <Download size={16} aria-hidden="true" />
        {isDraft ? 'Download draft report' : 'Download report'}
        <ChevronDown size={16} aria-hidden="true" />
      </Button>
      <Menu
        aria-label="Report formats"
        classNames={{ popover: 'min-w-64' }}
        containerPadding={MENU_EDGE_PADDING}
        className="outline-none"
      >
        {FORMATS.map(({ id, label, detail, icon: Icon }) => (
          <MenuItem key={id} id={id} href={reportUrl(task.id, id)} download textValue={label}>
            <span className="flex items-center gap-3">
              <Icon size={18} aria-hidden="true" className="shrink-0 text-base-content-medium" />
              <span className="flex flex-col">
                <span className="font-medium">{label}</span>
                <span className="text-sm text-base-content-medium">{detail}</span>
              </span>
            </span>
          </MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  )
}
