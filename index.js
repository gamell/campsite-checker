const puppeteer = require('puppeteer');
const program = require('commander');
const playSound = require('play-sound')
const pkg = require('./package');

let campsiteId;
let date;
let siteId;
let wait;

program
  .version(pkg.version, '-v, --version')
  .usage('campsite-checker <campsiteId> <date> [siteId] [wait]')
  .arguments('<campsiteId> <date> [siteId] [wait]')
  .action((id, date, siteIdArg, waitArg) => {
    campsiteId = id;
    startDate = new Date(date);
    siteId = siteIdArg || '001';
    wait = waitArg || 10*60*1000; // defaults to 10 mins wait
  })
  .parse(process.argv);

const availabilityUrl = `https://www.recreation.gov/camping/campgrounds/${campsiteId}/availability`;
// adds leading zeros if needed
const zeroify = (num) => num < 10 ? `0${num}` : `${num}`;
const calculateDateString = (date) => {
  const month = zeroify(date.getUTCMonth() + 1);
  const day = zeroify(date.getUTCDate());
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}
const startDateString = calculateDateString(startDate);
const player = playSound(opts = {});
const kaChing = () => player.play('ka-ching.mp3');

console.log(`Looking for availability on campsiteId ${campsiteId}`);
console.log(`On date ${startDateString}`);
console.log(`For site ${siteId}`);
console.log(`Every ${wait}ms (${(wait/1000)/60}min)`);
console.log(`...`);

// function will be executed in Browser Context
function isSiteAvailable(siteId) {
  const sitesSelector = 'button.rec-availability-item';
  const $sites = Array.from(document.querySelectorAll(sitesSelector));
  const $site = $sites.filter(s => s.innerText.indexOf(siteId) > -1)[0];
  if (!$site) return false;
  // this selects the cell 2 positions to the right of the site number (i.e. the date we care about)
  // if it's 'A', it means it's OPEN && AVAILABLE, otherwise we return false (not open or already reserved)
  debugger;
  return $site.parentNode.parentNode.childNodes[2].innerText === 'A';
}

async function checkCampsite(browser, page) {
  const datePickerSelector = '.sarsa-date-picker-input';
  const blankSpaceSelector = '.rec-campground-availability-header-flex-wrap';
  const loadingSelector = '.rec-table-overlay-loading';

  await page.goto(availabilityUrl);
  await page.waitForSelector(datePickerSelector);
  // await page.click('.rec-button-link.rec-announcement-close');
  await page.focus(datePickerSelector);
  await page.type(datePickerSelector, '');
  await page.waitFor(500);
  await page.type(datePickerSelector, startDateString, {delay: 50});
  // somehow the date filter is not applied unless blur event
  await page.click(blankSpaceSelector);
  // wait for the loading spinner to go away
  await page.waitForFunction((selector) => !document.querySelector(selector), {polling: 250}, loadingSelector);  
  const jackpot = await page.evaluate(isSiteAvailable, siteId);
  if (jackpot) {
    // we're done!
    // ka-ching!
    kaChing();
    console.log('SUCCESS!!');
    return true;
  } else {
    // try again in a few
    console.log(`Campsite not available or an error happened, trying again in ${(wait/1000)/60} minutes`);
    setTimeout(() => checkCampsite(browser, page), wait);
  }
}

(async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  page.setViewport({ width: 1600, height: 1200});
  await checkCampsite(browser, page);
})();