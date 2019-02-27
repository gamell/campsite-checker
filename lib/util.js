const player = require('play-sound')({});

// adds leading zeros if needed
const zeroify = (num) => num < 10 ? `0${num}` : `${num}`;

// calculates the date in the format needed by the website
const calculateDateString = (dateInput) => {
  const date = new Date(dateInput);
  const month = zeroify(date.getUTCMonth() + 1);
  const day = zeroify(date.getUTCDate());
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

// Jackpot!
const kaChing = () => player.play('ka-ching.mp3');

const tryAfter = (ms, callback) => new Promise(resolve => setTimeout(() => {
  resolve(callback());
}, ms))

const logInfo = (info) => console.log(info);

const utils = {
  calculateDateString,
  kaChing,
  tryAfter
}

module.exports = utils;