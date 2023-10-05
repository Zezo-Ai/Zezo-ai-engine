// Previous: 1.8.5
// Current: 1.9.87

/* eslint-disable no-undef */
const prefix = mwai.prefix;
const domain = mwai.domain;
const restUrl = mwai.rest_url.replace(/\/+$/, "");
const apiUrl = mwai.api_url.replace(/\/+$/, "");
const pluginUrl = mwai.plugin_url.replace(/\/+$/, "");
const userData = mwai.user_data;
const isPro = mwai.is_pro === '1';
const isRegistered = isPro && mwai.is_registered === '1';
const restNonce = mwai.rest_nonce;
const options = mwai.options;
const session = mwai.session;
const themes = mwai.themes;
const stream = !!mwai.stream;
const chatbots = mwai.chatbots;

export { prefix, domain, apiUrl, restUrl, pluginUrl, userData, isPro, stream,
  isRegistered, restNonce, session, options, themes, chatbots };
