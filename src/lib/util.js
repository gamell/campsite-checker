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
exports.kaChing = () => player.play('../../ka-ching.mp3');

exports.tryAfter = (ms, callback) =>
    new Promise(resolve =>
        setTimeout(() => {
            resolve(callback());
        }, ms)
    );

exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.logError = e => console.error(`ERROR \n\n ${e}`);

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
