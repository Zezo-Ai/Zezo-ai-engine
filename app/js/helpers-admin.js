// Previous: 2.7.3
// Current: 2.8.2

const { useMemo, useState, useEffect, useRef } = wp.element;
import { NekoMessage, NekoSelect, NekoOption, NekoInput, nekoFetch, toHTML } from '@neko-ui';
import { pluginUrl, apiUrl, restNonce } from '@app/settings';

import i18n from '@root/i18n';

const ENTRY_TYPES = {
  MANUAL: 'manual',
  POST_CONTENT: 'postContent',
  POST_FRAGMENT: 'postFragment'
};

const ENTRY_BEHAVIORS = {
  CONTEXT: 'context',
  REPLY: 'reply',
};

const DEFAULT_VECTOR = {
  title: '',
  content: '',
  refId: null,
  type: ENTRY_TYPES.MANUAL,
  behavior: ENTRY_BEHAVIORS.CONTEXT,
};

const OptionsCheck = ({ options }) => {
  const { ai_envs } = options;

  const isAISetup = ai_envs.find(x => x.apikey && x.apikey.length > 0);
  const pineconeIsOK = !options?.module_embeddings || (options?.embeddings_envs && options?.embeddings_envs.length > 0);

  return (
    <>
      {!isAISetup && <NekoMessage variant="danger" style={{ marginTop: 0, marginBottom: 25 }}>
        {toHTML(i18n.SETTINGS.AI_ENV_SETUP)}
      </NekoMessage>}
      {!pineconeIsOK && <NekoMessage variant="danger" style={{ marginTop: 0, marginBottom: 25 }}>
        {toHTML(i18n.SETTINGS.PINECONE_SETUP)}
      </NekoMessage>}
    </>
  );
};

function cleanSections(text) {
  if (!text) {
    return text;
  }
  const lines = text.split('\n');
  const cleanedLines = lines.map(line => {
    line = line.replace(/^\d+\.\s/, '');
    if (line.startsWith('"')) {
      line = line.slice(1);
      if (line.endsWith('"')) {
        line = line.slice(0, -1);
      }
    }
    return line;
  });
  return cleanedLines.filter(x => x).join('\n');
}

const useLanguages = ({ disabled, options, language: startLanguage, customLanguage: startCustom }) => {
  const [ currentLanguage, setCurrentLanguage ] = useState(startLanguage ?? "en");
  const [ isCustom, setIsCustom ] = useState(false);
  const [ customLanguage, setCustomLanguage ] = useState("");
  const languagesObject = options?.languages || [];

  const languages = useMemo(() => {
    return Object.keys(languagesObject).map((key) => {
      return { value: key, label: languagesObject[key] };
    });
  }, [languagesObject]);

  useEffect(() => {
    if (startCustom) {
      setIsCustom(true);
      setCustomLanguage(startCustom);
    }
    else {
      setIsCustom(false);
      setCustomLanguage("");
      setCurrentLanguage(startLanguage ?? "en");
    }
  }, [startCustom]);

  useEffect(() => {
    setCurrentLanguage(startLanguage);
  }, [startLanguage]);

  useEffect(() => {
    const preferredLanguage = localStorage.getItem('mwai_preferred_language');
    if (preferredLanguage && languages.find(l => l.value === preferredLanguage)) {
      setCurrentLanguage(preferredLanguage);
      return;
    }
    const detectedLanguage = (document.querySelector('html').lang || navigator.language
      || navigator.userLanguage).substr(0, 2);
    if (languages.find(l => l.value === detectedLanguage)) {
      setCurrentLanguage(detectedLanguage);
    }
  }, []);

  const currentHumanLanguage = useMemo(() => {
    if (isCustom) {
      return customLanguage;
    }
    const systemLanguage = languages.find(l => l.value === currentLanguage);
    if (systemLanguage) {
      return systemLanguage.label;
    }
    console.warn("A system language or a custom language should be set.");
    return "English";
  }, [currentLanguage, customLanguage]);

  const onChange = (value, field) => {
    if (value === "custom") {
      setIsCustom(true);
      return;
    }
    setCurrentLanguage(value);
    localStorage.setItem('mwai_preferred_language', value);
  };

  const jsxLanguageSelector = useMemo(() => {
    return (
      <>
        {isCustom && <NekoInput name="customLanguage" disabled={disabled}
          onReset={() => { setIsCustom(false); }}
          description={toHTML(i18n.CONTENT_GENERATOR.CUSTOM_LANGUAGE_HELP)}
          value={customLanguage} onChange={setCustomLanguage} />}
        {!isCustom && <NekoSelect scrolldown name="language" disabled={disabled}
          description={toHTML(i18n.CONTENT_GENERATOR.CUSTOM_LANGUAGE_HELP)}
          value={currentLanguage} onChange={onChange}>
          {languages.map((lang) => {
            return <NekoOption key={lang.value} value={lang.value} label={lang.label} />;
          })}
          <NekoOption key="custom" value="custom" label="Other" />
        </NekoSelect>}
      </>
    );
  }, [currentLanguage, currentHumanLanguage, languages, isCustom]);

  return { jsxLanguageSelector, currentLanguage: isCustom ? 'custom' : currentLanguage,
    currentHumanLanguage, isCustom };
};

