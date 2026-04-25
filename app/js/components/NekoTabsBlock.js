// Previous: 3.3.7
// Current: 3.4.7

/**
 * NekoTabsBlock
 *
 * Wrapper for NekoTabs used as top-level settings sections alongside
 * NekoBlock. Adds the same 16px bottom margin NekoBlock uses so the two
 * align in a flow without manual spacing.
 */

const NekoTabsBlock = ({ children, style, ...rest }) => {
  return (
    <div style={{ marginBottom: 16, ...style }} {...rest}>
      {children}
    </div>
  );
};

export default NekoTabsBlock;
