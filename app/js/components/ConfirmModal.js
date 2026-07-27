// Previous: none
// Current: 3.6.3

// React & Vendor Libs
const { useState, useEffect } = wp.element;

// NekoUI
import { NekoButton, NekoModal, NekoMessage, NekoInput } from '@neko-ui';

// AI Engine
import i18n from '@root/i18n';

/**
 * Shared confirmation dialog for destructive actions.
 *
 * Replaces window.confirm(), which could only show one line and gave no room to
 * explain what is actually about to be lost. Keep the copy specific: say what is
 * removed, who else it affects, and whether it can be recovered.
 *
 * The safe choice is the OK button (NekoModal binds Enter to it), so hitting Enter
 * cancels. The destructive action is a separate red button.
 *
 * Pass confirmPhrase for the worst actions: the user must type it before the red
 * button unlocks, which stops a reflex click from wiping something irreplaceable.
 */
const ConfirmModal = ({
  isOpen,
  title,
  warning = null,       // Red banner. Omit for a confirmation that loses nothing.
  lines = [],           // Paragraphs explaining the consequences.
  highlight = null,     // Emphasised line, typically the count or the target name.
  footnote = null,      // Smaller aside, typically a suggestion to back up first.
  confirmPhrase = null, // When set, the user must type this before confirming.
  confirmLabel = null,
  confirmClassName = 'danger',
  busy = false,
  onClose,
  onConfirm
}) => {
  const [ typed, setTyped ] = useState('');

  // Always start from an empty field, so a phrase typed for one action can never
  // carry over and unlock the next one.
  useEffect(() => {
    setTyped('');
  }, [isOpen, confirmPhrase]);

  const phraseMatches = !confirmPhrase ||
    typed.trim().toLowerCase() === String(confirmPhrase).trim().toLowerCase();

  return (
    <NekoModal isOpen={!!isOpen}
      title={title}
      onRequestClose={busy ? undefined : onClose}
      okButton={{
        label: i18n.COMMON.CANCEL,
        className: 'secondary',
        disabled: busy,
        onClick: onClose
      }}
      customButtons={
        <NekoButton className={confirmClassName} disabled={busy || !phraseMatches}
          onClick={onConfirm}>
          {confirmLabel ?? i18n.COMMON.DELETE}
        </NekoButton>
      }
      content={<>
        {warning && <NekoMessage variant="danger" style={{ marginBottom: 15 }}>
          <b>{warning}</b>
        </NekoMessage>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lines.filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
          {highlight && <div style={{ fontWeight: 'bold' }}>{highlight}</div>}
          {footnote && <div style={{ opacity: 0.75, fontSize: 13 }}>{footnote}</div>}
          {confirmPhrase && <div>
            <div style={{ marginBottom: 6 }}>
              {i18n.COMMON.TYPE_TO_CONFIRM} <b>{confirmPhrase}</b>
            </div>
            <NekoInput value={typed} disabled={busy}
              placeholder={confirmPhrase}
              onChange={value => setTyped(value ?? '')} />
          </div>}
        </div>
      </>}
    />
  );
};

export default ConfirmModal;
