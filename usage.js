/**
 * Provide a Telegraf Middleware for Simple Usage Tracking in Matomo
 */

const matomoUrl = process.env.MATOMO_URL;
const matomoSiteId = process.env.MATOMO_SITE_ID;
const matomoToken = process.env.MATOMO_TOKEN;

const md5 = require('md5');
const got = require('got');
const parseLocale = require('bcp47').parse;
const { onError } = require('./util');

async function trackingMiddleware(ctx, next) {
    // we only want to handle /math
    let action = getAction(ctx.message);
    if (action === "math") {
        const id = getId(ctx.message);
        const start = new Date();
        await next().catch(onError);
        const ms = new Date() - start;
        // send statistics, but don't wait for the result here
        got(buildRequest(id, action, ctx.message.from.language_code, ms)).catch(onError);
    } else {
        await next().catch(onError);;
    }
}

/**
 * Get the (unique) user id for Matomo
 * Do not use the message.from.id, but hash it for privacy
 * As matomo expects 16 chars, take a substring
 * @param {*} oMessage 
 * @returns {string} _id
 */
function getId(oMessage) {
    return md5(oMessage.from.id).substring(0, 16);
}


/**
 * Extract the bot command from the message
 * @param {*} oMessage 
 * @returns {string} action_name
 */
function getAction(oMessage) {
    const action_entity = oMessage && oMessage.entities && oMessage.entities.find(e => e.offset === 0 && e.type === 'bot_command');
    // we made sure that offset === 0, just strip the '/' and include the optional *
    return action_entity && oMessage.text.substring(1, action_entity.length + 1).trim();
}

/**
 * Build the URL for the Tracking Request on Matomo
 * @param {*} id 
 * @param {*} action 
 * @param {*} lang 
 * @param {*} gt_ms 
 * @returns {string} URL
 */
function buildRequest(id, action, lang, gt_ms) {
    const rand = Math.floor(Math.random()*1000);
    // try to get the country from the language
    lang = lang || '';
    const locale = (parseLocale(lang) || {}).langtag || {};
    const country = (locale.region || (locale.language && locale.language.language) || '').toLowerCase();
    // basic request
    let base = `${matomoUrl}/piwik.php?idsite=${matomoSiteId}&rec=1&action_name=${action}&_id=${id}&rand=${rand}&apiv=1&gt_ms=${gt_ms}&lang=${lang}`;
    // reset IP address as this is total nonsense. also set country (both requires auth_token)
    if (matomoToken) {
        base += `&token_auth=${matomoToken}&cip=0.0.0.0&country=${country}`;
    }
    return base;
}

module.exports = trackingMiddleware;
