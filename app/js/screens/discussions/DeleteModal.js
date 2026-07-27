// Previous: none
// Current: 3.6.3

// React & Vendor Libs
const { useState, useEffect } = wp.element;
const { sprintf } = wp.i18n;

// AI Engine
import i18n from '@root/i18n';
import { apiUrl, getRestNonce } from '@app/settings';
import { nekoFetch } from '@app/helpers-admin';
import ConfirmModal from '@app/components/ConfirmModal';

const retrieveDiscussionsTotal = async () => {
  const res = await nekoFetch(`${apiUrl}/discussions/stats`, { nonce: getRestNonce() });
  return res?.total ?? null;
};

// Confirmation for the two destructive actions of the Discussions screen. "Delete All"
// truncates the whole table (every user, every chatbot), so it needs to say so plainly
// rather than the bare "Are you sure?" it used to show.
const DeleteModal = ({ mode, selectedCount = 0, busy, onClose, onConfirm }) => {
  const isAll = mode === 'all';
  const [ total, setTotal ] = useState(null);

  // The table count reflects the current filters and page, but Delete All ignores both,
  // so the real total is fetched instead of reusing what the table happens to show.
  useEffect(() => {
    if (!isAll) {
      return;
    }
    let cancelled = false;
    setTotal(null);
    retrieveDiscussionsTotal()
      .then(value => { if (!cancelled) { setTotal(value); } })
      .catch(() => { if (!cancelled) { setTotal(null); } });
    return () => { cancelled = true; };
  }, [isAll]);

  const count = isAll ? total : selectedCount;

  return (
    <ConfirmModal isOpen={!!mode}
      title={isAll ? i18n.DISCUSSIONS.DELETE_ALL_TITLE : i18n.DISCUSSIONS.DELETE_SELECTED_TITLE}
      warning={i18n.COMMON.CANNOT_BE_UNDONE}
      lines={isAll ? [
        i18n.DISCUSSIONS.DELETE_ALL_SCOPE,
        i18n.DISCUSSIONS.DELETE_ALL_HISTORY,
        i18n.DISCUSSIONS.DELETE_ALL_FILTERS
      ] : [
        i18n.DISCUSSIONS.DELETE_SELECTED_SCOPE,
        i18n.DISCUSSIONS.DELETE_SELECTED_HISTORY
      ]}
      highlight={count === null || count === undefined
        ? i18n.DISCUSSIONS.DELETE_COUNT_UNKNOWN
        : sprintf(i18n.DISCUSSIONS.DELETE_COUNT, count)}
      footnote={isAll ? i18n.DISCUSSIONS.DELETE_ALL_BACKUP : null}
      confirmLabel={isAll ? i18n.COMMON.DELETE_EVERYTHING : i18n.COMMON.DELETE}
      busy={busy}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};

export default DeleteModal;
