// Previous: none
// Current: 3.7.3

// The post editor canvas lives in an iframe: always since WordPress 7.1, and before
// that only when every registered block was apiVersion 3 or higher. The iframe has
// its own document and window, so looking a block up in the admin document finds
// nothing, and reading the admin window's selection returns an empty string even
// while the user can plainly see highlighted text.
//
// That is what silently disabled "Suggest Synonyms" and stopped the busy fade from
// showing. Anything reaching into the canvas has to go through these helpers, which
// fall back to the admin document when there is no canvas at all (classic editor,
// widgets screen, older WordPress).

const getCanvasFrame = () => document.querySelector('iframe[name="editor-canvas"]');

export const getCanvasDocument = () => {
  try {
    return getCanvasFrame()?.contentDocument || document;
  }
  catch (e) {
    return document;
  }
};

export const getCanvasWindow = () => {
  try {
    return getCanvasFrame()?.contentWindow || window;
  }
  catch (e) {
    return window;
  }
};

// The text the user selected in the editor, wherever the canvas happens to live.
// The admin window is still consulted as a fallback, so a selection made outside an
// iframed canvas keeps working exactly as it did before.
export const getSelectedText = () => {
  const canvasText = getCanvasWindow().getSelection()?.toString() || '';
  return canvasText || window.getSelection()?.toString() || '';
};
