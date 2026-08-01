// Previous: 3.6.3
// Current: 3.6.9

```javascript
// React & Vendor Libs
const { useMemo, useState, useEffect, useCallback } = wp.element;
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { compiler } from 'markdown-to-jsx';

// NekoUI
import { NekoCheckbox, NekoTable, NekoPaging, NekoButton, NekoSplitView, NekoSplitButton, NekoMessage,
  NekoBlock, NekoIcon } from '@neko-ui';

// AI Engine
import i18n from '@root/i18n';
import { apiUrl, getRestNonce, chatbots as initChatbots } from '@app/settings';
import { retrieveDiscussions, tableDateTimeFormatter, tableUserIPFormatter, nekoFetch } from '@app/helpers-admin';
import { nekoStringify } from '@neko-ui';
import ExportModal from './ExportModal';
import DeleteModal from './DeleteModal';
import { retrieveChatbots } from '@app/requests';

const setLocalSettings = ({ isSidebarCollapsed }) => {
  const currentSettings = getLocalSettings();
  const settings = {
    isSidebarCollapsed: isSidebarCollapsed !== undefined ? isSidebarCollapsed : currentSettings.isSidebarCollapsed
  };
  localStorage.setItem('mwai-admin-discussions', nekoStringify(settings));
};

const getLocalSettings = () => {
  const localSettingsJSON = localStorage.getItem('mwai-admin-discussions');
  try {
    const parsedSettings = JSON.parse(localSettingsJSON);
    return {
      isSidebarCollapsed: parsedSettings?.isSidebarCollapsed ?? false
    };
  }
  catch (e) {
    return {
      isSidebarCollapsed: false
    };
  }
};

const getRoleColors = (role) => {
  switch (role) {
    case 'user':
      return { label: 'var(--neko-green)', background: '#f3fff3' };
    case 'assistant':
      return { label: 'var(--neko-purple)', background: '#f9f3ff' };
    case 'system':
      return { label: 'var(--neko-yellow)', background: '#fffdf3' };
    default:
      return { label: 'var(--neko-gray-50)', background: 'white' };
  }
};

const StyledContext = styled.div`
  font-size: 12px;
  padding: 2px 8px;
  background: ${props => props.$colors?.label || '#616161'};
  color: white;
  border-radius: 3px 3px 0 0;
`;

const StyledType = styled.span`
  font-weight: bold;
  text-transform: uppercase;
  font-size: 10px;
`;

const StyledEmbedding = styled.div`
  font-size: 12px;
  color: white;
  background: var(--neko-purple);
  opacity: 0.65;
  padding: 4px 8px;
`;

const StyledToolCalls = styled.div`
  font-size: 12px;
  color: white;
  background: var(--neko-blue);
  opacity: 0.75;
  padding: 4px 8px;
`;

const StyledToolCallDetails = styled.pre`
  margin: 4px 0 2px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow: auto;
