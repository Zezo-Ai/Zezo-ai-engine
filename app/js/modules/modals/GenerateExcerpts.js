// Previous: 1.9.88
// Current: 2.5.0

// React & Vendor Libs
const { useState, useEffect, useMemo } = wp.element;

// NekoUI
import { NekoWrapper, NekoModal, NekoSpinner } from '@neko-ui';
import { nekoFetch } from '@neko-ui';

// AI Engine
import { apiUrl, restNonce } from '@app/settings';
import { Result, ResultsContainer } from '../../styles/ModalStyles';

const GenerateExcerptsModal = (props) => {
  const { post, onExcerptClick = {}, onClose = {} } = props;
  const [excerpts, setExcerpts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (post) {
      fetchExcerpts(post);
    }
  }, [post]);

  const fetchExcerpts = async ({ postId }) => {
    setBusy(true);
    try {
      const res = await nekoFetch(`${apiUrl}/ai/magic_wand`, {
        method: 'POST',
        nonce: restNonce,
        json: { action: 'suggestExcerpts', data: { postId } }
      });
      setExcerpts(res.data?.results);
    }
    catch (err) {
      console.error(err);
      setError(err.message);
    }
    setBusy(false);
  };

  const onClick = async (title) => {
    setBusy(true);
    try {
      await onExcerptClick(title);
      cleanClose();
    }
    catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const cleanClose = async () => {
    onClose();
    setExcerpts([]);
    setError();
    setBusy(false);
  };

  const content = useMemo(() => {
    if (busy) {
      return (<NekoSpinner type="circle" size="10%" />);
    }
    else if (error) {
      return (<>Error: {error}</>);
    }
    else if (excerpts?.length > 0) {
      return (<>
        Pick a new excerpt by clicking on it.
        <ResultsContainer>
          {excerpts.map(x =>
            <Result key={x} onClick={() => { onClick(x); }}>{x}</Result>
          )}
        </ResultsContainer>
      </>);
    }
    else {
      return (<>Nothing to display.</>);
    }
  }, [busy, excerpts, error]);

  return (
    <NekoWrapper>
      <NekoModal isOpen={post} onRequestClose={cleanClose}
        title={`New excerpt for "${post?.postTitle}"`}
        content={content}
        okButton={{
          label: "Close",
          onClick: cleanClose
        }}
      />
    </NekoWrapper>
  );
};

export default GenerateExcerptsModal;
