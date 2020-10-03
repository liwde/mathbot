require('console-stamp')(console, { pattern: 'yyyy-mm-dd HH:MM:ss' });

const { onError, sendMultipleMessages } = require('./util');
const { typesetAndScale } = require('./typeset');

const Telegraf = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * Config
 * BOT_TOKEN will be taken from environment variables
 */
const mathMarker = "/math";
const inlineMathMarker = "/im";
const welcomeMessages = [
    'Hi!',
    'Schick mir TeX-formatierte Mathematik mit dem vorangestellten Befehl `/math` und ich antworte dir mit der hübsch gesetzten Formel. Der Befehl `/help` zeigt eine ausführlichere Hilfe.'
];
const helpMessages = [
    'Probier es einfach mal aus:\n```\n/math \\nabla w_{pq}=-\\eta\\frac{\\partial E}{\\partial w_{pq}}\n```',
    'Du kannst auch TeX inline setzen lassen. Starte deine Nachricht mit `/im` und setze die Formeln in Code-Blöcke (mit Markdown)',
    'Den vollen unterstützten Befehlssatz findest du unter http://docs.mathjax.org/en/latest/input/tex/macros/index.html'
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
        const png = await typesetAndScale(tex);
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
 * Inline Math Handler Function: Bot hears text starting with inlineMathMarker --> find math, create pngs, respond
 */
bot.hears(text => text.startsWith(inlineMathMarker), async function(ctx) {
    for (let element of ctx.message.entities) {
        try {
            if (element.type === 'code') {
                const tex = ctx.message.text.substring(element.offset, element.offset + element.length);
                const png = await typesetAndScale(tex);
                await ctx.replyWithPhoto({ source: png });
            }
        } catch (errors) {
            // one error at a time
            if (Array.isArray(errors)) {
                await ctx.reply(errors[0]).catch(onError);
            }
            onError(errors);
        }
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

bot.startPolling();
console.log('Bot started');
