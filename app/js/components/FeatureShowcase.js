// Previous: none
// Current: 3.7.4

```javascript
// FeatureShowcase.js

import Styled from 'styled-components';
import { NekoBlock, NekoButton } from '@neko-ui';
import {
  Bot, Sparkles, Smartphone,
  Database, PencilLine, Image as ImageIcon, Video, FileText, Search,
  BarChart3, Mic, ShieldAlert, FlaskConical, MessagesSquare, Network
} from 'lucide-react';

const STORAGE_KEY = 'mwai_feature_showcase';

export const isFeatureShowcaseDismissed = () => {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return !!s.dismissed;
  }
  catch (e) { return true; }
};

export const resetFeatureShowcase = () => {
  try { localStorage.removeItem(STORAGE_KEY); }
  catch (e) { /* ignore */ }
};

const track = (url, content) => {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=ai-engine&utm_medium=plugin&utm_campaign=discover&utm_content=${content}`;
};

const SITE = 'https://vibewithwp.ai';

const WAYS = [
  {
    id: 'chatbot',
    icon: Bot,
    title: 'Chatbot',
    sub: 'Chatbots',
    option: 'module_chatbots',
    text: 'Give your visitors someone to talk to. Drop it anywhere with a shortcode or a block, feed it your own content, and it answers from your pages instead of guessing.',
    from: '#2563eb',
    to: '#0ea5e9',
  },
  {
    id: 'mcp',
    icon: Sparkles,
    title: 'Vibecoding',
    sub: 'MCP Server',
    option: 'module_mcp',
    text: 'Hand the keys to Claude, Claude Code or ChatGPT and build your site by talking to it. Write posts, fix SEO, organise media. They sign in with WordPress, so there is no token to share.',
    from: '#7c3aed',
    to: '#c026d3',
  },
  {
    id: 'workspace',
    icon: Smartphone,
    title: 'Mobile AI Chatbot',
    sub: 'Workspace',
    option: 'module_workspace',
    text: 'Your own AI client, running on your own site with your own keys. Full screen in wp-admin, and a free iOS app so your site comes with you. No seat, no subscription.',
    from: '#0d9488',
    to: '#22c55e',
  },
];

const tabUrl = tab => `${window.location.pathname}?page=mwai_settings&nekoTab=${tab}`;
const toolsUrl = page => `${window.location.pathname.replace(/[^/]+$/, 'tools.php')}?page=${page}`;
const rememberSection = section => {
  try { localStorage.setItem('mwai_settings_section', section); }
  catch (e) { /* the tab still opens, just on its previous section */ }
};

const MORE = [
  { id: 'knowledge',    icon: Database,       label: 'Knowledge',     option: 'module_embeddings',        color: 'green',  url: () => tabUrl('knowledge') },
  { id: 'content',      icon: PencilLine,     label: 'Content',       option: 'module_generator_content', color: 'teal',   url: () => toolsUrl('mwai_content_generator') },
  { id: 'images',       icon: ImageIcon,      label: 'Images',        option: 'module_generator_images',  color: 'orange', url: () => toolsUrl('mwai_images_generator') },
  { id: 'videos',       icon: Video,          label: 'Videos',        option: 'module_generator_videos',  color: 'pink',   url: () => toolsUrl('mwai_videos_generator') },
  { id: 'forms',        icon: FileText,       label: 'Forms',         option: 'module_forms',             color: 'red',    url: () => tabUrl('forms') },
  { id: 'search',       icon: Search,         label: 'Search',        option: 'module_search',            color: 'blue',   url: () => tabUrl('search') },
  { id: 'insights',     icon: BarChart3,      label: 'Insights',      option: 'module_statistics',        color: 'green',  url: () => tabUrl('insights') },
  { id: 'discussions',  icon: MessagesSquare, label: 'Discussions',   option: null,                       color: 'blue',   url: () => tabUrl('discussions') },
  { id: 'transcription',icon: Mic,            label: 'Transcription', option: 'module_transcription',     color: 'orange', url: () => tabUrl('transcription') },
  { id: 'moderation',   icon: ShieldAlert,    label: 'Moderation',    option: 'module_moderation',        color: 'red',    url: () => tabUrl('moderation') },
  { id: 'playground',   icon: FlaskConical,   label: 'Playground',    option: 'module_playground',        color: 'purple', url: () => toolsUrl('mwai_dashboard') },
  { id: 'orchestration',icon: Network,        label: 'Orchestration', option: 'module_orchestration',     color: 'purple', url: () => tabUrl('settings'), section: 'orchestration' },
];

const TINTS = {
  blue:   { bg: 'rgba(13, 125, 242, 0.10)',   fg: '#0d7df2' },
  teal:   { bg: 'rgba(72, 199, 190, 0.14)',   fg: '#2ea99f' },
  orange: { bg: 'rgba(240, 160, 48, 0.16)',   fg: '#c87a14' },
  purple: { bg: 'rgba(139, 92, 246, 0.12)',   fg: '#7c3aed' },
  pink:   { bg: 'rgba(236, 72, 153, 0.10)',   fg: '#db2777' },
  green:  { bg: 'rgba(34, 197, 94, 0.12)',    fg: '#16a34a' },
  red:    { bg: 'rgba(239, 68, 68, 0.10)',    fg: '#dc2626' },
};

