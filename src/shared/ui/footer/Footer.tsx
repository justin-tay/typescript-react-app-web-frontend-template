import { BrandLogo } from '@/shared/ui/brand-logo'
import { FooterLink, type FooterLinkData } from './FooterLink'

export interface FooterProps {
  appName: string
  links: FooterLinkData[]
  copyrightHolder: string
}

/** Follows the SGDS footer's neutral tone: white surface, dark links, 14px supporting text. */
export function Footer({ appName, links, copyrightHolder }: FooterProps) {
  return (
    <footer className="bg-base-canvas-default">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
        <BrandLogo name={appName} size="lg" className="text-base-content-strong" />
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.label}>
                <FooterLink {...link} className="text-base-content-strong no-underline hover:underline" />
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-base-divider-medium">
        <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-base-content-strong">
          © {new Date().getFullYear()}, {copyrightHolder}
        </p>
      </div>
    </footer>
  )
}
