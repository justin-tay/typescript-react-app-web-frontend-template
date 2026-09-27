import { Link } from '@opengovsg/oui'
import { APP_NAME, COPYRIGHT_HOLDER, FOOTER_LINKS } from '../config'

/** Follows the SGDS footer's neutral tone: white surface, dark links, 14px supporting text. */
export function Footer() {
  return (
    <footer className="bg-base-canvas-default">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
        <p className="text-[1.625rem] leading-8 font-semibold tracking-tight text-base-content-strong">
          {APP_NAME}
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {FOOTER_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link href={href} className="text-base-content-strong no-underline hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-base-divider-medium">
        <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-base-content-strong">
          © {new Date().getFullYear()}, {COPYRIGHT_HOLDER}
        </p>
      </div>
    </footer>
  )
}
