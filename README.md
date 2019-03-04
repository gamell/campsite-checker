# campsite-checker
Simple CLI tool to check for coveted camping spots. You can finish the booking manually once the script finds the open camping spot.

# Usage

Run `npm install`

Configure the script by filling the `config.json` file

Then just `node index.js`

Parameters:

- `campsiteId`
- `date`: in any of the formats supported by [`Date.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse)
- `siteId`: optionally, specify the site you want. It should be a 3-character String. Defaults to `001`
- `wait`: time in ms to wait before checks. Defaults to 10 minutes

Example:

`node index.js 232491 2019-04-19 002`