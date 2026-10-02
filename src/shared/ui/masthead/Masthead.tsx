import { useId, useState } from 'react'
import { Building, Chevron, Crest, ExternalLinkArrow, InlineLock, Lock } from './MastheadIcons'

export interface MastheadProps {
  /** Lets the content stretch the full width of the screen instead of stopping at 1440px. */
  fluid?: boolean
  /** Starts with the "How to identify" panel open. */
  defaultExpanded?: boolean
  /**
   * The environment of the application. When given, the banner adds a note: `[NOTE: THIS IS A STAGING WEBSITE]`.
   * Leave it out in production.
   */
  environment?: 'production' | 'staging' | 'uat' | 'preview' | (string & {})
  /**
   * Classes added to the outer parts. Only these two can be changed; the rest of the layout and styling is
   * fixed so the banner looks the same in every application. They are appended, not merged, so to replace a
   * value use a Tailwind important modifier (`!`).
   * - `banner`: the full-width wrapper (background, border).
   * - `mainContentContainer`: the bar holding the crest, the text and the button (width, padding).
   */
  classNames?: { banner?: string; mainContentContainer?: string }
}

const join = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ')

/**
 * The Singapore Government banner every .gov.sg service shows at the top of each page, with its
 * "How to identify an official website" panel. A React port of the SGDS `sgds-masthead` web component
 * (its markup, wording, icons, colours and spacing), in its light colour scheme.
 *
 * Differences from SGDS, none of them visible: the toggle is a real `<button>` with `aria-expanded`, and
 * the closed panel is `inert` so its link cannot be tabbed to while hidden.
 */
export function Masthead({ fluid = false, defaultExpanded = false, environment, classNames }: MastheadProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const panelId = useId()
  const container = join('mx-auto w-full px-5 lg:px-8', !fluid && 'max-w-[1440px]')

  return (
    <section
      aria-label="Singapore Government official website banner"
      className={join('bg-[#f7f7f7] font-sans text-sm leading-5 [color-scheme:only_light]', classNames?.banner)}
    >
      <div className={join(container, 'py-1', classNames?.mainContentContainer)}>
        <div className="flex gap-1">
          <Crest className="shrink-0 text-[#db0000]" />
          <div className="flex flex-wrap items-center gap-x-3">
            <span>A Singapore Government Agency Website</span>
            {environment ? (
              <b className="font-[bolder]">[NOTE: THIS IS A {environment.toUpperCase()} WEBSITE]</b>
            ) : null}
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="flex cursor-pointer items-center gap-1 text-[#0269d0] outline-[#60aaf4] hover:text-[#0151a0] focus-visible:outline-4"
            >
              <span>How to identify</span>
              <Chevron
                className={join(
                  'block self-center transition-transform duration-300 ease-in-out select-none motion-reduce:transition-none',
                  !isExpanded && 'rotate-180',
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#f7f7f7]">
        <div
          id={panelId}
          inert={!isExpanded}
          className={join(
            container,
            'grid overflow-hidden transition-[grid-template-rows,opacity,padding] duration-300 ease-[cubic-bezier(0.25,0,0.25,1)] motion-reduce:transition-none',
            isExpanded ? 'grid-rows-[1fr] py-4 opacity-100' : 'grid-rows-[0fr] py-0 opacity-0',
          )}
        >
          <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] md:gap-6">
            <div className="flex gap-2">
              <div className="-mt-[0.1em]">
                <Building className="inline text-[#1a1a1a]" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="font-semibold">Official website links end with .gov.sg</div>
                <article className="text-[#525252]">
                  Government agencies communicate via .gov.sg websites (e.g. go.gov.sg/open).
                </article>
                <a
                  href="https://www.gov.sg/trusted-sites#govsites"
                  rel="noreferrer"
                  target="_blank"
                  className="w-fit text-[#0269d0] no-underline outline-[#60aaf4] hover:text-[#0151a0] focus-visible:outline-4"
                >
                  Trusted websites
                  <ExternalLinkArrow className="inline-block align-top" />
                </a>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="-mt-[0.1em]">
                <Lock className="inline text-[#1a1a1a]" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="font-semibold">Secure websites use HTTPS</div>
                <article className="text-[#525252]">
                  Look for a lock (<InlineLock className="inline-block text-[#1a1a1a]" />) or https:// as an added
                  precaution. Share sensitive information only on official, secure websites.
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
