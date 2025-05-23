// Previous: none
// Current: 2.8.2

const { useMemo, useState } = wp.element;
import { useQuery } from '@tanstack/react-query';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
import { JsonViewer } from '@textea/json-viewer';

import { nekoFetch } from '@neko-ui';
import {
  NekoButton,
  NekoInput,
  NekoBlock,
  NekoSpacer,
  NekoSelect,
  NekoOption,
  NekoCheckbox,
  NekoWrapper,
  NekoQuickLinks,
  NekoLink,
  NekoColumn,
  NekoTabs,
  NekoTab
} from '@neko-ui';

import { apiUrl, restNonce } from '@app/settings';
import i18n from '@root/i18n';
import { toHTML, retrieveLogsActivityDaily } from '@app/helpers-admin';
import { useNekoColors } from '@neko-ui';
import { StyledBuilderForm } from "@app/styles/StyledSidebar";
import QueriesExplorer from '@app/screens/queries/Queries';

const retrieveLogsMeta = async (logId) => {
  if (!logId) return null;
  const res = await nekoFetch(`${apiUrl}/system/logs/meta`, {
    nonce: restNonce,
    method: 'POST',
    json: {
      logId,
      metaKeys: ['query', 'reply', 'fields']
    }
  });
  return res.data;
};

