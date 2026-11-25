import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const id = 'dsh-composer-queue-indicator'
const slot = 'conversation.input.overlay'
const require = createRequire(import.meta.url)
let plugin

globalThis.window = {
  __ModuleLoader__: {
    load({ id: moduleId, factory }) {
      assert.equal(moduleId, `@miorin/${id}`)
      plugin = factory(require)
    },
  },
}
await import('../client.js')
delete globalThis.window

const accelerated = `data-${id}-accelerated`

function mount() {
  const attrs = new Set<string>()
  const window = new EventTarget()
  const document = Object.assign(new EventTarget(), { documentElement: {
    toggleAttribute(name, force) { if (force) attrs.add(name); else attrs.delete(name) },
    removeAttribute(name) { attrs.delete(name) },
  } })
  Object.assign(globalThis, { window, document })
  let component
  const disposers = []
  plugin.apply({
    effect(install) { disposers.push(install()) },
    slots: {
      inject(name, install) {
        assert.equal(name, slot)
        return install()
      },
      register(options, render) {
        assert.deepEqual(options, { name: slot, id, locale: 'conversation' })
        component = render
        return () => { component = undefined }
      },
    },
  })
  return {
    render(dictionary) { return component?.({ t: key => dictionary[key] ?? key }) },
    dispose() { for (const dispose of disposers) dispose() },
    get accelerated() { return attrs.has(accelerated) },
    window, document,
  }
}

const queue = 'input.send.queue'
const steer = 'input.send.steer'

function key(target, type, key, { ctrlKey = false, metaKey = false, altKey = false, shiftKey = false, altGraph = false } = {}) {
  const event = Object.assign(new Event(type, { cancelable: true }), {
    key, ctrlKey, metaKey, altKey, shiftKey, getModifierState: name => name === 'AltGraph' && altGraph,
  })
  target.dispatchEvent(event)
  assert.equal(event.defaultPrevented, false)
}

test('registers a removable local style in the composer overlay', () => {
  assert.deepEqual(plugin.inject, ['slots'])
  const overlay = mount()
  const result = overlay.render({ [queue]: '排队发送' })
  assert.equal(result.type, 'style')
  assert.equal(result.props[`data-${id}`], '')
  assert.match(result.props.children, /\[data-composer-card\]:has\(> \[data-composer-overlay\]/u)
  assert.match(result.props.children, /button\[type="button"\]\[aria-busy="false"\]\[aria-label="排队发送"\]:enabled:has\(> svg\[aria-hidden="true"\]\)/u)
  assert.match(result.props.children, /@supports \(clip-path: path\("M8 1 /u)
  assert.match(result.props.children, /::after\s*\{[^}]+width: 16px;[^}]+clip-path: path\("M8 1 /u)
  assert.equal(result.props.onClick, undefined)
  overlay.dispose()
  assert.equal(overlay.render({ [queue]: '排队发送' }), undefined)
})

test('uses the current native label and escapes it as a CSS string', () => {
  const overlay = mount()
  const first = overlay.render({ [queue]: '排队发送' }).props.children
  const next = overlay.render({ [queue]: 'Queue "later"\\next\nline' }).props.children
  assert.match(first, /aria-label="排队发送"/u)
  assert.match(next, /\[aria-label="Queue \\22 later\\22 \\5c next\\a line"\]/u)
  assert.doesNotMatch(next, /排队发送/u)
})

test('leaves the original icon if the queue label is absent or ambiguous', () => {
  const overlay = mount()
  assert.equal(overlay.render({}), null)
  assert.equal(overlay.render({ [queue]: '' }), null)
  for (const other of ['input.send', 'input.send.steer', 'input.stop', 'input.sending', 'input.continue']) {
    assert.equal(overlay.render({ [queue]: 'Send', [other]: 'Send' }), null)
  }
  assert.equal(overlay.render({ [queue]: 'Queue', [steer]: 'Steer' }).type, 'style')
  const ambiguousSteer = overlay.render({ [queue]: 'Queue', [steer]: 'Send', 'input.send': 'Send' }).props.children
  assert.doesNotMatch(ambiguousSteer, /aria-label="Send"/u)
})

test('shows queue on the native Queue label without Mod and on Steer with Mod', () => {
  const overlay = mount()
  const css = overlay.render({ [queue]: '排队发送', [steer]: '插话发送' }).props.children
  assert.match(css, /:root:not\(\[data-dsh-composer-queue-indicator-accelerated\]\) [^,]+\[aria-label="排队发送"\]/u)
  assert.match(css, /:root\[data-dsh-composer-queue-indicator-accelerated\] [^,]+\[aria-label="插话发送"\]/u)
  overlay.dispose()
})

test('tracks Ctrl and Meta without consuming keys and clears on release, blur, visibility changes and unload', () => {
  const overlay = mount()
  const { window, document } = overlay
  assert.equal(overlay.accelerated, false)
  key(window, 'keydown', 'Meta')
  assert.equal(overlay.accelerated, true)
  key(window, 'keydown', 'Control', { metaKey: true })
  assert.equal(overlay.accelerated, false)
  key(window, 'keyup', 'Control', { metaKey: true })
  assert.equal(overlay.accelerated, true)
  key(window, 'keyup', 'Meta')
  assert.equal(overlay.accelerated, false)
  key(window, 'keydown', 'Control')
  assert.equal(overlay.accelerated, true)
  for (const flags of [{ altKey: true }, { shiftKey: true }, { altGraph: true }]) {
    key(window, 'keydown', 'x', { ctrlKey: true, ...flags })
    assert.equal(overlay.accelerated, false)
  }
  for (const [target, type] of [[window, 'blur'], [document, 'visibilitychange']]) {
    key(window, 'keydown', 'Control')
    target.dispatchEvent(new Event(type))
    assert.equal(overlay.accelerated, false)
  }
  key(window, 'keydown', 'Meta')
  overlay.dispose()
  assert.equal(overlay.accelerated, false)
  key(window, 'keydown', 'Meta')
  assert.equal(overlay.accelerated, false)
})
