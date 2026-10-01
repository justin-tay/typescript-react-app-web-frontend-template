import { Button, Infobox, Spinner, TextField, Toggle } from '@opengovsg/oui'
import { useState } from 'react'
import { getSettings, updateSettings, type Settings } from './api'
import { validateSettings, type SettingsDraft } from './validate'
import { ApiError } from '@/shared/lib/api-errors'
import { useMutation } from '@/shared/lib/use-mutation'
import { useResource } from '@/shared/lib/use-resource'
import { Card } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'

const toDraft = ({ inactivity, review }: Settings): SettingsDraft => ({
  inactivityEnabled: inactivity.enabled,
  suspendAfterDays: String(inactivity.suspendAfterDays),
  removeAfterDays: String(inactivity.removeAfterDays),
  reviewEnabled: review.enabled,
  intervalMonths: String(review.intervalMonths),
})

const toSettings = (draft: SettingsDraft): Settings => ({
  inactivity: {
    enabled: draft.inactivityEnabled,
    suspendAfterDays: Number(draft.suspendAfterDays),
    removeAfterDays: Number(draft.removeAfterDays),
  },
  review: { enabled: draft.reviewEnabled, intervalMonths: Number(draft.intervalMonths) },
})

/** How inactive accounts are handled and how often accounts are reviewed. */
export function SettingsPage() {
  const load = useResource(getSettings, [])
  const [draft, setDraft] = useState<SettingsDraft | null>(null)
  const [saved, setSaved] = useState(false)
  const save = useMutation(updateSettings)

  // The form starts from what was loaded; after that the person's edits are the draft.
  if (load.status === 'loaded' && draft === null) setDraft(toDraft(load.data))

  if (load.status === 'loading') return <Spinner aria-label="Loading" />
  if (load.status === 'error') {
    const isForbidden = load.error instanceof ApiError && load.error.status === 403
    return <Infobox variant={isForbidden ? 'warning' : 'error'}>{load.error.message}</Infobox>
  }
  if (!draft) return null

  const errors = validateSettings(draft)
  const showErrors = (name: keyof typeof errors) => errors[name]
  const change = (patch: Partial<SettingsDraft>) => {
    setSaved(false)
    setDraft({ ...draft, ...patch })
  }

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" subtitle="How inactive accounts are handled and how often accounts are reviewed." />
      <form
        className="flex flex-col gap-6"
        onSubmit={async (e) => {
          e.preventDefault()
          if (Object.keys(errors).length > 0) return
          const result = await save.run(toSettings(draft))
          if (result.ok) {
            setDraft(toDraft(result.value))
            setSaved(true)
          }
        }}
      >
        {save.error && <Infobox variant="error">{save.error.message}</Infobox>}
        {saved && <Infobox variant="success">Settings saved.</Infobox>}
        <Card title="Inactive accounts">
          <div className="flex flex-col gap-4">
            <Toggle isSelected={draft.inactivityEnabled} onChange={(value) => change({ inactivityEnabled: value })}>
              Suspend and remove accounts that are not used
            </Toggle>
            <TextField
              label="Suspend after (days)"
              description="Days since an account was last in use."
              inputMode="numeric"
              value={draft.suspendAfterDays}
              onChange={(value) => change({ suspendAfterDays: value })}
              isInvalid={Boolean(showErrors('suspendAfterDays'))}
              errorMessage={showErrors('suspendAfterDays')}
            />
            <TextField
              label="Remove after (days)"
              description="Days since an account was last in use. Removal is permanent."
              inputMode="numeric"
              value={draft.removeAfterDays}
              onChange={(value) => change({ removeAfterDays: value })}
              isInvalid={Boolean(showErrors('removeAfterDays'))}
              errorMessage={showErrors('removeAfterDays')}
            />
          </div>
        </Card>
        <Card title="Account review">
          <div className="flex flex-col gap-4">
            <Toggle isSelected={draft.reviewEnabled} onChange={(value) => change({ reviewEnabled: value })}>
              Create a review at the start of each period
            </Toggle>
            <TextField
              label="Review period (months)"
              description="An open review keeps its dates; a new value applies from the next period."
              inputMode="numeric"
              value={draft.intervalMonths}
              onChange={(value) => change({ intervalMonths: value })}
              isInvalid={Boolean(showErrors('intervalMonths'))}
              errorMessage={showErrors('intervalMonths')}
            />
          </div>
        </Card>
        <div>
          <Button type="submit" isDisabled={save.isSubmitting || Object.keys(errors).length > 0}>
            Save settings
          </Button>
        </div>
      </form>
    </section>
  )
}
