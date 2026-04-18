import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { toast } from '../../stores/useToastStore'
import type { WidgetSettingsProps } from '../types'

export function BinCollectionSettings({ config, onConfigChange }: WidgetSettingsProps) {
  const [uprn, setUprn] = useState((config.uprn as string) || '')
  const [postcode, setPostcode] = useState((config.postcode as string) || '')

  const handleSave = () => {
    onConfigChange({ uprn: uprn.trim(), postcode: postcode.trim().toUpperCase() })
    toast.success('Bin collection settings saved')
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-text-secondary mb-1 block">UPRN</label>
        <input
          type="text"
          value={uprn}
          onChange={(e) => setUprn(e.target.value)}
          placeholder="e.g. 100050624141"
          inputMode="numeric"
          className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all"
        />
        <p className="text-[10px] text-text-disabled mt-1">
          Find yours at findmyaddress.co.uk
        </p>
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">Postcode</label>
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="e.g. S71 2ED"
          className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all uppercase"
        />
      </div>

      <p className="text-[10px] text-text-disabled">
        Currently supports Barnsley MBC. Data sourced live from waste.barnsley.gov.uk.
      </p>

      <Button onClick={handleSave}>Save</Button>
    </div>
  )
}