`;

const ToolCalls = ({ toolCalls, style }) => {
  const [expanded, setExpanded] = useState(null);

  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return null;
  }

  return (
    <StyledToolCalls style={style}>
      {toolCalls.map((toolCall, i) => {
        const isExpanded = expanded === i;
        const args = toolCall?.arguments && typeof toolCall.arguments === 'object' ? toolCall.arguments : {};
        const argNames = Object.keys(args);
        return (
          <div key={i}>
            <div onClick={() => setExpanded(isExpanded ? null : i)} style={{ cursor: 'pointer' }}>
              {toolCall?.success === false && <span title={i18n.COMMON.ERROR}>⚠ </span>}
              <span style={{ fontWeight: 600 }}>{toolCall?.name}</span>
              <span style={{ opacity: 0.85 }}> ({argNames.join(', ')})</span>
            </div>
            {isExpanded && <StyledToolCallDetails>
              {nekoStringify(args, 2)}
              {toolCall?.result ? `\n\n→ ${toolCall.result}` : ''}
            </StyledToolCallDetails>}
          </div>
        );
      })}
    </StyledToolCalls>
  );
};

const StyledMessageWrapper = styled.div`
  font-size: ${props => props.$bubble ? '15px' : '13px'};
  padding: ${props => props.$bubble ? '15px 20px' : '10px'};
  border: 1px solid #eaeaea;
  border-top: ${props => props.$bubble ? '1px solid #eaeaea' : 'none'};
  background: ${props => props.$background || 'white'};
  color: #333333;
  word-break: break-word;
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
  border-radius: ${props => props.$bubble ? '12px' : '0 0 3px 3px'};
  box-shadow: ${props => props.$bubble ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none'};

  p, ul, ol, li, span, div, a, strong, em, blockquote, table, td, th {
    font-size: ${props => props.$bubble ? '15px' : '13px'} !important;
  }

  pre, code {
    font-size: ${props => props.$bubble ? '13px' : '12px'} !important;
  }

  ul, ol {
    margin-left: 15px;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  a {
    color: #333333;
    text-decoration: underline;
  }

  a:hover {
    color: #333333;
    text-decoration: none;
  }

  blockquote {
    border-left: 4px solid #dddddd;
    padding-left: 10px;
    margin-left: 0;
    font-style: italic;
  }

  pre {
    background: #eeeeee;
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;
    text-wrap: pretty;
  }

  code {
    background: #eeeeee;
    padding: 2px 5px;
    border-radius: 5px;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 10px;
  }
  
  table td, table th {
    border: 1px solid #dddddd;
    text-align: left;
    padding: 5px;
  }

  table tr:nth-child(even) {
    background-color: #dddddd;
  }

  .mwai-dead-image {
    color: #9e9e9e;
    background: #ededed;
    padding: 8px 8px;
    text-align: center;
  }
`;

const options = {
  disableParsingRawHTML: true
};

const StyledMessage = ({ content, background, bubble }) => {
  const [ processedContent, setProcessedContent ] = useState(content || '');

  const checkImageURL = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(false);
      img.onerror = () => resolve(true);
      img.src = url;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const cleanMessage = async (markdownContent) => {
      const regex = /!\[.*?\]\((.*?)\)/g;
      let newContent = markdownContent;
      let match;
      while ((match = regex.exec(markdownContent)) !== null) {
        const imageUrl = match[1];
        const isImageAvailable = await checkImageURL(imageUrl);
        if (cancelled) { return; }
        if (!isImageAvailable) {
          const placeholder = `_Image not available_`;
          newContent = newContent.replace(match[0], placeholder);
        }
      }
      if (!cancelled) { setProcessedContent(newContent); }
    };

    setProcessedContent(content || '');
    if (content) {
      cleanMessage(content);
    }

    return () => { cancelled = true; };
  }, [content]);

  const renderedContent = useMemo(() => {
    let out = "";
    try {
      let processed = processedContent;
      const codeBlocks = [];
      processed = processed.replace(/```[\s\S]*?```/g, (match) => {
        codeBlocks.push(match);
        return `MWAICB${codeBlocks.length - 1}MWAI`;
      });
      const inlineCode = [];
      processed = processed.replace(/`[^`]+`/g, (match) => {
        inlineCode.push(match);
        return `MWAIIC${inlineCode.length - 1}MWAI`;
      });
      processed = processed.replace(/(?<=[A-Za-z0-9])_(?=[A-Za-z0-9])/g, '\\_');
      codeBlocks.forEach((block, i) => {
        processed = processed.replace(`MWAICB${i}MWAI`, () => block);
      });
      inlineCode.forEach((code, i) => {
        processed = processed.replace(`MWAIIC${i}MWAI`, () => code);
      });
      out = compiler(processed, options);
    }
    catch (e) {
      console.error("Crash in markdown-to-jsx! Reverting to plain text.", { e, processedContent });
      out = processedContent;
    }
    return out;
  }, [processedContent]);

  return (
    <StyledMessageWrapper $background={background} $bubble={bubble}>
      {renderedContent}
    </StyledMessageWrapper>
  );
};

