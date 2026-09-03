// Previous: none
// Current: 3.7.5

// Every link from the plugin admin to our own sites carries UTM tags, so the
// admin shows up as an acquisition channel in analytics instead of hiding in
// "Direct". Source and medium stay fixed; the campaign names the admin surface
// (discover = Modules tab showcase, setup = Setup Assistant, chatbots = Chatbots
// tab) and the content names the link itself.

export const VIBE_SITE = 'https://vibewithwp.ai';
export const WORKSPACE_SITE = 'https://workspace.press/';

export const outboundUrl = (url, campaign, content) => {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=ai-engine&utm_medium=plugin&utm_campaign=${campaign}&utm_content=${content}`;
};
