import { Button, Infobox, Spinner, TextField, Toggle } from '@opengovsg/oui'
import { useState } from 'react'
import { getSettings, updateSettings, type Settings } from './api'
import { validateSettings, type SettingsDraft } from './validate'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasPermission } from '@/shared/session/user'
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
  privilegedIntervalMonths: String(review.privilegedIntervalMonths),
  nonPrivilegedIntervalMonths: String(review.nonPrivilegedIntervalMonths),
})

const toSettings = (draft: SettingsDraft): Settings => ({
  inactivity: {
    enabled: draft.inactivityEnabled,
    suspendAfterDays: Number(draft.suspendAfterDays),
    removeAfterDays: Number(draft.removeAfterDays),
  },
  review: {
    enabled: draft.reviewEnabled,
    privilegedIntervalMonths: Number(draft.privilegedIntervalMonths),
    nonPrivilegedIntervalMonths: Number(draft.nonPrivilegedIntervalMonths),
  },
})

/** How inactive accounts are handled and how often accounts are reviewed. */
export function SettingsPage() {
  const load = useResource(getSettings, [])
  const [draft, setDraft] = useState<SettingsDraft | null>(null)
  const [saved, setSaved] = useState(false)
  const save = useMutation(updateSettings)
  const canSave = hasPermission(useCurrentUser(), 'settings:update')

  // The form starts from what was loaded; after that the person's edits are the draft.
  if (load.status === 'loaded' && draft === null) setDraft(toDraft(load.data))

  if (load.status === 'loading') return <Spinner aria-label="Loading" />
  if (load.status === 'error') {
    const isForbidden = load.error instanceof ApiError && load.error.status === 403
    return <Infobox variant={isForbidden ? 'warning' : 'error'}>{load.error.message}</Infobox>
  }
  if (!draft) return null

  const errors = validateSettings(draft)
  // What the server refused, by field, for a rule the form does not check or checks differently.
  const serverErrors = save.error?.fieldErrors ?? {}
  const SERVER_KEYS = {
    suspendAfterDays: 'inactivity.suspendAfterDays',
    removeAfterDays: 'inactivity.removeAfterDays',
    privilegedIntervalMonths: 'review.privilegedIntervalMonths',
    nonPrivilegedIntervalMonths: 'review.nonPrivilegedIntervalMonths',
  } as const
  const showErrors = (name: keyof typeof errors) => errors[name] ?? serverErrors[SERVER_KEYS[name]]
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
        {save.error && !save.error.fieldErrors && <Infobox variant="error">{save.error.message}</Infobox>}
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
              label="Privileged accounts: review every (months)"
              description="1, 3, 6 or 12. Accounts that hold a privileged permission. An open review keeps its dates; a new value applies from the next period."
              inputMode="numeric"
              value={draft.privilegedIntervalMonths}
              onChange={(value) => change({ privilegedIntervalMonths: value })}
              isInvalid={Boolean(showErrors('privilegedIntervalMonths'))}
              errorMessage={showErrors('privilegedIntervalMonths')}
            />
            <TextField
              label="Other accounts: review every (months)"
              description="1, 3, 6 or 12, and not shorter than the privileged period."
              inputMode="numeric"
              value={draft.nonPrivilegedIntervalMonths}
              onChange={(value) => change({ nonPrivilegedIntervalMonths: value })}
              isInvalid={Boolean(showErrors('nonPrivilegedIntervalMonths'))}
              errorMessage={showErrors('nonPrivilegedIntervalMonths')}
            />
          </div>
        </Card>
        <div>
          <Button type="submit" isDisabled={!canSave || save.isSubmitting || Object.keys(errors).length > 0}>
            Save settings
          </Button>
        </div>
      </form>
    </section>
  )
}
