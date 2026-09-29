import { Link } from 'react-router'
import { PageHeader } from '@/shared/ui/page-header'

export function NotFound() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Page not found" subtitle="The page you asked for does not exist." />
      <Link to="/" className="text-base-content-brand underline">
        Back to my dashboard
      </Link>
    </div>
  )
}
