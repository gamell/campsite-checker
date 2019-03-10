import { launch } from 'puppeteer';
import nav from './nav';

let userConfig = require('../config.json');

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
};

console.log('Executing with configuration');
console.log({ ...config, login: { ...config.login, password: '*********' } });
const homedir = require('os').homedir();

(async () => {
    // const browser = await launch({
    //     headless: false,
    //     // devtools: true,
    // defaultViewport: {
    //     width: 1200,
    //     height: 1200
    // }
    // });
    const browser = await launch({
        headless: false,
        executablePath:
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        userDataDir: `${homedir}/Library/Application Support/Google/Chrome Canary/`,
        defaultViewport: {
            width: 1200,
            height: 1200
        }
    });
    const page = await browser.newPage();
    // await page.setRequestInterception(true);
    // await page.on('request', request => {
    //     const { host } = request.headers();
    //     const requestUrl = request.url();
    //     const regex = /recreation\.gov/;
    //     // aborting all requests not sent to the recreation.gov domain
    //     if ((host && !host.match(regex)) || !requestUrl.match(regex)) {
    //         request.abort();
    //     }
    //     request.continue();
    // });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36'
    );
    nav(page, config);
})();
