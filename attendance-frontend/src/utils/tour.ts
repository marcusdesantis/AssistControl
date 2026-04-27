import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function createTour(steps: {
  element: string
  title: string
  description: string
  onHighlight?: () => void
}[]) {
  return driver({
    showProgress:      true,
    animate:           true,
    overlayOpacity:    0.6,
    stagePadding:      8,
    allowClose:        true,
    nextBtnText:       'Siguiente →',
    prevBtnText:       '← Anterior',
    doneBtnText:       'Entendido ✓',
    progressText:      'Paso {{current}} de {{total}}',
    popoverClass:      'ai-tour-popover',
    steps: steps.map(s => ({
      element:  s.element,
      popover: {
        title:       s.title,
        description: s.description,
        side:        'bottom' as const,
        align:       'start'  as const,
      },
      onHighlightStarted: s.onHighlight,
    })),
  })
}
