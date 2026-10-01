import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The layering rule "a feature never imports another feature" (ADR 0002) is enforced by an override
// per feature in .oxlintrc.json that names its siblings. A feature without one, or one that does
// not name every sibling, is unchecked, so a new feature fails here until the lint config is updated.
describe('feature import boundaries', () => {
  const features = readdirSync('src/features', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  const overrides: { files: string[]; rules: unknown }[] = JSON.parse(readFileSync('.oxlintrc.json', 'utf-8')).overrides

  it.each(features)('%s has a lint override that names every other feature', (feature) => {
    const override = overrides.find((o) => o.files.includes(`src/features/${feature}/**`))
    expect(override, `no override for src/features/${feature}/** in .oxlintrc.json`).toBeDefined()
    const rules = JSON.stringify(override?.rules)
    for (const other of features.filter((name) => name !== feature)) {
      expect(rules).toContain(`../${other}/*`)
    }
  })
})
