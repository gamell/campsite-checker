exports.checkIfSiteInView = (sitesSelector, siteId) => {
  const $sites = Array.from(document.querySelectorAll(sitesSelector));
  const $site = $sites.filter(s => s.innerText.indexOf(siteId) > -1);
  return $site.length === 1;
}

exports.getSiteAvailableHandle = (sitesSelector, siteId, tablePadding) => {
  const $sites = Array.from(document.querySelectorAll(sitesSelector));
  const $site = $sites.filter(s => s.innerText.indexOf(siteId) > -1)[0];
  if (!$site) return null;
  // this selects the cell 2 positions to the right of the site number (i.e. the date we care about)
  // if it's 'A', it means it's OPEN && AVAILABLE, otherwise we return false (not open or already reserved)
  const elem = $site.parentNode.parentNode.childNodes[tablePadding];
  return elem.innerText === 'A' ? elem : undefined;
}

exports.getSiteRows = (sel) => Array.from(document.querySelectorAll(sel)).length;

exports.siteRowsLargerThan = (sel, initialRows) => {
  return Array.from(document.querySelectorAll(sel)).length > initialRows;
}

exports.getCloseOverlayButton = (selector) => {
  const closeButton = document.querySelector(selector);
  if (closeButton) return closeButton;
  return document.body;
};

exports.waitForUrlToContain = (str) => {
  const href = document.location.href;
  return href.indexOf(str) > -1;
}

exports.getTextFromSelector = (selector) => {
  return document.querySelector(selector).innerText.toString();
}