const useModels = (options, overrideDefaultEnvId, allEnvs = false) => {
  const [model, setModel] = useState(options?.ai_default_model);
  const warnedModelsRef = useRef(new Set());
  const envId = overrideDefaultEnvId ? overrideDefaultEnvId : options?.ai_default_env;
  const aiEnvs = options?.ai_envs ?? [];

  const allEnvironments = useMemo(() => {
    if (allEnvs && options?.ai_envs) {
      const fakeEnv = {
        fake: true,
        finetunes: [],
        legacy_finetunes: [],
        legacy_finetunes_deleted: [],
        finetunes_deleted: [],
        deployments: [],
      };

      aiEnvs.forEach(env => {
        if (env.finetunes) fakeEnv.finetunes.push(...env.finetunes);
        if (env.legacy_finetunes) fakeEnv.legacy_finetunes.push(...env.legacy_finetunes);
        if (env.legacy_finetunes_deleted) fakeEnv.legacy_finetunes_deleted.push(...env.legacy_finetunes_deleted);
        if (env.finetunes_deleted) fakeEnv.finetunes_deleted.push(...env.finetunes_deleted);
        if (env.deployments) fakeEnv.deployments.push(...env.deployments);
      });

      return fakeEnv;
    }
    return null;
  }, [aiEnvs, allEnvs]);

  const env = useMemo(() => {
    if (allEnvs) return allEnvironments;
    if (!envId) {
      console.warn("useModels: Environment ID is null. Please provide a valid envId.");
      return null;
    }
    const selectedEnv = options?.ai_envs?.find(x => x.id === envId);
    if (!selectedEnv) {
      console.warn(`useModels: Environment with ID ${envId} could not be resolved.`, { envs: aiEnvs, envId });
      return null;
    }
    return selectedEnv;
  }, [aiEnvs, envId, allEnvs, allEnvironments]);

  const deletedFineTunes = useMemo(() => {
    let deleted = env?.finetunes_deleted || [];
    if (Array.isArray(env?.legacy_finetunes_deleted)) {
      deleted = [...deleted, ...env.legacy_finetunes_deleted];
    }
    return deleted;
  }, [env]);

  const getTagStyle = (tag) => {
    const colors = {
      deprecated: 'var(--neko-red)',
      tuned: 'var(--neko-green)',
      preview: 'var(--neko-orange)'
    };
    return {
      background: colors[tag],
      color: 'white',
      padding: '3px 4px',
      margin: '1px 0px 0px 3px',
      borderRadius: 4,
      fontSize: 9,
      lineHeight: '100%'
    };
  };

  const tagDisplayText = {
    deprecated: 'DEPRECATED',
    tuned: 'TUNED',
    preview: 'PREVIEW'
  };

  const jsxModelName = (x, isTuned) => {
    const tag = x.tags?.find(tag => ['deprecated', 'preview'].includes(tag)) || (isTuned ? 'tuned' : '');
    return (
      <>
        {x.name ?? x.suffix ?? x.model}
        {tag && (
          <small style={getTagStyle(tag)}>
            {tagDisplayText[tag]}
          </small>
        )}
      </>
    );
  };

  const allModels = useMemo(() => {
    let models = [];
    if (env?.fake === true) {
      for (const engine of options.ai_engines) {
        if (Array.isArray(engine.models)) {
          models = [ ...models, ...engine.models ];
        }
      }
    }
    else if (env?.type === 'azure') {
      const engine = options.ai_engines.find(x => x.type === 'openai');
      const openAiModels = engine?.models ?? [];
      models = openAiModels?.filter(x => env.deployments?.find(d => d.model === x.model)) ?? [];
    }
    else if (env?.type === 'huggingface') {
      models = env?.customModels?.map(x => {
        const tags = x['tags'] ? [...new Set([...x['tags'], 'core', 'chat'])] : ['core', 'chat'];
        const features = tags.includes('image') ? 'text-to-image' : 'completion';
        return {
          model: x.name,
          name: x.name,
          features: features,
          tags: tags,
          options: [],
        };
      }) ?? [];
    }
    else {
      const engine = options.ai_engines.find(x => x.type === env?.type);
      models = engine?.models ?? [];
    }

    let fineTunes = env?.finetunes ?? [];
    if (Array.isArray(env?.legacy_finetunes)) {
      fineTunes = [ ...fineTunes, ...env.legacy_finetunes ];
    }
    fineTunes = fineTunes.filter(x => x.status === 'succeeded' && x.model);
    models = models.map(x => {
      return { ...x, name: jsxModelName(x), rawName: x.name };
    });

    if (fineTunes.length) {
      models = [ ...models, ...fineTunes.map(x => {

        const features = ['completion'];
        const splitted = x.model.split(':');
        const family = splitted[0];
        return {
          model: x.model,
          name: jsxModelName(x, true),
          rawName: x.suffix,
          suffix: x.suffix,
          features,
          family,
          description: "finetuned",
          finetuned: true,
          tags: ['chat', 'finetune']
        };
      })];
    }
    return models;
  }, [options, env]);

  const models = useMemo(() => {
    return allModels.filter(x => !deletedFineTunes.includes(x.model));
  }, [allModels, deletedFineTunes]);

  const coreModels = useMemo(() => {
    return allModels.filter(x => x?.tags?.includes('core'));
  }, [allModels]);

  const imageModels = useMemo(() => {
    return models.filter(x => x?.tags?.includes('image'));
  }, [models]);

  const embeddingsModels = useMemo(() => {
    return models.filter(x => x?.tags?.includes('embedding'));
  }, [models]);

  const visionModels = useMemo(() => {
    return models.filter(x => x?.tags?.includes('vision'));
  }, [models]);

  const completionModels = useMemo(() => {
    return models.filter(x => x?.tags?.includes('chat'));
  }, [models]);

  const audioModels = useMemo(() => {
    return models.filter(x => x?.tags?.includes('audio'));
  }, [models]);

  const jsonModels = useMemo(() => {
    return models.filter(x => x?.tags?.includes('json'));
  }, [models]);

  const realtimeModels = useMemo(() => {
    return models.filter(x => x?.tags?.includes('realtime'));
  }, [models]);

  const getModel = (model) => {
    if (!model) {
      return null;
    }
    let modelObj = allModels.find(x => x.model === model);
    if (modelObj) {
      return modelObj;
    }
    if (model.startsWith('gpt-3.5-turbo-') || model.startsWith('gpt-35-turbo')) {
      model = 'gpt-3.5-turbo';
    }
    else if (model.startsWith('gpt-4o-mini')) {
      model = 'gpt-4o-mini';
    }
    else if (model.startsWith('gpt-4o')) {
      model = 'gpt-4o';
    }
    else if (model.startsWith('gpt-4')) {
      model = 'gpt-4';
    }
    else if (model.startsWith('o1-preview')) {
      model = 'o1-preview';
    }
    else if (model.startsWith('o1-mini')) {
      model = 'o1-mini';
    }
    else if (model.startsWith('o1-')) {
      model = 'o1';
    }
    modelObj = allModels.find(x => x.model === model);
    if (!modelObj && !warnedModelsRef.current.has(model)) {
      console.warn(`Model ${model} not found.`, { allModels, options });
      warnedModelsRef.current.add(model);
    }
    return modelObj;
  };

  const isFineTunedModel = (model) => {
    const modelObj = getModel(model);
    return modelObj?.finetuned || false;
  };

  const getModelName = (model, raw = false) => {
    const modelObj = getModel(model);
    if (!modelObj) {
      return model;
    }
    if (raw && modelObj) {
      return modelObj.rawName;
    }
    return modelObj?.name || modelObj?.model || model;
  };

  const getFamilyName = (model) => {
    const modelObj = getModel(model);
    return modelObj?.family || null;
  };

  const getFamilyModel = (model) => {
    const modelObj = getModel(model);
    const coreModel = coreModels.find(x => x?.family === modelObj?.family);
    return coreModel || null;
  };

  const getPrice = (model, resolution = "1024x1024") => {
    const modelObj = getFamilyModel(model);
    if (modelObj?.type === 'image') {
      if (modelObj?.resolutions) {
        const opt = modelObj.resolutions.find(x => x.name === resolution);
        return opt?.price || null;
      }
    }
    return modelObj?.price || null;
  };

  const calculatePrice = (model, inUnits, outUnits, resolution = "1024x1024") => {
    const modelObj = getFamilyModel(model);
    const price = getPrice(model, resolution);

    let priceIn = price;
    let priceOut = price;
    if (typeof price === 'object' && price !== null) {
      priceIn = price['in'];
      priceOut = price['out'];
    }
    if (priceIn && priceOut) {
      return (priceIn * inUnits * modelObj['unit']) + (priceOut * outUnits * modelObj['unit']);
    }
    return 0;
  };

  return { allModels, model, models,
    completionModels, imageModels, visionModels, coreModels, embeddingsModels, audioModels, jsonModels,
    realtimeModels, setModel, isFineTunedModel, getModelName,
    getFamilyName, getPrice, getModel, calculatePrice };
};

