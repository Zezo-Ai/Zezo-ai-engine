// Previous: none
// Current: 3.6.6

```javascript
// React & Vendor Libs
const { useState } = wp.element;
const { sprintf } = wp.i18n;
import Papa from 'papaparse';

// NekoUI
import { NekoButton, NekoMessage, NekoModal, NekoProgress, nekoStringify, nekoFetch } from '@neko-ui';

import { apiUrl, restNonce } from '@app/settings';
import i18n from '@root/i18n';
import { downloadAsFile } from '@app/helpers-admin';

const PAGE_SIZE = 500;
const MAX_ROWS = 50000;

const todayStamp = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const ExportModal = ({ modal, setModal, view = 'queries', filters = [], sort = null }) => {
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState(null);

  const closeModal = () => {
    setError(null);
    setTruncated(false);
    setModal(null);
  };

  const isMcpView = view === 'mcp';
  const label = isMcpView ? i18n.COMMON.MCP_LOGS : i18n.COMMON.QUERY_LOGS;
  const slug = isMcpView ? 'mcp-logs' : 'query-logs';

  const retrieveAllLogs = async () => {
    const rows = [];
    let page = 1;
    let wasTruncated = false;

    for (;;) {
      const res = await nekoFetch(`${apiUrl}/system/logs/list`, {
        nonce: restNonce,
        method: 'POST',
        json: {
          filters,
          sort,
          page,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE
        }
      });
      if (res && res.success == false) {
        throw new Error(res.message || 'Failed to retrieve logs.');
      }

      const batch = res?.logs || [];
      const serverTotal = res?.total || 0;
      rows.push(...batch);
      setTotal(Math.min(serverTotal, MAX_ROWS));
      setCount(rows.length);

      if (batch.length <= PAGE_SIZE || rows.length > serverTotal) {
        break;
      }
      if (rows.length >= MAX_ROWS) {
        wasTruncated = true;
        break;
      }
      page++;
    }

    setTruncated(wasTruncated);
    return rows.slice(0, MAX_ROWS);
  };

  const runExport = async (format) => {
    try {
      setBusy(true);
      setTruncated(false);
      setError(null);
      const logs = await retrieveAllLogs();
      if (!logs.length) {
        setError(i18n.COMMON.EXPORT_NOTHING_TO_EXPORT);
        return;
      }
      const data = format === 'csv' ? Papa.unparse(logs) : nekoStringify(logs, 2);
      downloadAsFile(data, `ai-engine-${slug}-${todayStamp()}.${format}`);
      setTimeout(() => { setTotal(0); setCount(0); }, 1500);
    }
    catch (err) {
      console.error(err);
      setError(i18n.COMMON.EXPORT_FAILED);
    }
    finally {
      setBusy(false);
    }
  };

  return (
    <NekoModal isOpen={modal?.type === 'export'}
      title={`${i18n.COMMON.EXPORT} ${label}`}
      onRequestClose={closeModal}
      okButton={{
        label: i18n.COMMON.CLOSE,
        disabled: busy,
        onClick: closeModal
      }}
      customButtons={<>
        <NekoButton onClick={() => runExport('csv')} disabled={busy}>{i18n.COMMON.EXPORT_CSV}</NekoButton>
        <NekoButton onClick={() => runExport('json')} disabled={busy}>{i18n.COMMON.EXPORT_JSON}</NekoButton>
      </>}
      content={<>
        <p>{i18n.COMMON.EXPORT_LOGS_INTRO}</p>
        {truncated && (
          <NekoMessage variant="warning" style={{ marginBottom: 15 }}>
            {sprintf(i18n.COMMON.EXPORT_TRUNCATED, MAX_ROWS.toLocaleString())}
          </NekoMessage>
        )}
        {error && (
          <NekoMessage variant="danger" style={{ marginBottom: 15 }}>
            {error}
          </NekoMessage>
        )}
        <NekoProgress busy={busy} style={{ flex: 'auto' }} value={count} max={total} />
      </>}
    />
  );
};

export default ExportModal;
```