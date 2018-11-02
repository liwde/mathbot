const mjAPI = require('mathjax-node-svg2png');
mjAPI.config({
  MathJax: {
    // traditional MathJax configuration
  }
});
mjAPI.start();

dataUriToBuffer = require('data-uri-to-buffer');

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

/**
 * Main Handler Function: Bot hears text starting with mathMarker --> trim message, create png, respond
 */
bot.hears(text => text.startsWith(mathMarker), async function(ctx) {
    try {
        const tex = ctx.message.text.substr(mathMarker.length).trim();
        if (!tex) return;
        const png = await typesetMaths(tex);
        await ctx.replyWithPhoto({ source: png });
    } catch (errors) {
        // one error at a time
        if (Array.isArray(errors)) {
            await ctx.reply(errors[0]).catch(onError);
        }
        onError(error);
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
