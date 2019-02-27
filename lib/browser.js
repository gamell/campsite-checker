function getSiteAvailableHandle(sitesSelector, siteId, tablePadding) {
  const $sites = Array.from(document.querySelectorAll(sitesSelector));
  const $site = $sites.filter(s => s.innerText.indexOf(siteId) > -1)[0];
  if (!$site) return null;
  // this selects the cell 2 positions to the right of the site number (i.e. the date we care about)
  // if it's 'A', it means it's OPEN && AVAILABLE, otherwise we return false (not open or already reserved)
  const elem = $site.parentNode.parentNode.childNodes[tablePadding];
  return elem.innerText === 'A' ? elem : undefined;
}

function getCloseOverlayButton(selector) {
  const closeButton = document.querySelector(selector);
  if (closeButton) return closeButton;
  return document.body;
};

const browser = {
  getSiteAvailableHandle,
  getCloseOverlayButton
}

module.exports = browser;