const retrieveRemoteVectors = async (queryParams) => {
  const res = await nekoFetch(`${apiUrl}/vectors/remote_list`, { nonce: restNonce, method: 'POST', json: queryParams });
  return res ? { total: res.total, vectors: res.vectors } : { total: 0, vectors: [] };
};

const addFromRemote = async (queryParams, signal) => {
  const res = await nekoFetch(`${apiUrl}/vectors/add_from_remote`, { nonce: restNonce, method: 'POST',
    json: queryParams, signal
  });
  return res;
};

const retrieveDiscussions = async (chatsQueryParams) => {
  chatsQueryParams.offset = (chatsQueryParams.page - 1) * chatsQueryParams.limit;
  const res = await nekoFetch(`${apiUrl}/discussions/list`, { nonce: restNonce, method: 'POST', json: chatsQueryParams });
  return res ? { total: res.total, chats: res.chats } : { total: 0, chats: [] };
};

const retrieveLogsActivity = async (hours = 24) => {
  const res = await nekoFetch(`${apiUrl}/system/logs/activity`, { nonce: restNonce, method: 'POST', json: { hours } });
  return res?.data ? res.data : [];
};

const retrieveLogsActivityDaily = async (days = 31) => {
  const res = await nekoFetch(`${apiUrl}/system/logs/activity_daily`, { nonce: restNonce, method: 'POST', json: { days } });
  return res?.data ? res.data : [];
};

