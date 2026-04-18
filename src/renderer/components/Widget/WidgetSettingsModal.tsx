import { getWidget } from '../../widgets/registry'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { Modal } from '../ui/Modal'

export function WidgetSettingsModal() {
  const instances = useWidgetStore((s) => s.instances)
  const settingsInstanceId = useWidgetStore((s) => s.settingsInstanceId)
  const closeSettings = useWidgetStore((s) => s.closeSettings)
  const updateConfig = useWidgetStore((s) => s.updateConfig)

  const instance = instances.find((i) => i.instanceId === settingsInstanceId)
  const def = instance ? getWidget(instance.widgetId) : undefined
  const SettingsComponent = def?.settingsComponent

  if (!instance || !SettingsComponent) {
    return settingsInstanceId ? (
      <Modal open={true} onClose={closeSettings} title="Settings">
        <p className="text-text-secondary text-sm">No settings available for this widget.</p>
      </Modal>
    ) : null
  }

  return (
    <Modal open={true} onClose={closeSettings} title={`${def!.name} Settings`}>
      <SettingsComponent
        instanceId={instance.instanceId}
        config={instance.config}
        onConfigChange={(patch) => updateConfig(instance.instanceId, patch)}
      />
    </Modal>
  )
}
