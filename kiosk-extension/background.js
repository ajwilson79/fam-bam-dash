// Fam Bam Kiosk — decides which tabs are outside the dashboard and gets the
// display back to it, either on a button tap (content.js) or after idle time.

// Used until a page carrying the dashboard's <meta name="fam-bam-dashboard">
// marker has loaded; after that its real address is remembered.
const DEFAULT_DASHBOARD = 'http://localhost:12000/'
const IDLE_MS = 5 * 60_000
const IDLE_ALARM = 'idle-check'

const activityKey = tabId => `active:${tabId}`

async function dashboardUrl() {
  const stored = await chrome.storage.local.get('dashboardUrl')
  return stored.dashboardUrl || DEFAULT_DASHBOARD
}

function sameOrigin(a, b) {
  try { return new URL(a).origin === new URL(b).origin } catch { return false }
}

function markActive(tabId) {
  return chrome.storage.session.set({ [activityKey(tabId)]: Date.now() })
}

// Closes the tab if the dashboard is still open behind it; otherwise the tab
// itself navigated away from the dashboard, so send it back.
async function returnToDashboard(tabId) {
  const home = await dashboardUrl()
  const tabs = await chrome.tabs.query({})
  const dashboard = tabs.find(t => t.id !== tabId && sameOrigin(t.url, home))
  if (!dashboard) {
    await chrome.tabs.update(tabId, { url: home })
    return
  }
  await chrome.tabs.update(dashboard.id, { active: true })
  await chrome.windows.update(dashboard.windowId, { focused: true })
  await chrome.tabs.remove(tabId)
}

// Also covers pages where content.js can't run (error pages, built-in viewers),
// so the kiosk is never stranded on them.
async function returnIdleTabs() {
  const home = await dashboardUrl()
  for (const tab of await chrome.tabs.query({})) {
    const url = tab.url || tab.pendingUrl
    if (!url || sameOrigin(url, home)) continue
    const key = activityKey(tab.id)
    const lastActive = (await chrome.storage.session.get(key))[key]
    if (lastActive === undefined) await markActive(tab.id)
    else if (Date.now() - lastActive >= IDLE_MS) await returnToDashboard(tab.id)
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id
  if (tabId === undefined) return false

  if (message.type === 'page-loaded') {
    (async () => {
      if (message.isDashboard) {
        await chrome.storage.local.set({ dashboardUrl: new URL('/', sender.url).href })
      }
      await markActive(tabId)
      const external = !message.isDashboard && !sameOrigin(sender.url, await dashboardUrl())
      sendResponse({ external })
    })()
    return true // keep the channel open for the async response
  }

  if (message.type === 'activity') markActive(tabId)
  if (message.type === 'back') returnToDashboard(tabId).catch(console.error)
  return false
})

chrome.tabs.onUpdated.addListener((tabId, change) => { if (change.url) markActive(tabId) })
chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove(activityKey(tabId)))

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === IDLE_ALARM) returnIdleTabs().catch(console.error)
})
// Only create the alarm once: re-creating it each time the worker wakes would
// keep pushing the next check into the future.
chrome.alarms.get(IDLE_ALARM).then(existing => {
  if (!existing) chrome.alarms.create(IDLE_ALARM, { periodInMinutes: 0.5 })
})