const Cards = Styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
`;

const Card = Styled.a`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px 16px;
  border-radius: 10px;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, ${props => props.$from} 0%, ${props => props.$to} 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.10);
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover, &:focus {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
    color: #fff;
    text-decoration: none;
  }

  &:active {
    transform: translateY(0);
  }

  &::after {
    content: '';
    position: absolute;
    top: -50px;
    right: -50px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.13);
    pointer-events: none;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 11px;
    position: relative;
    z-index: 1;
  }

  .icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.20);
  }

  .title {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
  }

  .sub {
    display: block;
    font-size: 11px;
    font-weight: 600;
    opacity: 0.75;
    letter-spacing: 0.2px;
    margin-top: 2px;
  }

  .text {
    font-size: 12.5px;
    line-height: 1.6;
    margin: 0;
    opacity: 0.94;
    position: relative;
    z-index: 1;
  }

  .more {
    font-size: 12px;
    font-weight: 700;
    margin-top: auto;
    padding-top: 4px;
    position: relative;
    z-index: 1;
  }

  .state {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 1;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.4px;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
  }

  .state.off {
    background: rgba(0, 0, 0, 0.18);
    color: rgba(255, 255, 255, 0.85);
  }
`;

const Minis = Styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 8px;
  margin-top: 12px;
`;

const Mini = Styled.a`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border-radius: 8px;
  text-decoration: none;
  background: ${props => props.$bg};
  color: ${props => props.$fg};
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  opacity: ${props => props.$off ? 0.4 : 1};
  cursor: ${props => props.$off ? 'default' : 'pointer'};
  filter: ${props => props.$off ? 'grayscale(0.7)' : 'none'};

  &:hover, &:focus {
    color: ${props => props.$fg};
    text-decoration: none;
    transform: ${props => props.$off ? 'none' : 'translateY(-1px)'};
    box-shadow: ${props => props.$off ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.10)'};
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
  }
`;

const Links = Styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
  font-size: 12.5px;

  a {
    color: #2ea99f;
    font-weight: 600;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const Wrap = Styled.div`
  margin-bottom: 15px;
`;

const FeatureShowcase = ({ options, onDismiss }) => {
  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: false })); }
    catch (e) { /* ignore */ }
    onDismiss?.();
  };

  return (
    <Wrap>
      <NekoBlock className="primary" title="What can Engine do?" action={
        <NekoButton className="secondary" onClick={dismiss}
          title="Dismiss this. You can bring it back from Settings → Others → Maintenance.">
          Dismiss
        </NekoButton>
      }>
        <p style={{ fontSize: 12.5, color: '#555', lineHeight: 1.55, margin: '0 0 14px' }}>
          Three ways people use it every day, and everything else a click away.
        </p>

        <Cards>
          {WAYS.map(w => {
            const Icon = w.icon;
            const isOn = !!options?.[w.option];
            return (
              <Card
                key={w.id}
                href={track(w.id === 'workspace' ? 'https://workspace.press/' : `${SITE}/${w.id}`, w.id)}
                target="_blank"
                rel="noreferrer"
                $from={w.from}
                $to={w.to}
              >
                <span className={`state ${isOn ? 'on' : 'off'}`}>{isOn ? 'Active' : 'Off'}</span>
                <span className="head">
                  <span className="icon-wrap"><Icon size={20} strokeWidth={2} /></span>
                  <span className="title">
                    {w.title}
                    <span className="sub">{w.sub}</span>
                  </span>
                </span>
                <p className="text">{w.text}</p>
                <span className="more">Learn more ↗</span>
              </Card>
            );
          })}
        </Cards>

        <Minis>
          {MORE.map(m => {
            const Icon = m.icon;
            const tint = TINTS[m.color] || TINTS.blue;
            const isOn = m.option == null ? false : !!options?.[m.option];
            return (
              <Mini
                key={m.id}
                as={isOn ? 'a' : 'div'}
                href={isOn ? m.url() : undefined}
                onClick={isOn || m.section ? () => rememberSection(m.section) : undefined}
                $bg={tint.bg}
                $fg={tint.fg}
                $off={!isOn}
                title={isOn ? `Open ${m.label}` : `${m.label} is off. Turn it on below.`}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="label">{m.label}</span>
              </Mini>
            );
          })}
        </Minis>

        <Links>
          <a href={track(SITE, 'footer-tour')} target="_blank" rel="noreferrer">Take the tour ↗</a>
          <a href={track(`${SITE}/compare`, 'footer-compare')} target="_blank" rel="noreferrer">How it compares ↗</a>
          <a href={track('https://ai.thehiddendocs.com/', 'footer-docs')} target="_blank" rel="noreferrer">Documentation ↗</a>
        </Links>
      </NekoBlock>
    </Wrap>
  );
};

export default FeatureShowcase;
```