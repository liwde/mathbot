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

module.exports.onError = onError;
module.exports.sendMultipleMessages = sendMultipleMessages;
