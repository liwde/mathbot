const mjAPI = require('mathjax-node-svg2png');
mjAPI.config({
  MathJax: {
    // traditional MathJax configuration
  }
});
mjAPI.start();

dataUriToBuffer = require('data-uri-to-buffer');
Jimp = require('jimp');

/**
 * Typeset Math into PNG Buffer
 * @param {string} sTeX TeX
 */
async function typesetMaths(sTeX) {
    const math = await mjAPI.typeset({
        math: sTeX,
        format: 'TeX', // or "inline-TeX", "MathML"
        png: true,     // or svg:true, or html:true
        scale: 5
    });
    return dataUriToBuffer(math.png);
}

// Maximum value before the Telegram App starts cropping
// Telegram X has ~2.7, Telegram Android ~2.1
const targetAspectRatio = 2.1;

/**
 * Resizes the Image Buffer so the Mobile Telegram Client won't crop the formula
 * If resizing is necessary, this adds 50% to the runtime :/
 * @param {Buffer} buffer
 * @returns {Buffer} buffer
 */
async function scaleBox(buffer) {
    const image = await Jimp.read(buffer);
    if (image.bitmap.width / image.bitmap.height > targetAspectRatio) {
        // image too wide --> adjust increase height to match maximal aspect ratio
        image.contain(image.bitmap.width, image.bitmap.width / targetAspectRatio);
        return await image.getBufferAsync(Jimp.MIME_PNG);
    }
    // no processing, just return the buffer
    return buffer;
}

async function typesetAndScale(sTeX) {
    const png = await typesetMaths(sTeX);
    return scaleBox(png);
}

module.exports.typesetMaths = typesetMaths;
module.exports.scaleBox = scaleBox;
module.exports.typesetAndScale = typesetAndScale;
