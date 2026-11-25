import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

const ID = 'dsh-composer-queue-indicator'
const SLOT = 'conversation.input.overlay'
const LOCALE = 'conversation'
const MARKER = 'data-dsh-composer-queue-indicator'
const ACCELERATED = `${MARKER}-accelerated`

export const inject = ['slots']

export function apply(ctx: Context): void {
  ctx.effect(observeAcceleratedEnter, `${ID}: keyboard modifier`)
  ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({
    name: SLOT, id: ID, locale: LOCALE,
  }, QueueGlyph)), `${ID}: composer overlay`)
}

function observeAcceleratedEnter(): () => void {
  const controller = new AbortController()
  const { signal } = controller
  const root = document.documentElement
  // Match the native composer keymap (0.2.2-rc.5, input/editor/keymap.ts):
  // either Ctrl or Meta, but no Shift, Alt, AltGraph, or Ctrl+Meta chord.
  const update = (event: KeyboardEvent) => {
    const control = event.key === 'Control' ? event.type === 'keydown' : event.ctrlKey
    const meta = event.key === 'Meta' ? event.type === 'keydown' : event.metaKey
    root.toggleAttribute(ACCELERATED, control !== meta && !event.altKey && !event.shiftKey
      && !event.getModifierState('AltGraph'))
  }
  const reset = () => { root.removeAttribute(ACCELERATED) }
  window.addEventListener('keydown', update, { capture: true, passive: true, signal })
  window.addEventListener('keyup', update, { capture: true, passive: true, signal })
  window.addEventListener('blur', reset, { signal })
  document.addEventListener('visibilitychange', reset, { signal })
  return () => { controller.abort(); reset() }
}

function QueueGlyph({ t }: PropsLocale<typeof LOCALE>) {
  const plainLabels = [t('input.send'), t('input.stop'), t('input.sending'), t('input.continue')]
  const queue = t('input.send.queue')
  const steer = t('input.send.steer')
  const queueLabel = queue && queue !== 'input.send.queue' && queue !== steer && !plainLabels.includes(queue) ? queue : null
  const steerLabel = steer && steer !== 'input.send.steer' && steer !== queue && !plainLabels.includes(steer) ? steer : null
  if (queueLabel === null && steerLabel === null) return null
  return createElement('style', { [MARKER]: '', children: queueStyles(queueLabel, steerLabel) })
}

function queueStyles(queue: string | null, steer: string | null): string {
  // @deepseek-ai/dsh-client-ui-conversation 0.2.2-rc.5, src/client/skeleton/
  // InputBar.tsx (primaryLabel / primary button). The native localized name
  // already reflects the delivery policy, upload gates, commands, and permissions.
  const card = `[data-composer-card]:has(> [data-composer-overlay] [${MARKER}])`
  const button = (label: string) => {
    // Escape delimiters and controls, including newlines in language packs.
    const escaped = label.replace(/["\\\u0000-\u001f\u007f]/gu, char => `\\${char.charCodeAt(0).toString(16)} `)
    return `> div > div > button[type="button"][aria-busy="false"][aria-label="${escaped}"]:enabled:has(> svg[aria-hidden="true"])`
  }
  const selectors = [
    queue === null ? null : `:root:not([${ACCELERATED}]) ${card} ${button(queue)}`,
    steer === null ? null : `:root[${ACCELERATED}] ${card} ${button(steer)}`,
  ].filter(selector => selector !== null)
  const primary = `:is(${selectors.join(', ')})`
  // Compact arrow over two stacked lines. A CSS path needs no image load.
  const glyph = 'M8 1 L12 5 L10.75 6.25 L8.875 4.375 V8.5 H7.125 V4.375 L5.25 6.25 L4 5 Z M2 10 H14 V11.75 H2 Z M4 13 H12 V14.75 H4 Z'
  return `
@supports (clip-path: path("${glyph}")) {
  ${primary} > svg { display: none; }
  ${primary}::after {
    content: "";
    display: block;
    width: 16px;
    height: 16px;
    background: currentColor;
    clip-path: path("${glyph}");
    pointer-events: none;
  }
  @media (forced-colors: active) {
    ${primary}::after { forced-color-adjust: none; background: ButtonText; }
  }
}`
}
