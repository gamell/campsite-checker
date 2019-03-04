const moment = require('moment');
const {
    waitForUrlToContain,
    getSiteAvailableHandle,
    getEndDayHandle,
    getCloseOverlayButton,
    getTextFromSelector,
    checkIfSiteInView,
    getSiteRows,
    siteRowsLargerThan
} = require('./lib/browser');

const {
    tryAfter,
    calculateDateString,
    kaChing,
    logError,
    parseTime,
    sleep
} = require('./lib/util');

const sel = require('./lib/selectors');

const tablePadding = 2;
// How often to re-check if campsite is "available"
const WAIT_AVAILABLE = 15 * 60 * 1000; // 15 minutes
// How often to refresh the page when waiting between "available" and "bookable" - just to keep the session
const WAIT_REFRESH_BOOKABLE = 10 * 60 * 1000; // 10 minutes
// How many minutes before the bookableTime do we want to do the last refresh and select the dates
const MINUTES_TO_GET_READY = 2;
// handle that points to the start date
let startDayHandle;
let bookableTime;

export default async function run(page, info) {
    const { campsiteId, startDate, length: lengthOfStay, siteId } = info;
    const startDateString = calculateDateString(startDate);

    async function login() {
        await page.goto('https://www.recreation.gov/account/profile');
        const loginInfo = info.login;
        if (!loginInfo.email || !loginInfo.password) {
            console.log(
                'No login information found. Please fill it in info.json'
            );
            return;
        }
        const { email, password } = loginInfo;
        await page.waitFor(sel.loginEmail, { timeout: 5000 });
        await page.type(sel.loginEmail, email, { delay: 50 });
        await page.type(sel.loginPassword, password, { delay: 50 });
        await page.click(sel.loginButton);
        try {
            // wait until in profile page
            await page.waitFor(sel.accountPage);
            console.log('Successfully logged in!');
        } catch (e) {
            throw new Error(
                'Seems that we were not redirected to the profile page, something went wrong.'
            );
        }
    }

    async function checkIfAvailable() {
        console.log(
            `Checking availability for campsiteId ${campsiteId}, site ${siteId}`
        );
        const availabilityUrl = `https://www.recreation.gov/camping/campgrounds/${campsiteId}/availability`;
        await page.goto(availabilityUrl);
        await page.waitFor(sel.datePicker);
        await page.focus(sel.datePicker);
        await page.type(sel.datePicker, '');
        await page.waitFor(500);
        await page.type(sel.datePicker, startDateString, { delay: 50 });
        // somehow the date filter is not applied until blur event
        await page.click(sel.blankSpace);
        // wait for the loading spinner to go away
        await page.waitForFunction(
            selector => !document.querySelector(selector),
            { polling: 250 },
            sel.loading
        );
        // close the pop over if it exists
        const maybeCloseButton = await page.evaluateHandle(
            getCloseOverlayButton,
            sel.popOverCloseButton
        );
        await maybeCloseButton.click();
        await page.waitFor(250);
        try {
            let siteInView = await page.evaluate(
                checkIfSiteInView,
                sel.sites,
                siteId
            );
            while (!siteInView) {
                const initialRows = await page.evaluate(getSiteRows, sel.sites);
                console.log(`Site not in view. Loading more sites...`);
                await page.click(sel.loadMoreButton);
                // we wait until the number of campsite rows grows
                await page.waitFor(
                    siteRowsLargerThan,
                    {},
                    sel.sites,
                    initialRows
                );
                page.waitFor(100);
                siteInView = await page.evaluate(
                    checkIfSiteInView,
                    sel.sites,
                    siteId
                );
            }
        } catch (e) {
            logError(
                `Tried to load more campsites until the desired campsite was in view but failed`
            );
            throw new Error(e);
        }
        // get the handle for the start day
        startDayHandle = await page.evaluateHandle(
            getSiteAvailableHandle,
            sel.sites,
            siteId,
            tablePadding
        );
        return !!startDayHandle.asElement();
    }

    async function checkUntilAvailable() {
        let isAvailable = await checkIfAvailable();
        while (!isAvailable) {
            console.log(
                `Campsite not available yet. Trying again in ${WAIT_AVAILABLE /
                    1000 /
                    60} minutes...`
            );
            isAvailable = await tryAfter(WAIT_AVAILABLE, checkIfAvailable);
        }
        return isAvailable;
    }

    async function waitForBookNowButton() {
        await page.waitForFunction(
            selector =>
                document.querySelector(selector).getAttribute('disabled') ===
                null,
            { polling: 250 },
            sel.bookNowButton
        );
    }

    async function clickBookNowButton() {
        await page.click(sel.bookNowButton);
    }

    async function selectTrip({ clickBookNow } = { clickBookNow: true }) {
        console.log(`Starting selectDates with clickBookNow: ${clickBookNow}`);
        if (!lengthOfStay || !startDayHandle) return;
        await startDayHandle.click();
        if (lengthOfStay > 1) {
            const tableColumn = tablePadding + lengthOfStay;
            const endDayHandle = await page.evaluateHandle(
                getEndDayHandle,
                sel.sites,
                siteId,
                tableColumn
            );
            await endDayHandle.click();
        }
        await waitForBookNowButton();
        if (clickBookNow) {
            await clickBookNowButton();
        }
    }

    async function checkIfInCheckout(maybeError) {
        console.log(`Starting checkIfInCheckout`);
        if (maybeError) {
            console.log(`Gotten here because of this error: ${maybeError}`);
        }
        await page.waitForFunction(
            waitForUrlToContain,
            'reservations/orderdetails'
        );
        await page.waitFor(sel.checkoutPage);
        console.log(`SUCCESS!! - You have 15 mins to check out`);
        kaChing();
    }

    async function parseBookableTime() {
        console.log(`Starting parseBookableTime`);
        const text = await page.evaluate(
            getTextFromSelector,
            sel.bookingErrorMessage
        );
        return parseTime(text); // returns moment object
    }

    async function maybeParseBookableTime() {
        console.log(`Starting maybeParseBookableTime`);
        return page
            .waitFor(sel.bookingErrorIcon, { timeout: 20000 }) // 20s timeout
            .then(parseBookableTime) // parse the time when the site will be actually bookable
            .catch(checkIfInCheckout); // we might be actually able to already book
    }

    async function maybeGetBookableTimeAndAwait() {
        console.log('Starting maybeGetBookableTimeAndAwait');
        bookableTime = await maybeParseBookableTime();
        const minutesRefresh = WAIT_REFRESH_BOOKABLE / 60 / 1000;
        const safeSetupTime = bookableTime
            .clone()
            .subtract(MINUTES_TO_GET_READY + minutesRefresh + 1, 'minutes');
        console.log(`\n\n*** bookableTime = ${bookableTime.format()} `);
        console.log(`*** safeSetupTime = ${safeSetupTime.format()} \n\n`);
        while (moment().isBefore(safeSetupTime)) {
            console.log(`Refreshing just to keep the session...\n\n `);
            page.reload();
            console.log(
                `Waiting ${WAIT_REFRESH_BOOKABLE /
                    60 /
                    1000} minutes to refresh again`
            );
            console.log(
                `${moment
                    .duration(bookableTime.diff(moment()))
                    .asMinutes()} minutes left to bookableTime`
            );
            await sleep(WAIT_REFRESH_BOOKABLE);
        }
        console.log(
            `Finished refreshing, now will wait for setupTime! (${MINUTES_TO_GET_READY}mins before bookableTime)`
        );
    }

    async function waitUntilSetupTime() {
        await page.screenshot({
            path: '../screenshots/waitUntilSetupTime.png'
        });
        const setupTime = bookableTime
            .clone()
            .subtract(MINUTES_TO_GET_READY, 'minutes');
        console.log(`\n\n*** setupTime = ${setupTime.format()}\n\n`);
        while (setupTime.isBefore(moment())) {
            await sleep(1000); // check every 1s
            console.log(
                `Waiting for setupTime: ${moment
                    .duration(setupTime.diff(moment()))
                    .asMinutes()}min remaining until ${setupTime.format()}`
            );
        }
        console.log(
            `Finished waiting for setupTime!, now will setup everything and wait to push the book button`
        );
    }

    async function waitUntilBookableTimeAndBook() {
        await page.screenshot({
            path: '../screenshots/waitUntilBookableTimeAndBook.png'
        });
        const clickBookNowTime = bookableTime.clone().subtract(25, 'ms');
        console.log(
            `\n\n*** clickBookNowTime = ${bookableTime.format(
                'HH:mm:ss:sss'
            )}\n\n`
        );
        while (moment().isBefore(clickBookNowTime));
        console.log(
            `${moment().format(
                'HH:mm:ss:sss'
            )} clickBookNowTime! CLICKING "BOOK NOW" BUTTON!`
        );
        await clickBookNowButton();
    }

    try {
        await login();
        await checkUntilAvailable(); // blocking until campsite "available"
        await selectTrip({ clickBookNow: true });
        await maybeGetBookableTimeAndAwait(); // blocking until just before the bookableTime
        await waitUntilSetupTime();
        // here we know that we are a couple of minutes away from bookableTime, so we redo everything
        await checkIfAvailable();
        await selectTrip({ clickBookNow: false });
        await waitUntilBookableTimeAndBook();
        await checkIfInCheckout();
        await page.screenshot({ path: '../screenshots/kaching.png' });
    } catch (e) {
        logError(e);
    }
}
