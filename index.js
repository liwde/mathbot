const mjAPI = require('mathjax-node-svg2png');
mjAPI.config({
  MathJax: {
    // traditional MathJax configuration
  }
});
mjAPI.start();

dataUriToBuffer = require('data-uri-to-buffer');
Jimp = require('jimp');

const Telegraf = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * Config
 * BOT_TOKEN will be taken from environment variables
 */
const mathMarker = "/math";
const welcomeMessages = [
    'Hi!',
    'Schick mir TeX-formatierte Mathematik mit dem vorangestellten Befehl `/math` und ich antworte dir mit der hübsch gesetzten Formel. Der Befehl `/help` zeigt eine ausführlichere Hilfe.'
];
const helpMessages = [
    'Probier es einfach mal aus:\n```\n/math \\nabla w_{pq}=-\\eta\\frac{\\partial E}{\\partial w_{pq}}\n```',
    'Den vollen unterstützten Befehlssatz findest du unter http://docs.mathjax.org/en/latest/tex.html'
];


if (process.env.MATOMO_URL) {
    const usage = require('./usage');
    bot.use(usage);
    helpMessages.push('Wenn du den Bot mit dem Befehl `/math` benutzt, wird anonym gezählt, dass du den Bot genutzt hat, wie lange die Generierung gedauert hat und welche Sprache in Telegram eingestellt ist – _zu keinem Zeitpunkt wird dein Name, Nutzername, deine Nutzer-ID oder die von dir gesetzte Formel gespeichert_. Diese Aufstellung hilft mir dabei, potentielle Probleme aufzudecken und zu sehen, wie weit verbreitet der Bot ist.\nWenn du das nicht magst, kannst du aber auch gerne die ungetrackte Version `/math*` verwenden.');
}

/**
 * Main Handler Function: Bot hears text starting with mathMarker --> trim message, create png, respond
 */
bot.hears(text => text.startsWith(mathMarker), async function(ctx) {
    try {
        const markerLength = ctx.message.text[mathMarker.length] === '*' ? mathMarker.length + 1 : mathMarker.length; // handle *
        const tex = ctx.message.text.substr(markerLength).trim();
        if (!tex) return;
        let png = await typesetMaths(tex);
        png = await scaleBox(png);
        await ctx.replyWithPhoto({ source: png });
    } catch (errors) {
        // one error at a time
        if (Array.isArray(errors)) {
            return await ctx.reply(errors[0]).catch(onError);
        }
        onError(errors);
    }
});

/**
 * Bot Start & Help --> Send out Messages
 */
bot.start((ctx) => {
    return sendMultipleMessages(ctx, welcomeMessages);
});
bot.help((ctx) => {
    return sendMultipleMessages(ctx, helpMessages);
});

// required for group chat
bot.telegram.getMe().then((botInfo) => {
    bot.options.username = botInfo.username
});


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

/**
 * Generic Error Handler. Logs errors to STDERR 
 * @param {Error} err 
 */
function onError(err) {
    console.error(err);
}

/**
 * Send multiple consecutive messages (by chaining the reply-Promises).
 * This function already catches send errors
 * @param {Telegraf Context} ctx Context on which replies shall be sent
 * @param {string} aMsg Array of Markdown-formatted messages
 */
function sendMultipleMessages(ctx, aMsg) {
    return aMsg.reduce((acc, msg) => {
        return acc.then(() => ctx.replyWithMarkdown(msg));
    }, Promise.resolve()).catch(onError);
}

bot.startPolling();
console.log('Bot started');
