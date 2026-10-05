import { Link } from '@opengovsg/oui'
import { reportUrl, type ReportFormat, type Task } from './api'

const FORMATS: { id: ReportFormat; label: string }[] = [
  { id: 'pdf', label: 'PDF' },
  { id: 'xlsx', label: 'Excel' },
  { id: 'csv', label: 'CSV' },
]

/**
 * The report in each format. A completed task's PDF is the stored report; everything else is generated when it
 * is asked for and, while the task is open, is a draft built from the data as it is now. Plain links: the
 * server answers with an attachment, and every download is recorded in the audit trail.
 */
export function ReportDownloads({ task }: { task: Task }) {
  const isDraft = task.status !== 'completed'
  return (
    <nav aria-label="Report downloads" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="text-sm text-base-content-medium">{isDraft ? 'Draft report:' : 'Report:'}</span>
      {FORMATS.map(({ id, label }) => (
        <Link key={id} href={reportUrl(task.id, id)} download className="touch-target">
          {isDraft ? `${label} (draft)` : label}
        </Link>
      ))}
    </nav>
  )
}
