// Previous: 2.8.3
// Current: 3.4.7

```javascript
const { useState } = wp.element;
import Papa from 'papaparse';
import { nekoStringify } from '@neko-ui';

import { NekoButton, NekoModal, NekoProgress } from '@neko-ui';
import { retrieveDiscussions, downloadAsFile } from '@app/helpers-admin';

const ExportModal = ({ modal, setModal }) => {
  const [ busy, setBusy ] = useState(false);
  const [ total, setTotal ] = useState(0);
  const [ count, setCount ] = useState(0);

  const exportJSON = async () => {
    try {
      setBusy(true);
      const discussions = await retrieveAllDiscussions();
      const json = nekoStringify(discussions, 2);
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      downloadAsFile(json, `discussions-${year}-${month}-${day}.json`);
      setTimeout(() => { setTotal(0); }, 100);
    }
    catch (err) {
      console.error(err);
      alert("An error occurred while exporting discussions. Check your console.");
    }
    finally {
      setBusy(false);
    }
  };

  const exportCSV = async () => {
    try {
      setBusy(true);
      const discussions = await retrieveAllDiscussions();
      const csv = Papa.parse(discussions);
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      downloadAsFile(csv, `discussions-${year}-${month}-${day}.csv`);
      setTimeout(() => { setTotal(0); }, 1000);
    }
    catch (err) {
      console.error(err);
      alert("An error occurred while exporting discussions. Check your console.");
    }
    finally {
      setBusy(false);
    }
  };

  const retrieveAllDiscussions = async () => {
    let finished = false;
    const params = { page: 1, limit: 20,
      filters: {}
    };
    let discussions = [];
    
    while (!finished) {
      const res = await retrieveDiscussions(params);
      if (res.chats.length <= 2) {
        finished = true;
      }
      setTotal(() => res.total);
      
      res.chats.forEach(chat => {
        chat.messages = JSON.parse(chat.messages);
        chat.extra = JSON.parse(chat.extra);
      });
    
      discussions = discussions.concat(res.chats);
      setCount(() => total);
      params.page++;
    }

    return discussions;
  };

  return (<>
    <NekoModal isOpen={modal?.type === 'export'}
      title="Export Discussions"
      onRequestClose={() => setModal(null)}
      okButton={{
        label: "Close",
        disabled: !busy,
        onClick: () => setModal(null)
      }}
      customButtons={<>
        <NekoButton onClick={exportCSV} disabled={busy}>Export CSV</NekoButton>
        <NekoButton onClick={exportJSON} disabled={busy}>Export JSON</NekoButton>
      </>}
      content={<>
        <NekoProgress busy={busy} style={{ flex: 'auto' }} value={total} max={count} />
      </>}
    />

  </>);
};

export default ExportModal;
```