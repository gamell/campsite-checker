const browser = require('./lib/browser');
const { tryAfter, calculateDateString } = require('./lib/util');

const tablePadding = 2;
const WAIT_AVAILABLE = 15*60*1000; // 10 minutes

// Selectors
const datePickerSelector = '.sarsa-date-picker-input';
const blankSpaceSelector = '.rec-campground-availability-header-flex-wrap';
const loadingSelector = '.rec-table-overlay-loading';
const sitesSelector = 'button.rec-availability-item';
const bookNowButtonSelector = '.per-availability-book-now-content button.rec-button-primary';
const popOverCloseButtonSelector = 'button.rec-announcement-close';
const loginEmailSelector = 'input#rec-acct-sign-in-email-address';
const loginPasswordSelector = 'input#rec-acct-sign-in-password';
const loginButtonSelector = '.rec-acct-signin-modal button.rec-button-primary'
const accountPageSelector = '.acct-account-wrap';

function init(page, info){
  const { campsiteId, startDate, length: lengthOfStay, siteId } = info;
  const startDateString = calculateDateString(startDate);

  async function selectDates(startDayHandle) {
    if (!lengthOfStay || !startDayHandle) return;
    await startDayHandle.click();
    if (lengthOfStay > 1) {
      const tableColumn = tablePadding + lengthOfStay;
      const endDayHandle = await page.evaluateHandle((sitesSelector, siteId, column) => {
        const $sites = Array.from(document.querySelectorAll(sitesSelector));
        const $site = $sites.filter(s => s.innerText.indexOf(siteId) > -1)[0];
        return $site.parentNode.parentNode.childNodes[column]
      }, sitesSelector, siteId, tableColumn);
      await endDayHandle.click();
    }
    // wait until book button is enabled
    await page.waitForFunction(
      (selector) => 
        document.querySelector(selector).getAttribute('disabled') === null,
      { polling: 250 },
      bookNowButtonSelector
    );
    await page.click(bookNowButtonSelector);
  }
  
  async function checkIfAvailable() {
    const availabilityUrl = `https://www.recreation.gov/camping/campgrounds/${campsiteId}/availability`;
    await page.goto(availabilityUrl);
    await page.waitForSelector(datePickerSelector);
    await page.focus(datePickerSelector);
    await page.type(datePickerSelector, '');
    await page.waitFor(500);
    await page.type(datePickerSelector, startDateString, {delay: 50});
    // somehow the date filter is not applied until blur event
    await page.click(blankSpaceSelector);
    // wait for the loading spinner to go away
    await page.waitForFunction((selector) => !document.querySelector(selector), { polling: 250 }, loadingSelector);
    // close the pop over if it exists
    const maybeCloseButton = await page.evaluateHandle(browser.getCloseOverlayButton, popOverCloseButtonSelector);
    await maybeCloseButton.click();
    await page.waitFor(250);
    // get the handle for the start day
    const startDayHandle = await page.evaluateHandle(browser.getSiteAvailableHandle, sitesSelector, siteId, tablePadding);
    if (startDayHandle.asElement()) {
      console.log('Site available');
      return startDayHandle;
    } else {
      return null;
    }
  }

  async function checkingUntilAvailable(){
    let startDateHandle = await checkIfAvailable();
    while(!startDateHandle) {
      console.log(`Campsite not "bookable" yet. Trying again in ${WAIT_AVAILABLE/1000/60} minutes...`);
      startDateHandle = await tryAfter(WAIT_AVAILABLE, checkIfAvailable);
    }
    return startDateHandle;
  }
  
  async function login() {
    await page.goto('https://www.recreation.gov/account/profile');
    const loginInfo = info.login;
    if (!loginInfo.email || !loginInfo.password) {
      console.log('No login information found. Please fill it in info.json');
      return;
    }
    const { email, password } = loginInfo;
    await page.waitForSelector(loginEmailSelector, {timeout: 5000});
    await page.type(loginEmailSelector, email, {delay: 50});
    await page.type(loginPasswordSelector, password, {delay: 50});
    await page.click(loginButtonSelector);
    try {
      // wait until in profile page
      await page.waitFor(accountPageSelector);
      console.log('Successfully logged in!');
    } catch(e) {
      throw new Error('Seems that we were not redirected to the profile page, something went wrong.');
    }
  }
  
  async function checkout(page) {
    // TODO
    await page.waitForFunction(() => location.href.indexOf('reservations') > -1, {timeout: 15000});
  }

  return {
    login,
    checkingUntilAvailable,
    selectDates,
    checkout
  }

}

module.exports = { init };
