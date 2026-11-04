// NovaGraph background service worker
chrome.action?.onClicked?.addListener(async (tab) => {
  if (tab.id && tab.url?.includes('novastar.show')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle_novagraph' });
  } else {
    chrome.tabs.create({ url: 'https://novastar.show/' });
  }
});

