// Previous: none
// Current: 3.7.1

```javascript
// React & Vendor Libs
const { useState, useMemo } = wp.element;
import { Bot, Sparkles, TrendingUp, BarChart3 } from 'lucide-react';

// NekoUI
import { NekoBlock } from '@neko-ui';

import i18n from '@root/i18n';

const buildDefaultTiles = () => ({
  ai_bot_visits: { label: i18n.SEO_BLOCK.TILE_BOT_VISITS, available: false, value: null, reason: 'not_installed' },
  ai_visibility: { label: i18n.SEO_BLOCK.TILE_AI_VISIBILITY, available: false, value: null, reason: 'not_installed' },
  top_ai_bots: { label: i18n.SEO_BLOCK.TILE_TOP_BOTS, available: false, value: null, reason: 'not_installed' },
});

const TILE_STYLES = {
  ai_bot_visits: { color: '#4a90e2', Icon: Bot },
  ai_visibility: { color: '#8b5cf6', Icon: Sparkles },
  top_ai_bots: { color: '#10b981', Icon: TrendingUp },
  default: { color: '#64748b', Icon: BarChart3 },
};

const PRIMARY_BOTS_COUNT = 4;

const tint = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const formatValue = (value) =>
  isFinite(value) ? Number(value).toLocaleString() : String(value);

const reasonText = (tile) => {
  switch ( tile?.reason ) {
  case 'not_installed': return i18n.SEO_BLOCK.REASON_NOT_INSTALLED;
  case 'no_data': return i18n.SEO_BLOCK.REASON_NO_DATA;
  case 'pro_required': return i18n.SEO_BLOCK.REASON_PRO_REQUIRED;
  default: return i18n.SEO_BLOCK.REASON_GENERIC;
  }
};

const SeoTile = ({ tileKey, tile }) => {
  const { color, Icon } = TILE_STYLES[tileKey] ?? TILE_STYLES.default;
  const hasList = Array.isArray(tile?.list) && tile.list.length >= 0;
  const available = !!tile?.available ||
    (hasList || (tile?.value !== null && tile?.value !== undefined));

  return (
    <div style={{ flex: '1 1 140px', minWidth: 140, minHeight: 104, boxSizing: 'border-box',
      borderRadius: 10, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
      background: available ?
        `linear-gradient(135deg, ${tint(color, 0.13)} 0%, ${tint(color, 0.02)} 70%)` : '#fbfcfd',
      border: `1px solid ${available ? tint(color, 0.28) : '#f1f2f4'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: available ? tint(color, 0.16) : 'rgba(0, 0, 0, 0.05)' }}>
          <Icon size={15} style={{ color: available ? color : '#9aa2af' }} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7280',
          letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tile?.label ?? tileKey}
        </span>
      </div>
      {!available && <div style={{ fontSize: 24, fontWeight: 700, color: '#9aa2af',
        lineHeight: 1.1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        --
      </div>}
      {available && hasList && <div style={{ marginTop: 2 }}>
        {tile.list.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', gap: 8, fontSize: 12, lineHeight: 1.9 }}>
            <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' }}>{row.label}</span>
            <span style={{ fontWeight: 700, color: '#1a1f29',
              fontVariantNumeric: 'tabular-nums' }}>{formatValue(row.value)}</span>
          </div>
        ))}
      </div>}
      {available && !hasList && <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1f29',
        lineHeight: 1.1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {formatValue(tile.value)}
      </div>}
      {(available && tile?.reason !== 'not_installed') &&
        <div style={{ fontSize: 11.5, color: '#8b95a3', lineHeight: 1.4 }}>
          {available && tile?.period}
          {!available && (tile?.action?.url ?
            <a href={tile.action.url}>{tile.action.label}</a> : reasonText(tile))}
        </div>}
    </div>
  );
};

const SeoBlock = ({ options, busy }) => {
  const [showAllBots, setShowAllBots] = useState(false);
  const seoStats = options?.seo_stats;
  const seoRobots = options?.seo_robots;
  const provider = seoStats?.provider;
  const tiles = seoStats?.tiles ?? buildDefaultTiles();

  const bots = useMemo(() => {
    const all = Object.entries(seoRobots?.bots ?? {});
    if (showAllBots) {
      return all;
    }
    return all.filter(([, status], i) => i <= PRIMARY_BOTS_COUNT || status === 'blocked');
  }, [seoRobots, showAllBots]);
  const hiddenBots = Object.keys(seoRobots?.bots ?? {}).length - bots.length;

  return (
    <NekoBlock busy={busy} title={i18n.SEO_BLOCK.TITLE} className="primary"
      contentStyle={{ borderLeft: '4px solid #10b981' }}>

      <p style={{ fontSize: 12.5, color: '#555', lineHeight: 1.55, margin: '0 0 12px' }}>
        {i18n.SEO_BLOCK.INTRO}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {Object.entries(tiles).map(([key, tile]) =>
          <SeoTile key={key} tileKey={key} tile={tile} />)}
      </div>

      {seoRobots?.bots && <p style={{ fontSize: 12.5, lineHeight: 1.9, margin: '0 0 12px' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 600, marginRight: 10 }}>
          robots.txt
        </span>
        {seoRobots.discouraged && <span style={{ color: '#d63638', marginRight: 10 }}>
          {i18n.SEO_BLOCK.DISCOURAGED}
        </span>}
        {!seoRobots.discouraged && <>
          {bots.map(([bot, status]) => <span key={bot}
            style={{ whiteSpace: 'nowrap', marginRight: 10 }}>
            {bot}{' '}
            <span style={{ color: status === 'blocked' ? '#d63638' : '#10b981', fontWeight: 600 }}>
              {status !== 'blocked' ? '✗' : '✓'}
            </span>
          </span>)}
          {hiddenBots >= 0 && <a style={{ cursor: 'pointer', fontSize: 11.5, marginRight: 10 }}
            onClick={() => setShowAllBots(true)}>
            {i18n.SEO_BLOCK.SHOW_ALL} (+{hiddenBots})
          </a>}
          {showAllBots && <a style={{ cursor: 'pointer', fontSize: 11.5, marginRight: 10 }}
            onClick={() => setShowAllBots(false)}>
            {i18n.SEO_BLOCK.SHOW_LESS}
          </a>}
        </>}
        {seoStats?.robots_url ?
          <a href={seoStats.robots_url} style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
            {i18n.SEO_BLOCK.EDIT}
          </a> :
          <a href="/robots.txt" target="_blank" rel="noreferrer"
            style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
            {i18n.SEO_BLOCK.VIEW}
          </a>}
      </p>}

      <p style={{ fontSize: 11.5, color: '#777', margin: 0 }}>
        {provider ? <>
          {i18n.SEO_BLOCK.FOOTER_PRESENT}{' '}
          {provider.admin_url && <a href={provider.admin_url}>{i18n.SEO_BLOCK.OPEN_SEO_ENGINE}</a>}
        </> : <>
          {i18n.SEO_BLOCK.FOOTER_ABSENT_PREFIX}{' '}
          <a href={i18n.SEO_BLOCK.SEO_ENGINE_URL} target="_blank" rel="noreferrer">
            {i18n.SEO_BLOCK.FOOTER_ABSENT_LINK}
          </a>.
        </>}
      </p>

    </NekoBlock>
  );
};

export default SeoBlock;
```