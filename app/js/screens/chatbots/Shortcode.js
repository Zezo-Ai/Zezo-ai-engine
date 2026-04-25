// Previous: 2.5.4
// Current: 3.4.7

// React & Vendor Libs
const { useMemo } = wp.element;
import { NekoShortcode } from '@neko-ui';

const sanitizeParamValue = ( value ) => {
  if ( typeof value !== 'string' ) {
    return value;
  }
  return value
    .replace( /"/g, '&quot;' )
    .replace( /'/g, '&#039;' )
    .replace( /\n/g, '\\n' )
    .replace( /\[/g, '&#91;' )
    .replace( /\]/g, '&#93;' );
};

const Shortcode = ({ currentChatbot, isCustom = false, defaultChatbot, style, multiline = false }) => {
  const { params, skipped } = useMemo(() => {
    if (!currentChatbot) return { params: {}, skipped: [] };

    if (!isCustom) {
      return { params: { id: currentChatbot.botId ?? 'default' }, skipped: [] };
    }

    const out = {};
    const skippedKeys = [];
    for (const key in currentChatbot) {
      const value = currentChatbot[key];
      const isDefault = defaultChatbot && defaultChatbot[key] === value;
      const isEmpty = value === undefined || value === null || value === ''
        || (Array.isArray(value) && value.length === 0);
      if (key === 'botId' || key === 'name' || isEmpty || isDefault || typeof value === 'object') {
        if (typeof value === 'object' && Array.isArray(value) && value.length !== 0) {
          skippedKeys.push(key);
        }
        continue;
      }
      const newKey = key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
      out[newKey] = sanitizeParamValue(value);
    }
    return { params: out, skipped: skippedKeys };
  }, [currentChatbot, isCustom, defaultChatbot]);

  if (!currentChatbot) return null;

  return (
    <div style={style}>
      <NekoShortcode prefix="mwai_chatbot" name="chatbot" params={params} multiline={multiline} />
      {skipped.length > 0 && (
        <div style={{ marginTop: 10, color: '#ff4d4f' }}>
          Skipped parameters: {skipped.join(', ')}
        </div>
      )}
    </div>
  );
};

export default Shortcode;
