const puppeteer = require('puppeteer');
let userConfig = require('../config.json');
const nav = require('./nav');

try {
  const hiddenLoginInfo = require('../.login');
  // we overwrite the login info with the one in the hidden file
  userConfig = { ...userConfig, login: hiddenLoginInfo };
} catch (e) {}

// defaults
const config = { 
  length: 1,
  siteId: '001',
  ...userConfig
}

console.log('Executing with configuration');
console.log({ ...config, login: { ...config.login, password: '*********' }});

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { 
      width: 1200, 
      height: 1200
    }
  });
  const page = await browser.newPage();
  nav.run(page, config);
})();