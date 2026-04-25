import { useEffect, useRef, useState } from 'react'
import Keyboard from 'react-simple-keyboard'
import 'react-simple-keyboard/build/css/index.css'

type KbInstance = { setInput: (v: string) => void }

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'password', 'email', 'url', 'tel', ''])

function isTextLike(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type) || el.type === 'number'
  return false
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

type Layout = 'default' | 'shift' | 'numbers'

const LAYOUTS = {
  default: [
    'q w e r t y u i o p {bksp}',
    'a s d f g h j k l {enter}',
    '{shift} z x c v b n m \' - {shift}',
    '{numbers} {space} {done}',
  ],
  shift: [
    'Q W E R T Y U I O P {bksp}',
    'A S D F G H J K L {enter}',
    '{shift} Z X C V B N M ! ? {shift}',
    '{numbers} {space} {done}',
  ],
  numbers: [
    '1 2 3 {bksp}',
    '4 5 6 {enter}',
    '7 8 9 {done}',
    '. 0 - {abc}',
  ],
}

const DISPLAY = {
  '{bksp}': '⌫',
  '{enter}': '↵',
  '{shift}': '⇧',
  '{space}': 'space',
  '{done}': '✓ Done',
  '{numbers}': '123',
  '{abc}': 'ABC',
}

export default function VirtualKeyboard() {
  const [visible, setVisible] = useState(false)
  const [layoutName, setLayoutName] = useState<Layout>('default')
  const focusedEl = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const kbRef = useRef<KbInstance | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      const target = e.target as Element
      if (!isTextLike(target)) return
      const el = target as HTMLInputElement | HTMLTextAreaElement
      focusedEl.current = el
      kbRef.current?.setInput(el.value)
      const isNum = el instanceof HTMLInputElement && el.type === 'number'
      setLayoutName(isNum ? 'numbers' : 'default')
      setVisible(true)
    }

    function onFocusOut(e: FocusEvent) {
      const next = e.relatedTarget as Element | null
      if (next && overlayRef.current?.contains(next)) return
      setVisible(false)
      focusedEl.current = null
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  // Scroll focused input into view above the keyboard when it appears
  useEffect(() => {
    if (!visible || !focusedEl.current) return
    const el = focusedEl.current
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }, [visible])

  function onChange(value: string) {
    if (focusedEl.current) setNativeValue(focusedEl.current, value)
  }

  function onKeyPress(button: string) {
    if (button === '{shift}') { setLayoutName(l => l === 'shift' ? 'default' : 'shift'); return }
    if (button === '{numbers}') { setLayoutName('numbers'); return }
    if (button === '{abc}') { setLayoutName('default'); return }
    if (button === '{enter}') {
      const form = focusedEl.current?.closest('form')
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      dismiss()
      return
    }
    if (button === '{done}') { dismiss(); return }
    // Auto-unshift after a letter is typed
    if (layoutName === 'shift' && button.length === 1) setLayoutName('default')
  }

  function dismiss() {
    setVisible(false)
    focusedEl.current?.blur()
    focusedEl.current = null
  }

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      className="vkb-root"
      onMouseDown={e => e.preventDefault()}
    >
      <Keyboard
        keyboardRef={r => { kbRef.current = r as KbInstance }}
        layoutName={layoutName}
        onChange={onChange}
        onKeyPress={onKeyPress}
        layout={LAYOUTS}
        display={DISPLAY}
        theme="hg-theme-default vkb-theme"
      />
    </div>
  )
}
