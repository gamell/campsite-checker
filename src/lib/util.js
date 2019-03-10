const player = require('play-sound')({});
const moment = require('moment');

// adds leading zeros if needed
const zeroify = num => (num < 10 ? `0${num}` : `${num}`);

// calculates the date in the format needed by the website
exports.calculateDateString = dateInput => {
    const date = new Date(dateInput);
    const month = zeroify(date.getUTCMonth() + 1);
    const day = zeroify(date.getUTCDate());
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
};

// Jackpot!
exports.kaChing = () => player.play('./ka-ching.mp3');

const callLater = (callback, ms) =>
    new Promise(resolve =>
        setTimeout(() => {
            resolve(callback());
        }, ms)
    );

exports.callLater = callLater;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.sleep = sleep;

exports.logError = e => console.error(`ERROR \n\n ${e}`);

const randBetween = (min, max) =>
    Math.floor(Math.random() * (max - min + 1) + min);

exports.moveMouseRandomlyFor = async (page, ms) => {
    const { width, height } = page.viewport();
    const { mouse } = page;
    const moveUntil = moment().add(ms, 'ms');
    let x = randBetween(0, width);
    let y = randBetween(0, height);
    const direction = { x: 1, y: 1 };
    while (moment().isBefore(moveUntil)) {
        await mouse.move(x, y, { steps: 100 });
        // Max move only 1% of the width + height each iteration
        const maxMove = Math.floor((width + height) * 0.01);
        const moveX = randBetween(0, maxMove);
        const moveY = randBetween(0, maxMove);
        const { x: xDir, y: yDir } = direction;
        x =
            x + moveX * xDir > width
                ? (direction.x *= -1) && x - moveX
                : x + moveX;
        y =
            y + moveY * yDir > height
                ? (direction.y *= -1) && y - moveY
                : y + moveY;
    }
    return true;
};

/*  eslint-disable no-return-await */
exports.humanType = async (page, sel, text) => {
    await page.click(sel);
    await page.focus(sel);
    const charArr = text.split('');
    while (charArr.length > 0) {
        const char = charArr.shift();
        await sleep(randBetween(50, 210));
        await page.keyboard.type(char);
    }
};
/*  eslint-enable no-return-await */

// group [1] will be the time i.e. 10AM
// group [2] will be the Timezone (might need clipping)
const BOOKING_TIME_REGEX = /(\d{1,2}(?:\:\d{2})?(?:AM|PM))\s+(?:(\w+) Time)/;

exports.parseTime = text => {
    const [_, time, timeZone] = text.match(BOOKING_TIME_REGEX);
    // if we can't figure out the timeZone, fail
    if (!time || !timeZone.trim().indexOf('Eastern') <= 0) {
        throw new Error("Can't parse the bookable time");
    }
    return moment.parseZone(`${time} -05:00`, 'HHA ZZ');
};