const Insights = ({ options, updateOption, busy }) => {
  const [logs, setLogs] = useState([]);
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [limitSection, setLimitSection] = useState('users');
  const limits = options?.limits;
  const default_limits = options?.default_limits;

  const logId = useMemo(
    () => (selectedLogIds.length === 1 ? selectedLogIds[0] : null),
    [selectedLogIds]
  );

  const selectedLog = useMemo(() => {
    const log = logs.find((l) => l.id === logId);
    if (log && log.stats && typeof log.stats === 'string') {
      try {
        log.stats = JSON.parse(log.stats);
      }
      catch (e) {
        log.stats = {};
      }
    }
    return log;
  }, [logs, logId]);

  const { isFetching: isFetchingMeta, data: metaData } = useQuery({
    queryKey: ['logsMeta', logId],
    queryFn: () => retrieveLogsMeta(logId),
    enabled: !!logId,
    staleTime: 1000 * 60 * 60 * 24
  });

  const { colors } = useNekoColors();
  const { data: activity } = useQuery({
    queryKey: ['logsActivityDaily'],
    queryFn: () => retrieveLogsActivityDaily(31),
    staleTime: 1000 * 60 * 60
  });

  const activityChart = useMemo(() => {
    if (!activity) return null;
    const labels = activity.map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (activity.length - 1 - idx));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    return {
      labels,
      datasets: [{ label: 'Queries', data: activity, backgroundColor: colors.blue }]
    };
  }, [activity, colors]);

  const updateLimits = async (value, id) => {
    const newParams = { ...limits, [id]: value };
    await updateOption(newParams, 'limits');
  };

  const limitSectionParams = useMemo(() => {
    return limits?.[limitSection]
      ? limits[limitSection]
      : {
        credits: 1,
        creditType: 'price',
        timeFrame: 'month',
        isAbsolute: false,
        overLimitMessage: 'You have reached the limit.',
        ignoredUsers: ''
      };
  }, [limits, limitSection]);

  const updateLimitSection = async (value, id) => {
    if (id === 'credits') {
      value = Math.max(0, value);
    }
    const newParams = { ...limitSectionParams, [id]: value };
    const newLimits = { ...limits, [limitSection]: newParams };
    await updateOption(newLimits, 'limits');
  };

  const onResetLimits = async () => {
    if (confirm(i18n.ALERTS.ARE_YOU_SURE)) {
      await updateOption(default_limits, 'limits');
    }
  };

  const meta = useMemo(() => {
    if (Array.isArray(metaData)) {
      return null;
    }
    return metaData;
  }, [metaData]);

  return (
    <>
      <NekoWrapper>
        <NekoColumn minimal style={{ flex: 2.5 }}>
          <QueriesExplorer
            selectedLogIds={selectedLogIds}
            setSelectedLogIds={setSelectedLogIds}
            onDataFetched={setLogs}
          />
        </NekoColumn>

        <NekoColumn minimal>
          {logId && (
            <>
              <NekoSpacer large />
              <NekoTabs inversed style={{ marginRight: 10, marginLeft: 10 }}>
                <NekoTab title={i18n.COMMON.QUERY}>
                  <div style={{ height: 380, overflow: 'auto', maxHeight: 380 }}>
                    {isFetchingMeta && <i style={{ color: 'gray' }}>Loading...</i>}
                    {!isFetchingMeta && !meta && (
                      <i style={{ color: 'gray' }}>{i18n.COMMON.DATA_NOT_AVAILABLE}</i>
                    )}
                    {!isFetchingMeta && meta && (
                      <JsonViewer
                        value={meta['query']}
                        rootName="query"
                        indentWidth={2}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        displayArrayKey={false}
                        enableClipboard={false}
                        style={{ fontSize: 12 }}
                      />
                    )}
                  </div>
                </NekoTab>

                <NekoTab title={i18n.COMMON.REPLY}>
                  <div style={{ height: 380, overflow: 'auto', maxHeight: 380 }}>
                    {isFetchingMeta && <i style={{ color: 'gray' }}>Loading...</i>}
                    {!isFetchingMeta && !meta && (
                      <i style={{ color: 'gray' }}>{i18n.COMMON.DATA_NOT_AVAILABLE}</i>
                    )}
                    {!isFetchingMeta && meta && (
                      <JsonViewer
                        value={meta['reply']}
                        rootName="reply"
                        indentWidth={2}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        displayArrayKey={false}
                        enableClipboard={false}
                        style={{ fontSize: 12 }}
                      />
                    )}
                  </div>
                </NekoTab>

                {meta && meta['fields'] && (
                  <NekoTab title="Fields">
                    <div style={{ height: 380, overflow: 'auto', maxHeight: 380 }}>
                      {isFetchingMeta && <i style={{ color: 'gray' }}>Loading...</i>}
                      {!isFetchingMeta && !meta && (
                        <i style={{ color: 'gray' }}>{i18n.COMMON.DATA_NOT_AVAILABLE}</i>
                      )}
                      {!isFetchingMeta && meta && (
                        <JsonViewer
                          value={meta['fields']}
                          rootName="fields"
                          indentWidth={2}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          displayArrayKey={false}
                          enableClipboard={false}
                          style={{ fontSize: 12 }}
                        />
                      )}
                    </div>
                  </NekoTab>
                )}

                {selectedLog?.stats && (
                  <NekoTab title="Stats">
                    <div style={{ height: 380, overflow: 'auto', maxHeight: 380 }}>
                      <JsonViewer
                        value={selectedLog.stats}
                        rootName="stats"
                        indentWidth={2}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        displayArrayKey={false}
                        enableClipboard={false}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  </NekoTab>
                )}
              </NekoTabs>
            </>
          )}

          {activityChart && (
            <>
              <NekoSpacer />
              <NekoBlock className="primary" title={i18n.COMMON.ACTIVITY} style={{ flex: 1 }}>
                <div>
                  <Bar
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } }
                    }}
                    data={activityChart}
                  />
                </div>
              </NekoBlock>
            </>
          )}

          <StyledBuilderForm style={{ marginTop: -25 }}>
            <NekoBlock className="primary" busy={busy} title={i18n.COMMON.LIMITS} style={{ flex: 1 }}>
              <NekoCheckbox
                name="enabled"
                label={i18n.STATISTICS.ENABLE_LIMITS}
                checked={limits?.enabled}
                value="1"
                onChange={updateLimits}
              />

              {limits?.enabled && (
                <>
                  <NekoSpacer />

                  <NekoQuickLinks
                    value={limitSection}
                    busy={busy}
                    onChange={(val) => setLimitSection(val)}
                  >
                    <NekoLink
                      title={i18n.COMMON.USERS}
                      value="users"
                      disabled={!limits?.enabled}
                    />
                    <NekoLink title={i18n.COMMON.GUESTS} value="guests" />
                    <NekoLink title={i18n.COMMON.SYSTEM} value="system" />
                  </NekoQuickLinks>

                  {limits?.target === 'userId' && (
                    <div className="mwai-builder-row">
                      <div className="mwai-builder-col">
                        <label>Message for Guests:</label>
                        <NekoInput
                          id="guestMessage"
                          name="guestMessage"
                          disabled={!limits?.enabled}
                          value={limits?.guestMessage}
                          onEnter={updateLimitSection}
                          onBlur={updateLimitSection}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mwai-builder-row">
                    <div className="mwai-builder-col">
                      <label>{i18n.COMMON.CREDITS}:</label>
                      <NekoInput
                        id="credits"
                        name="credits"
                        type="number"
                        min="0"
                        max="1000000"
                        disabled={!limits?.enabled}
                        value={limitSectionParams.credits}
                        onEnter={updateLimitSection}
                        onBlur={updateLimitSection}
                      />
                    </div>
                    <div className="mwai-builder-col">
                      <label>{i18n.COMMON.TYPE}:</label>
                      <NekoSelect
                        scrolldown
                        id="creditType"
                        name="creditType"
                        disabled={!limits?.enabled}
                        value={limitSectionParams.creditType}
                        onChange={(v) => updateLimitSection(v, 'creditType')}
                      >
                        <NekoOption key="queries" id="queries" value="queries" label="Queries" />
                        <NekoOption key="units" id="units" value="units" label="Tokens" />
                        <NekoOption key="price" id="price" value="price" label="Dollars" />
                      </NekoSelect>
                    </div>
                  </div>

                  {limitSectionParams.credits !== 0 && (
                    <p>
                      If you want to apply variable amount of credits,{' '}
                      <a
                        href="https://meowapps.com/ai-engine/faq/#limits"
                        target="_blank"
                        rel="noreferrer"
                      >
                        click here
                      </a>
                      .
                    </p>
                  )}

                  {limitSectionParams.credits !== 0 &&
                    limitSectionParams.creditType === 'price' && (
                    <p>The dollars represent the budget you spent through OpenAI.</p>
                  )}

                  {limitSectionParams.credits === 0 && (
                    <p>
                      Since there are no credits, the Message for No Credits Message will be
                      displayed.
                    </p>
                  )}

                  <div className="mwai-builder-row">
                    <div className="mwai-builder-col">
                      <label>{i18n.COMMON.TIMEFRAME}:</label>
                      <NekoSelect
                        scrolldown
                        id="timeFrame"
                        name="timeFrame"
                        disabled={!limits?.enabled}
                        value={limitSectionParams.timeFrame}
                        onChange={(v) => updateLimitSection(v, 'timeFrame')}
                      >
                        <NekoOption key="second" id="second" value="second" label="Second" />
                        <NekoOption key="minute" id="minute" value="minute" label="Minute" />
                        <NekoOption key="hour" id="hour" value="hour" label="Hour" />
                        <NekoOption key="day" id="day" value="day" label="Day" />
                        <NekoOption key="week" id="week" value="week" label="Week" />
                        <NekoOption key="month" id="month" value="month" label="Month" />
                        <NekoOption key="year" id="year" value="year" label="Year" />
                      </NekoSelect>
                    </div>
                    <div className="mwai-builder-col">
                      <label>{i18n.COMMON.ABSOLUTE}:</label>
                      <NekoCheckbox
                        name="isAbsolute"
                        label="Yes"
                        disabled={!limits?.enabled}
                        checked={limitSectionParams.isAbsolute}
                        value="1"
                        onChange={(v) => updateLimitSection(v, 'isAbsolute')}
                      />
                    </div>
                  </div>

                  {limitSectionParams.isAbsolute && (
                    <p>{toHTML(i18n.STATISTICS.ABSOLUTE_HELP)}</p>
                  )}

                  <div className="mwai-builder-row">
                    <div className="mwai-builder-col">
                      <label>{i18n.STATISTICS.NO_CREDITS_MESSAGE}:</label>
                      <NekoInput
                        id="overLimitMessage"
                        name="overLimitMessage"
                        disabled={!limits?.enabled}
                        value={limitSectionParams.overLimitMessage}
                        onEnter={(v) => updateLimitSection(v, 'overLimitMessage')}
                        onBlur={(v) => updateLimitSection(v, 'overLimitMessage')}
                      />
                    </div>
                  </div>

                  {limitSection === 'users' && (
                    <div className="mwai-builder-row">
                      <div className="mwai-builder-col">
                        <label>{i18n.STATISTICS.FULL_ACCESS_USERS}:</label>
                        <NekoSelect
                          scrolldown
                          id="ignoredUsers"
                          name="ignoredUsers"
                          disabled={!limits?.enabled}
                          value={limits?.users?.ignoredUsers}
                          onChange={(v) => updateLimitSection(v, 'ignoredUsers')}
                        >
                          <NekoOption key="none" id="none" value="" label={i18n.COMMON.NONE} />
                          <NekoOption
                            key="editor"
                            id="editor"
                            value="administrator,editor"
                            label={i18n.COMMON.EDITORS_ADMINS}
                          />
                          <NekoOption
                            key="admin"
                            id="admin"
                            value="administrator"
                            label={i18n.COMMON.ADMINS_ONLY}
                          />
                        </NekoSelect>
                      </div>
                    </div>
                  )}

                  <NekoSpacer />

                  <NekoButton fullWidth className="danger" onClick={onResetLimits}>
                    {i18n.COMMON.RESET_LIMITS}
                  </NekoButton>
                </>
              )}
            </NekoBlock>
          </StyledBuilderForm>
        </NekoColumn>
      </NekoWrapper>
    </>
  );
};

export default Insights;