import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

const ID = 'dsh-composer-queue-indicator'
const SLOT = 'conversation.input.overlay'
const LOCALE = 'conversation'
const MARKER = 'data-dsh-composer-queue-indicator'

export const inject = ['slots']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({
    name: SLOT, id: ID, locale: LOCALE,
  }, QueueGlyph)), `${ID}: composer overlay`)
}

function QueueGlyph({ t }: PropsLocale<typeof LOCALE>) {
  const key = 'input.send.queue'
  const label = t(key)
  if (!label || label === key || label === t('input.send') || label === t('input.send.steer')
    || label === t('input.stop') || label === t('input.sending') || label === t('input.continue')) return null
  return createElement('style', { [MARKER]: '', children: queueStyles(label) })
}

function queueStyles(label: string): string {
  // Escape both CSS string delimiters and controls, including newlines in language packs.
  const escaped = label.replace(/["\\\u0000-\u001f\u007f]/gu, char => `\\${char.charCodeAt(0).toString(16)} `)
  // @deepseek-ai/dsh-client-ui-conversation 0.2.2-rc.5, src/client/skeleton/
  // InputBar.tsx (primaryLabel / primary button). The native localized name
  // already reflects the delivery policy, upload gates, commands, and permissions.
  const primary = `[data-composer-card]:has(> [data-composer-overlay] [${MARKER}]) > div > div > button[type="button"][aria-busy="false"][aria-label="${escaped}"]:enabled:has(> svg[aria-hidden="true"])`
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