const retrieveVectors = async (queryParams) => {
  const isSearch = queryParams?.filters?.search !== null;
  if (queryParams?.filters?.search === "") {
    return [];
  }

  if (!queryParams.filters.envId) {
    return { total: 0, vectors: [] };
  }

  const res = await nekoFetch(`${apiUrl}/vectors/list`, { nonce: restNonce, method: 'POST', json: queryParams });

  if (isSearch && res?.vectors?.length) {
    const sortedVectors = res.vectors.sort((a, b) => {
      if (queryParams?.sort?.by === 'asc') {
        return a.score - b.score;
      }
      return b.score - a.score;
    });
    res.vectors = sortedVectors;
  }

  return res ? { total: res.total, vectors: res.vectors } : { total: 0, vectors: [] };
};

const retrievePostsCount = async (postType, postStatus = 'publish') => {
  const res = await nekoFetch(`${apiUrl}/helpers/count_posts?postType=${postType}&postStatus=${postStatus}`, { nonce: restNonce });
  return res?.count ? parseInt(res?.count) : null;
};

const retrievePostsIds = async (postType, postStatus = 'publish') => {
  const res = await nekoFetch(`${apiUrl}/helpers/posts_ids?postType=${postType}&postStatus=${postStatus}`, { nonce: restNonce });
  return res?.postIds ? res.postIds : [];
};

const retrievePostContent = async (postType, offset = 0, postId = 0, postStatus = 'publish') => {
  const res = await nekoFetch(`${apiUrl}/helpers/post_content?postType=${postType}&postStatus=${postStatus}&offset=${offset}&postId=${postId}`,
    { nonce: restNonce });
  return res;
};

const runTasks = async () => {
  const res = await nekoFetch(`${apiUrl}/helpers/run_tasks`, { nonce: restNonce, method: 'POST' });
  return res;
};

