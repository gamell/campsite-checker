const puppeteer = require('puppeteer');
const userInfo = require('./info.json');
const nav = require('./nav');
const utils = require('./lib/util');

// defaults
const info = { 
  length: 1,
  siteId: '001',
  ...userInfo
}

console.log('Executing with configuration');
console.log({ ...info, login: { ...info.login, password: '*********' }});

async function run(browser){
  const page = await browser.newPage();
  const { login, checkingUntilAvailable, selectDates, checkout } = nav.init(page, info);

  // First we log in

  await login();

  // @TODO
  //  - dynamic site

  // Then we check the availability for the given dates and site

  let startDateHandle = await checkingUntilAvailable();
  // here we know the campsite is "bookable", but the actual booking window is probably not open yet
  await selectDates(startDateHandle);
  // now we might have to parse the overlay telling us at what time will the booking window open
  // we know it will be in a few hours today or tomorrow, so that's a given
  
  // const openTime = nav.maybeGetOpenTime();
  
  // after this, we just need to keep refreshing the page until 1 minute before the open session
  // then click the "book" button just at the right time so the request gets there at precisely the opening time
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { 
      width: 1600, 
      height: 1200
    }
  });
  run(browser);
})();