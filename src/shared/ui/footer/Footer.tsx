import { FooterLink, type FooterLinkData } from './FooterLink'

export interface FooterProps {
  links: FooterLinkData[]
  copyrightHolder: string
}

/**
 * A slim strip along the bottom of a page: the links on the left, the copyright on the right.
 * A simplified take on the SGDS footer, with a flat `links` list rather than grouped columns.
 */
export function Footer({ links, copyrightHolder }: FooterProps) {
  return (
    <footer className="border-t border-base-divider-medium px-6 py-4 sm:px-12">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 text-sm text-base-content-medium">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((link) => (
              <li key={link.label}>
                <FooterLink {...link} className="text-base-content-medium" />
              </li>
            ))}
          </ul>
        </nav>
        <p>
          © {new Date().getFullYear()}, {copyrightHolder}
        </p>
      </div>
    </footer>
  )
}
