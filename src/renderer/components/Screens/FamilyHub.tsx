import { WidgetGrid } from '../Widget/WidgetGrid'

/**
 * Family Hub screen — the original dashboard surface. Just a thin wrapper
 * around WidgetGrid for now so the screen-tab routing has a stable target.
 */
export function FamilyHub() {
  return <WidgetGrid />
}
