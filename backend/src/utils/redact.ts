/** Removes credentials that live in URLs (signed media token, Telegram webhook secret, token/code query values) before logging. */
export const redactUrl = (url: string): string =>
  url
    .replace(/(\/media\/stream\/)[^/?]+/, "$1[redacted]")
    .replace(/(\/telegram\/webhook\/)[^/?]+/, "$1[redacted]")
    .replace(/([?&](?:token|code)=)[^&]+/gi, "$1[redacted]");