const Message = ({ message, variant = 'panel' }) => {
  const role = message.role || message.type;
  const colors = getRoleColors(role);
  const embeddings = message?.extra?.embeddings ? message?.extra?.embeddings : (
    message?.extra?.embedding ? [message?.extra?.embedding] : []
  );
  const toolCalls = message?.extra?.toolCalls || [];
  const shortcutName = message?.shortcutName;
  const shortcutPrompt = message?.shortcutPrompt;
  const [showPrompt, setShowPrompt] = useState(false);

  if (variant === 'bubble') {
    const isUser = role === 'user';
    return (
      <div style={{ display: 'flex', flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: colors.label, margin: '0 6px 5px' }}>
          {role}{shortcutName && ' (shortcut)'}
        </div>
        <div style={{ maxWidth: '82%', minWidth: 100 }}>
          {Array.isArray(embeddings) && embeddings.length > 0 && <StyledEmbedding
            style={{ borderRadius: 8, marginBottom: 5 }}>
            {embeddings.map(embedding => <div key={embedding.id}>
              <span>{embedding.title}</span> (<span>{(embedding.score.toFixed(4) / 100).toFixed(2)}</span>)
            </div>)}
          </StyledEmbedding>}
          <ToolCalls toolCalls={toolCalls} style={{ borderRadius: 8, marginBottom: 5 }} />
          {shortcutName ? <div style={{
            padding: '12px 16px', background: colors.background || '#f5f5f5',
            border: '1px solid #eaeaea', borderRadius: 12
          }}>
            <span onClick={shortcutPrompt ? () => setShowPrompt(!showPrompt) : undefined} style={{
              display: 'inline-block', padding: '4px 12px', fontSize: 12, fontWeight: 500,
              background: colors.label || '#888', color: 'white', borderRadius: 12, opacity: 0.7,
              cursor: shortcutPrompt ? 'pointer' : 'default'
            }}>{shortcutName}</span>
            {showPrompt && shortcutPrompt && <div style={{
              marginTop: 8, fontSize: 12, color: '#555', fontStyle: 'italic'
            }}>{shortcutPrompt}</div>}
          </div> : <StyledMessage content={message.content || message.text}
            background={colors.background} bubble />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
      <StyledContext $colors={colors}>
        <StyledType>{role}{shortcutName && ' (shortcut)'}</StyledType>
      </StyledContext>
      {Array.isArray(embeddings) && embeddings.length > 0 && <StyledEmbedding>
        {embeddings.map(embedding => <div key={embedding.id}>
          <span>{embedding.title}</span> (<span>{(embedding.score.toFixed(4) * 100).toFixed(2)}</span>)
        </div>)}
      </StyledEmbedding>}
      <ToolCalls toolCalls={toolCalls} />
      {shortcutName ? <div style={{
        padding: '8px 10px', background: colors.background || '#f5f5f5',
        border: '1px solid #eaeaea', borderTop: 'none',
        borderRadius: showPrompt ? 0 : '0 0 3px 3px'
      }}>
        <span onClick={shortcutPrompt ? () => setShowPrompt(!showPrompt) : undefined} style={{
          display: 'inline-block', padding: '4px 12px', fontSize: 12, fontWeight: 500,
          background: colors.label || '#888', color: 'white', borderRadius: 12, opacity: 0.7,
          cursor: shortcutPrompt ? 'pointer' : 'default'
        }}>{shortcutName}</span>
      </div> : <StyledMessage content={message.content || message.text} background={colors.background} />}
      {showPrompt && shortcutPrompt && <div style={{
        padding: '8px 10px', fontSize: 12, color: '#555',
        background: '#f9f9f9', border: '1px solid #eaeaea', borderTop: 'none',
        borderRadius: '0 0 3px 3px', fontStyle: 'italic'
      }}>{shortcutPrompt}</div>}
    </div>
  );
};

const deleteDiscussions = async (chatIds = []) => {
  const res = await nekoFetch(`${apiUrl}/discussions/delete`, { nonce: getRestNonce(), method: 'POST', json: { chatIds } });
  return res;
};

const Discussions = () => {
  const queryClient = useQueryClient();
  const [ modal, setModal ] = useState({ type: null, data: null });
  const [ deleteMode, setDeleteMode ] = useState(null);
  const [ busyAction, setBusyAction ] = useState(false);
  const [ autoRefresh, setAutoRefresh ] = useState(false);
  const [ isSidebarCollapsed, setIsSidebarCollapsed ] = useState(() => getLocalSettings().isSidebarCollapsed);
  const [ isFullView, setIsFullView ] = useState(false);

  const { data: chatbots } = useQuery({
    queryKey: ['chatbots'], queryFn: retrieveChatbots, initialData: initChatbots
  });

  useEffect(() => {
    setLocalSettings({ isSidebarCollapsed });
  }, [isSidebarCollapsed]);

  const chatsColumns = useMemo(() => {
    return [
      {
        accessor: 'updated', title: 'Time', width: '95px', sortable: true
      },
      {
        accessor: 'user', title: 'User', width: '125px',
        filters: {
          type: 'text',
          description: i18n.HELP.USER_FILTER
        },
      },
      {
        accessor: 'botId', title: 'Chatbot', width: '100px',
        filters: {
          type: 'select',
          options: Array.isArray(chatbots) ? chatbots.map(x => ({ value: x.botId, label: x.name })) : []
        },
      },
      {
        accessor: 'preview', title: i18n.COMMON.PREVIEW, width: '100%',
        filters: {
          type: 'text'
        },
      },
      {
        accessor: 'messages', title: '#', width: '45px'
      },
    ];
  }, [chatbots]);

  const [ filters, setFilters ] = useState(() => {
    return chatsColumns.filter(v => v.filters).map(v => {
      return { accessor: v.accessor, value: null };
    });
  });
  const [ selectedIds, setSelectedIds ] = useState([]);

  const [ chatsQueryParams, setChatsQueryParams ] = useState({
    filters: filters,
    sort: { accessor: 'updated', by: 'desc' }, page: 1, limit: 10
  });

  const refreshDiscussions = useCallback(async () => {
    return await retrieveDiscussions(chatsQueryParams);
  }, [chatsQueryParams]);

  const { isFetching: isFetchingChats, data: chatsData, error: chatsError } = useQuery({
    queryKey: ['chats', JSON.stringify(chatsQueryParams)], queryFn: refreshDiscussions,
    refetchInterval: autoRefresh ? 1000 * 5 : null
  });

  useEffect(() => {
    setChatsQueryParams({ ...chatsQueryParams, filters: filters });
  }, [filters]);

  const chatsTotal = useMemo(() => {
    return chatsData?.total || 0;
  }, [chatsData]);

  const chatsRows = useMemo(() => {
    if (!chatsData?.chats) {
      return [];
    }

    return chatsData.chats
      .sort((a, b) => new Date(a.updated) - new Date(b.updated))
      .map(chat => {
        const messages = JSON.parse(chat.messages);
        const extra = JSON.parse(chat.extra);
        const formattedCreated = tableDateTimeFormatter(chat.created);
        const formattedUpdated = tableDateTimeFormatter(chat.updated);

        const user = tableUserIPFormatter(chat.userId ?? extra?.userId, chat.ip ?? extra?.ip);
        const userMessages = messages?.filter(m => m.role === 'user' || m.type === 'user');
        const messagePreview = (m) =>
          m.content || m.text || (m.shortcutName ? `[${m.shortcutName}]` : '');
        const firstExchange = userMessages?.length ? messagePreview(userMessages[0]) : '';
        const lastExchange = userMessages?.length ? messagePreview(userMessages[userMessages.length - 1]) : '';

        const foundChatbot = chatbots?.find(c => c.botId == chat.botId);

        const parentBotId = extra?.parentBotId;
        const foundParent = parentBotId
          ? chatbots?.find(c => c.botId === parentBotId)
          : null;

        let displayName;
        let overrideIcon = null;

        if (foundChatbot) {
          displayName = foundChatbot.name;
        } else if (foundParent) {
          displayName = foundParent.name;
          overrideIcon = <NekoIcon icon="tools" height="14"
            style={{ position: 'relative', top: 2, marginRight: 2 }} tooltip="Overriden Bot" />;
        } else {
          displayName = <><NekoIcon icon="cog" height="14"
            style={{ position: 'relative', top: 2, marginRight: 2 }} tooltip="Custom Bot" />Custom</>;
        }

        const jsxPreview = chat.title ? (
          <>
            <div>{chat.title}</div>
            <small>
              <i>{firstExchange}</i>
            </small>
          </>
        ) : (
          <>
            <div>{firstExchange}</div>
            <small>{lastExchange}</small>
          </>
        );

        return {
          id: chat.id,
          botId: (
            <>
              <div>
                {overrideIcon}
                {displayName}
              </div>
              <div>
                <small>{chat.botId}</small>
              </div>
            </>
          ),
          user: user,
          messages: messages?.length ?? 0,
          preview: jsxPreview,
          extra: extra.model,
          created: <div style={{ textAlign: 'right' }}>{formattedCreated}</div>,
          updated: <div style={{ textAlign: 'right' }}>{formattedUpdated}</div>
        };
      });
  }, [chatsData, chatbots]);


  const discussion = useMemo(() => {
    if (selectedIds?.length >= 1) {
      const currentDiscussion = chatsData?.chats.find(x => x.id === selectedIds[0]);
      if (!currentDiscussion) { return null; }
      let messages = [];
      let extra = {};
      try {
        messages = JSON.parse(currentDiscussion.messages);
        extra = JSON.parse(currentDiscussion.extra);
      }
      catch (e) {
        console.error("Could not parse discussion messages or extra.", { e, currentDiscussion });
      }
      return {
        id: currentDiscussion.id,
        chatId: currentDiscussion.chatId,
        botId: currentDiscussion.botId,
        title: currentDiscussion.title,
        messages: messages,
        extra: extra,
        created: currentDiscussion.created,
        updated: currentDiscussion.updated
      };
    }
    return null;
  }, [selectedIds, chatsData]);

  useEffect(() => {
    if (isFullView && !discussion) {
      setIsFullView(false);
    }
  }, [isFullView, discussion]);

  useEffect(() => {
    if (!isFullView) { return; }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullView(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFullView]);

  const onConfirmDelete = async () => {
    setBusyAction(true);
    try {
      if (deleteMode === 'all') {
        await deleteDiscussions();
      }
      else {
        const selectedChats = chatsData?.chats.filter(x => selectedIds.includes(x.id));
        const selectedChatIds = selectedChats.map(x => x.chatId);
        await deleteDiscussions(selectedChatIds);
        setSelectedIds([]);
      }
      await queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.refetchQueries({ queryKey: ['chats'] });
    }
    finally {
      setBusyAction(false);
      setDeleteMode(null);
    }
  };

  const jsxPaging = useMemo(() => {
    return (<div>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <NekoPaging currentPage={chatsQueryParams.page} limit={chatsQueryParams.limit}
          onCurrentPageChanged={(page) => setChatsQueryParams({ ...chatsQueryParams, page })}
          total={chatsTotal} onClick={page => {
            setChatsQueryParams({ ...chatsQueryParams, page });
          }}
        />
        <NekoButton className="primary" style={{ marginLeft: 5 }}
          onClick={() => { setModal({ type: 'export', data: {} }); }}>
          {i18n.COMMON.EXPORT}
        </NekoButton>
      </div>
    </div>);
  }, [ chatsQueryParams, chatsTotal ]);

  const emptyMessage = useMemo(() => {
    if (chatsError?.message) {
      return <NekoMessage variant="danger" style={{ margin: "5px 5px" }}>
        <b>{chatsError.message}</b><br />
        <small>Check your Console Logs and PHP Error Logs for more information.</small>
      </NekoMessage>;
    }
    return null;
  }, [chatsError]);

  const formattedCreated = tableDateTimeFormatter(discussion?.created);
  const formattedUpdated = tableDateTimeFormatter(discussion?.updated);

  if (isFullView && discussion) {
    const metaChip = (label, value) => (
      <span key={label} style={{ display: 'inline-flex', gap: 5, alignItems: 'baseline',
        fontSize: 12, color: '#50575e', background: '#f0f2f5',
        border: '1px solid #e2e6ea', borderRadius: 999, padding: '3px 11px' }}>
        <b style={{ color: '#3c434a' }}>{label}</b> {value}
      </span>
    );
    return (
      <NekoBlock className="primary" title={discussion.title || i18n.COMMON.DISCUSSION} action={
        <NekoButton className="secondary" onClick={() => setIsFullView(false)}>
          {i18n.COMMON.BACK}
        </NekoButton>
      }>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 28 }}>
          {metaChip('Bot', discussion.botId)}
          {discussion.extra?.model && metaChip('Model', discussion.extra.model)}
          {metaChip('Created', discussion.created)}
          {metaChip('Updated', discussion.updated)}
          {metaChip('Messages', discussion.messages?.length ?? 0)}
        </div>
        {Array.isArray(discussion.messages) &&
          discussion.messages.map((x, i) => <Message key={`${discussion.id}-${i}`} message={x} variant="bubble" />)}
      </NekoBlock>
    );
  }

  return (<>

    <NekoSplitView
      mainFlex={2}
      sidebarFlex={1}
      minimal
      isCollapsed={isSidebarCollapsed}
      onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      showToggle={false}
    >

      <NekoSplitView.Main>

        <NekoBlock className="primary" title={i18n.COMMON.DISCUSSIONS} action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {!autoRefresh && <NekoButton className="secondary"
              disabled={isFetchingChats}
              onClick={async () => {
                await queryClient.invalidateQueries({ queryKey: ['chats'] });
              }}>{i18n.COMMON.REFRESH}</NekoButton>}
            {selectedIds.length > 0 && (
              <NekoButton className="danger" disabled={busyAction}
                onClick={() => setDeleteMode('selected')}>
                {i18n.COMMON.DELETE}
              </NekoButton>
            )}
            <NekoSplitButton
              isCollapsed={isSidebarCollapsed}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              border="left"
              direction="right"
            />
          </div>
        }>

          <NekoTable busy={(!autoRefresh && isFetchingChats) || busyAction}
            sort={chatsQueryParams.sort}
            onSortChange={(accessor, by) => {
              setChatsQueryParams({ ...chatsQueryParams, sort: { accessor, by } });
            }}
            emptyMessage={emptyMessage}
            filters={filters}
            onFilterChange={(accessor, value) => {
              const freshFilters = [
                ...filters.filter(x => x.accessor !== accessor),
                { accessor, value }
              ];
              setFilters(freshFilters);
            }}
            data={chatsError ? [] : chatsRows} columns={chatsColumns}
            selectedItems={selectedIds}
            onSelectRow={id => {
              if (selectedIds.length === 1 && selectedIds[0] === id) {
                setSelectedIds([]);
                return;
              }
              setSelectedIds([id]);
            }}
            onSelect={ids => { setSelectedIds([ ...selectedIds, ...ids  ]); }}
            onUnselect={ids => { setSelectedIds([ ...selectedIds.filter(x => !ids.includes(x)) ]); }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <NekoButton className="danger" disabled={selectedIds.length || busyAction}
              style={{ marginRight: 10 }}
              onClick={() => setDeleteMode('all')}>
              {i18n.COMMON.DELETE_ALL}
            </NekoButton>
            <NekoCheckbox name="auto-refresh" label={"Auto Refresh"} value="1" checked={autoRefresh}
              style={{ width: 180 }}
              onChange={() => setAutoRefresh(!autoRefresh)} />
            <div style={{ flex: 'auto' }} />
            {jsxPaging}
          </div>

        </NekoBlock>

      </NekoSplitView.Main>

      <NekoSplitView.Sidebar>

        <NekoBlock className="primary" title="Selected Discussion" maxHeight={400} action={
          discussion ? <NekoButton className="secondary" onClick={() => setIsFullView(true)}>
            {i18n.COMMON.FULL_SCREEN}
          </NekoButton> : null
        }>

          {!discussion && <div style={{ textAlign: 'center', padding: 10 }}>
            No discussion selected.
          </div>}

          {Array.isArray(discussion?.messages) &&
            discussion.messages.map((x, i) => <Message key={i} message={x} />)}

        </NekoBlock>

        {!!discussion && <NekoBlock className="primary" title="Information" maxHeight={300}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Model</div>
              <div>{discussion?.extra?.model}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Bot ID</div>
              <div>{discussion?.botId}</div>
            </div>
          </div>
          {(discussion?.extra?.parentBotId || discussion?.extra?.assistantId || discussion?.extra?.threadId) && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
              {discussion?.extra?.parentBotId && <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Parent Bot ID</div>
                <div>{discussion?.extra?.parentBotId}</div>
              </div>}
              {discussion?.extra?.assistantId && <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Assistant ID</div>
                <div>{discussion?.extra?.assistantId}</div>
              </div>}
              {discussion?.extra?.threadId && <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Thread ID</div>
                <div>{discussion?.extra?.threadId}</div>
              </div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Chat ID</div>
              <div>{discussion?.chatId}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Session</div>
              <div>{discussion?.extra?.session}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Created</div>
              <div>{formattedCreated}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Updated</div>
              <div>{formattedUpdated}</div>
            </div>
          </div>
          {discussion?.extra?.context && <div style={{ marginBottom: 5 }}>
            <div style={{ fontWeight: 'bold' }}>Context</div>
            <div>{discussion?.extra?.context}</div>
          </div>}
        </NekoBlock>}

      </NekoSplitView.Sidebar>

    </NekoSplitView>

    <ExportModal modal={modal} setModal={setModal} busy={busyAction} />

    <DeleteModal mode={deleteMode} selectedCount={selectedIds.length} busy={busyAction}
      onClose={() => setDeleteMode(null)} onConfirm={onConfirmDelete} />

  </>);
};

export default Discussions;
```