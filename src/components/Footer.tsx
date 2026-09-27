import { Link } from '@opengovsg/oui'
import { APP_NAME, FOOTER_LINKS } from '../config'

export function Footer() {
  return (
    <footer className="border-t border-base-divider-subtle">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div>
          <p className="text-lg font-semibold">{APP_NAME}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {FOOTER_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <hr className="border-base-divider-subtle" />
        <p className="text-sm text-base-content-medium">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </footer>
  )
}
