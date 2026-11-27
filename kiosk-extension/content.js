// Fam Bam Kiosk — runs in top-level pages only, so apps shown inside the
// dashboard's overlay don't get a second button.
(async () => {
  const isDashboard = !!document.querySelector('meta[name="fam-bam-dashboard"]')
  const reply = await chrome.runtime.sendMessage({ type: 'page-loaded', isDashboard })
  if (!reply?.external) return

  // A popover sits in the browser's top layer, above anything the page draws.
  // The shadow root keeps the page's CSS away from the button.
  const host = document.createElement('div')
  host.setAttribute('data-fam-bam-back', '')
  host.setAttribute('popover', 'manual')
  host.style.cssText = [
    'position:fixed', 'inset:auto', 'left:50%', 'bottom:32px', 'transform:translateX(-50%)',
    'display:block', 'margin:0', 'padding:0', 'border:0', 'background:transparent',
    'overflow:visible', 'z-index:2147483647',
  ].map(rule => `${rule} !important`).join(';')

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '← Back to Dashboard'
  Object.assign(button.style, {
    font: '600 22px/1 system-ui, sans-serif',
    color: '#fff',
    background: '#0f766e',
    border: '2px solid #fff',
    borderRadius: '999px',
    padding: '22px 36px',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    touchAction: 'manipulation',
  })
  button.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'back' }))
  host.attachShadow({ mode: 'closed' }).append(button)

  // Some sites rebuild the page after loading and drop elements they don't know.
  function mount() {
    if (host.isConnected) return
    document.documentElement.append(host)
    host.showPopover?.()
  }
  mount()
  setInterval(mount, 1000)

  // Any interaction restarts the idle countdown (reported at most every 10 s).
  let lastReport = 0
  function report() {
    if (Date.now() - lastReport < 10_000) return
    lastReport = Date.now()
    chrome.runtime.sendMessage({ type: 'activity' }).catch(() => {})
  }
  for (const type of ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart']) {
    window.addEventListener(type, report, { capture: true, passive: true })
  }
})()
