// Previous: 3.2.2
// Current: 3.6.3

/**
 * StandardMessages Component
 *
 * Visual: scrollable message list with optional shortcuts and blocks inside the scroll area.
 * Used when `messagesType === 'standard'`.
 * Maintenance: if the messages container styling changes, ensure theme CSS
 * for `.mwai-conversation` and scrollbar tweaks are kept in sync.
 */
const { useRef, useEffect } = wp.element;
import ChatbotReply from '../../ChatbotReply';

// Translation fallback for frontend where wp.i18n isn't available
const __ = (text) => {
  if (typeof wp !== 'undefined' && wp.i18n && wp.i18n.__) {
    return wp.i18n.__(text, 'ai-engine');
  }
  return text;
};

const StandardMessages = ({ messages, conversationRef, onScroll, shortcuts, blocks }) => {
  // Process messages
  const messageList = messages.map((message, index) => {
    return (
      <ChatbotReply
        key={index}
        message={message}
        conversationRef={conversationRef}
      />
    );
  });

  // A bot without a start sentence used to open as a dead empty box; give it a
  // subtle hint instead. Themes can restyle or hide it via .mwai-empty-hint.
  const isEmpty = messages.length === 0;

  return (
    <div ref={conversationRef} className="mwai-conversation" onScroll={onScroll}>
      {isEmpty && (
        <div className="mwai-empty-hint" style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'center', height: '100%', opacity: 0.45, fontSize: '0.95em',
          textAlign: 'center', padding: 20 }}>
          {__('Ask me anything!')}
        </div>
      )}
      {messageList}
      {shortcuts}
      {blocks}
    </div>
  );
};

export default StandardMessages;