const synchronizeEmbedding = async ({ vectorId, postId, envId }, signal = null) => {
  const res = await nekoFetch(`${apiUrl}/vectors/sync`, {
    nonce: restNonce,
    method: 'POST',
    json: { vectorId, postId, envId },
    signal
  });
  return res;
};

function tableDateTimeFormatter(value) {
  let time = new Date(value);
  time = new Date(time.getTime() - time.getTimezoneOffset() * 60 * 1000);
  const formattedDate = time.toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const formattedTime = time.toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  return <>{formattedDate}<br /><small>{formattedTime}</small></>;
}

function tableUserIPFormatter(userId, ip) {
  const formattedIP = ip ? (() => {
    const maxLength = 16;
    let substr = ip.substring(0, maxLength);
    if (substr.length < ip.length) {
      if (substr.endsWith('.')) {
        substr = substr.slice(0, -1);
      }
      return substr + "~";
    }
    return substr;
  })() : '';
  return <>
    {!userId && <>{i18n.COMMON.GUEST}</>}
    {userId && <><a target="_blank" href={`/wp-admin/user-edit.php?user_id=${userId}`} rel="noreferrer">
      {i18n.COMMON.USER} #{userId}
    </a></>}
    <br />
    <small>{formattedIP}</small>
  </>;
}

const randomHash = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < length; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

const OpenAiIcon = ({ size = 14, disabled = false, style, ...rest }) => {
  const baseStyle = { position: 'relative', top: 2, borderRadius: 2, filter: disabled ? 'grayscale(100%)' : 'none' };
  const finalStyle = { ...baseStyle, ...style };
  return (<img width={size} height={size} {...rest} style={finalStyle} alt="OpenAI"
    src={pluginUrl + '/images/chat-openai.svg'}
  />);
};

const AnthropicIcon = ({ size = 14, disabled = false, style, ...rest }) => {
  const baseStyle = { position: 'relative', top: 2, borderRadius: 2, filter: disabled ? 'grayscale(100%)' : 'none' };
  const finalStyle = { ...baseStyle, ...style };
  return (<img width={size} height={size} {...rest} style={finalStyle} alt="Anthropic"
    src={pluginUrl + '/images/chat-anthropic.svg'}
  />);
};

const JsIcon = ({ size = 14, disabled = false, style, ...rest }) => {
  const baseStyle = { position: 'relative', top: 2, borderRadius: 2, filter: disabled ? 'grayscale(100%)' : 'none' };
  const finalStyle = { ...baseStyle, ...style };
  return (<img width={size} height={size} {...rest} style={finalStyle} alt="JavaScript"
    src={pluginUrl + '/images/code-js.svg'}
  />);
};

const PhpIcon = ({ size = 14, disabled = false, style, ...rest }) => {
  const baseStyle = { position: 'relative', top: 2, borderRadius: 2, filter: disabled ? 'grayscale(100%)' : 'none' };
  const finalStyle = { ...baseStyle, ...style };
  return (<img width={size} height={size} {...rest} style={finalStyle} alt="PHP"
    src={pluginUrl + '/images/code-php.svg'}
  />);
};

const getPostContent = (currentPositionMarker = null) => {
  const { getBlocks, getSelectedBlockClientId } = wp.data.select("core/block-editor");
  const { getEditedPostAttribute } = wp.data.select("core/editor");
  const blocks = getBlocks();
  const originalTitle = getEditedPostAttribute('title');
  const selectedBlockClientId = getSelectedBlockClientId();

  let wholeContent = originalTitle + '\n\n';
  blocks.forEach((block, _index) => {
    if (currentPositionMarker && block.clientId === getSelectedBlockClientId()) {
      wholeContent += currentPositionMarker + '\n\n';
    } else {
      wholeContent += (block.attributes.content || '') + '\n\n';
    }
  });
  return wholeContent.trim();
};

export { OptionsCheck, cleanSections, useModels, toHTML, useLanguages, addFromRemote,
  retrieveVectors, retrieveRemoteVectors, retrievePostsCount, retrievePostContent, runTasks,
  synchronizeEmbedding, retrievePostsIds, retrieveDiscussions, retrieveLogsActivity, retrieveLogsActivityDaily, getPostContent,
  tableDateTimeFormatter, tableUserIPFormatter, randomHash, OpenAiIcon, AnthropicIcon, JsIcon, PhpIcon,
  ENTRY_TYPES, ENTRY_BEHAVIORS, DEFAULT_VECTOR
};