// Minimal DOM test helpers on react-dom + act, so tests need no extra libraries.
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: (() => void)[] = []

afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount())
})

/** Renders into a fresh container attached to the document; unmounted after each test. */
export async function render(ui: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(ui))
  mounted.push(() => {
    act(() => root.unmount())
    container.remove()
  })
  return container
}

/** Lets pending promises and the state updates they trigger settle. */
export async function flush() {
  await act(async () => {})
}

/** Accessible name: aria-label, else visible text. */
function nameOf(el: Element): string {
  return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()
}

export function queryButton(container: ParentNode, name: string | RegExp): HTMLButtonElement | null {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.find((b) => (typeof name === 'string' ? nameOf(b) === name : name.test(nameOf(b)))) ?? null
}

export function getButton(container: ParentNode, name: string | RegExp): HTMLButtonElement {
  const button = queryButton(container, name)
  if (!button) throw new Error(`No button named ${String(name)}`)
  return button
}

export async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** Sets a controlled input's value the way a user would, so React's onChange fires. */
export async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

export async function submit(form: HTMLFormElement) {
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

/** A fetch Response with a JSON body. */
export function jsonResponse(body: unknown, status = 200, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}
