const puppeteer = require('puppeteer');
const program = require('commander');
const player = require('play-sound')({});
const pkg = require('./package');

let campsiteId;
let siteId;
let startDate;
let lengthOfStay;
let wait;

program
  .version(pkg.version, '-v, --version')
  .usage('campsite-checker <campsiteId> <date> <siteId> <length> [wait]')
  .arguments('<campsiteId> <date> <siteId> <length> [wait]')
  .action((id, date, siteIdArg, length, waitArg) => {
    campsiteId = id;
    startDate = new Date(date);
    siteId = siteIdArg || '001';
    lengthOfStay = parseInt(length, 10);
    wait = waitArg || 10*60*1000; // defaults to 10 mins wait
  })
  .parse(process.argv);

// adds leading zeros if needed
const zeroify = (num) => num < 10 ? `0${num}` : `${num}`;

// calculates the date in the format needed by the website
const calculateDateString = (date) => {
  const month = zeroify(date.getUTCMonth() + 1);
  const day = zeroify(date.getUTCDate());
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

const kaChing = () => player.play('ka-ching.mp3');

const availabilityUrl = `https://www.recreation.gov/camping/campgrounds/${campsiteId}/availability`;
const startDateString = calculateDateString(startDate);
const tablePadding = 2;

const datePickerSelector = '.sarsa-date-picker-input';
const blankSpaceSelector = '.rec-campground-availability-header-flex-wrap';
const loadingSelector = '.rec-table-overlay-loading';
const sitesSelector = 'button.rec-availability-item';

console.log(`Looking for availability on campsiteId ${campsiteId}`);
console.log(`On date ${startDateString}`);
console.log(`For site ${siteId}`);
console.log(`Every ${wait}ms (${(wait/1000)/60}min)`);
console.log(`...`);

// Browser Context Functions
function getSiteAvailableHandle(sitesSelector, siteId, tablePadding) {
  const $sites = Array.from(document.querySelectorAll(sitesSelector));
  const $site = $sites.filter(s => s.innerText.indexOf(siteId) > -1)[0];
  if (!$site) return null;
  // this selects the cell 2 positions to the right of the site number (i.e. the date we care about)
  // if it's 'A', it means it's OPEN && AVAILABLE, otherwise we return false (not open or already reserved)
  const elem = $site.parentNode.parentNode.childNodes[tablePadding];
  return elem.innerText === 'A' ? elem : null;
}

async function startBooking(page, handle) {
  if (!lengthOfStay) return;
  await handle.click();
  if (lengthOfStay > 1) {
    const tableColumn = tablePadding + lengthOfStay;
    const endDayHandle = await page.evaluateHandle((sitesSelector, siteId, column) => {
      const $sites = Array.from(document.querySelectorAll(sitesSelector));
      const $site = $sites.filter(s => s.innerText.indexOf(siteId) > -1)[0];
      return $site.parentNode.parentNode.childNodes[column]
    }, sitesSelector, siteId, tableColumn);
    await endDayHandle.click();
  }
  // click book button
}

async function checkCampsite(browser, page) {
  await page.goto(availabilityUrl);
  await page.waitForSelector(datePickerSelector);
  await page.focus(datePickerSelector);
  await page.type(datePickerSelector, '');
  await page.waitFor(500);
  await page.type(datePickerSelector, startDateString, {delay: 50});
  // somehow the date filter is not applied until blur event
  await page.click(blankSpaceSelector);
  // wait for the loading spinner to go away
  await page.waitForFunction((selector) => !document.querySelector(selector), {polling: 250}, loadingSelector);
  const handle = await page.evaluateHandle(getSiteAvailableHandle, sitesSelector, siteId, tablePadding);
  if (handle) {
    // we're done!
    kaChing();
    console.log('SUCCESS!!');
    await startBooking(page, handle);
    return true;
  } else {
    // try again in a few
    console.log(`Campsite not available or an error happened, trying again in ${(wait/1000)/60} minutes`);
    setTimeout(() => checkCampsite(browser, page), wait);
  }
}

(async () => {
  const browser = await puppeteer.launch({headless: false, devtools: true});
  const page = await browser.newPage();
  page.setViewport({ width: 1600, height: 1200});
  await checkCampsite(browser, page);
})();