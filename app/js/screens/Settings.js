// Previous: 2.7.7
// Current: 2.8.2

const { useMemo, useState, useEffect, useCallback } = wp.element;

import { NekoButton, NekoInput, NekoPage, NekoBlock, NekoContainer, NekoSettings, NekoSpacer, NekoTypo,
  NekoSelect, NekoOption, NekoTabs, NekoTab, NekoCheckboxGroup, NekoCheckbox, NekoWrapper,
  NekoQuickLinks, NekoLink,
  NekoCollapsableCategory, NekoColumn, NekoModal } from '@neko-ui';

import { nekoFetch } from '@neko-ui';
import { nekoStringify } from '@neko-ui';

import { LicenseBlock } from '@common';
import { apiUrl, prefix, domain, isRegistered, isPro, restNonce,
  options as defaultOptions } from '@app/settings';
import i18n from '@root/i18n';
import { OptionsCheck, toHTML, useModels } from '@app/helpers-admin';
import { AiNekoHeader } from '@app/styles/CommonStyles';
import FineTunes from '@app/screens/finetunes/Finetunes';
import Moderation from '@app/screens/misc/Moderation';
import Embeddings from '@app/screens/embeddings/Embeddings';
import MonthlyUsage from '@app/components/MonthlyUsage';
import Discussions from '@app/screens/discussions/Discussions';
import Chatbots from './chatbots/Chatbots';
import Insights from '@app/screens/queries/Insights';
import DevToolsTab from './settings/DevToolsTab';
import EmbeddingsEnvironmentsSettings from './embeddings/Environments';
import AIEnvironmentsSettings from './ai/Environments';
import Transcription from './misc/Transcription';
import Assistants from './assistants/Assistants';
import { retrieveChatbots, retrieveOptions, retrieveThemes, updateChatbots, updateThemes } from '@app/requests';
import Addons from './Addons';
import { OpenAiIcon } from '@app/helpers-admin';

const defaultEnvironmentSections = [
  { envKey: 'ai_fast_default_env', modelKey: 'ai_fast_default_model', defaultModel: 'gpt-4.1-nano' },
  { envKey: 'ai_embeddings_default_env', modelKey: 'ai_embeddings_default_model', defaultModel: 'text-embedding-ada-002' },
  { envKey: 'ai_vision_default_env', modelKey: 'ai_vision_default_model', defaultModel: 'gpt-4o-mini' },
  { envKey: 'ai_images_default_env', modelKey: 'ai_images_default_model', defaultModel: 'dall-e-3-hd' },
  { envKey: 'ai_audio_default_env', modelKey: 'ai_audio_default_model', defaultModel: 'whisper-1' },
  { envKey: 'ai_json_default_env', modelKey: 'ai_json_default_model', defaultModel: 'gpt-4o-mini' }
];

const proOptions = [
  'module_forms',
  'module_statistics',
  'module_embeddings',
  'module_assistants'
];

const Settings = () => {
  const [ options, setOptions ] = useState(defaultOptions);
  const [ settingsSection, setSettingsSection ] = useState('ai');
  const [ error, setError ] = useState(null);
  const [ busyAction, setBusyAction ] = useState(false);

  const module_suggestions = options?.module_suggestions;
  const module_advisor = options?.module_advisor;
  const module_forms = options?.module_forms;
  const module_finetunes = options?.module_finetunes;
  const module_statistics = options?.module_statistics;
  const module_playground = options?.module_playground;
  const module_generator_content = options?.module_generator_content;
  const module_generator_images = options?.module_generator_images;
  const module_moderation = options?.module_moderation;
  const module_embeddings = options?.module_embeddings;
  const module_assistants = options?.module_assistants;
  const module_transcription = options?.module_transcription;
  const module_addons = options?.module_addons;
  const module_devtools = options?.module_devtools;
  const module_chatbots = options?.module_chatbots;

  const ai_envs = useMemo(() => options?.ai_envs ? options?.ai_envs : [], [options]);
  const ai_fast_default_env = options?.ai_fast_default_env;
  const ai_fast_default_model = options?.ai_fast_default_model;
  const ai_default_env = options?.ai_default_env;
  const ai_default_model = options?.ai_default_model;
  const ai_vision_default_env = options?.ai_vision_default_env;
  const ai_vision_default_model = options?.ai_vision_default_model;
  const ai_embeddings_default_env = options?.ai_embeddings_default_env;
  const ai_embeddings_default_model = options?.ai_embeddings_default_model;

  const ai_images_default_env = options?.ai_images_default_env;
  const ai_images_default_model = options?.ai_images_default_model;
  const ai_audio_default_env = options?.ai_audio_default_env;
  const ai_audio_default_model = options?.ai_audio_default_model;
  const ai_json_default_env = options?.ai_json_default_env;
  const ai_json_default_model = options?.ai_json_default_model;
  const ai_streaming = options?.ai_streaming;
  const privacy_first = options?.privacy_first;

  const embeddings_envs = options?.embeddings_envs ? options?.embeddings_envs : [];
  const embeddings_default_env = options?.embeddings_default_env;
  const syntax_highlight = options?.syntax_highlight;
  const chatbot_discussions = options?.chatbot_discussions;
  const virtual_keyboard_fix = options?.virtual_keyboard_fix;
  const chatbot_gdpr_consent = options?.chatbot_gdpr_consent;
  const chatbot_gdpr_text = options?.chatbot_gdpr_text;
  const chatbot_gdpr_button = options?.chatbot_gdpr_button;
  const speech_recognition = options?.speech_recognition;
  const speech_synthesis = options?.speech_synthesis;
  const public_api = options?.public_api;
  const statistics_data = options?.statistics_data;
  const statistics_forms_data = options?.statistics_forms_data;
  const intro_message = options?.intro_message;
  const addons = options?.module_addons;
  const context_max_length = options?.context_max_length;
  const banned_ips = options?.banned_ips;
  const banned_words = options?.banned_words;
  const ignore_word_boundaries = options?.ignore_word_boundaries;
  const admin_bar = options?.admin_bar ?? ['settings'];
  const resolve_shortcodes = options?.resolve_shortcodes;
  const clean_uninstall = options?.clean_uninstall;

  const { completionModels } = useModels(options);
  const { visionModels } = useModels(options, options?.ai_vision_default_env);
  const { audioModels } = useModels(options, options?.ai_audio_default_env);
  const { jsonModels } = useModels(options, options?.ai_json_default_env);
  const { imageModels } = useModels(options, options?.ai_images_default_env);
  const { embeddingsModels } = useModels(options, options?.ai_embeddings_default_env);

  const defaultEmbeddingsModel = useMemo(() => {
    return embeddingsModels.find(x => x.model === ai_embeddings_default_model);
  }, [embeddingsModels, ai_embeddings_default_model]);

  const busy = busyAction;

  const updateOptions = useCallback(async (newOptions) => {
    try {
      if (nekoStringify(newOptions) === nekoStringify(options)) {
        return;
      }
      setBusyAction(true);
      const response = await nekoFetch(`${apiUrl}/settings/update`, {
        method: 'POST',
        nonce: restNonce,
        json: {
          options: newOptions
        }
      });
      setOptions(response.options);
    }
    catch (err) {
      console.error(i18n.ERROR.UPDATING_OPTIONS, err?.message ?
        { message: err.message, options, newOptions } : { err, options, newOptions });
      if (err.message) {
        setError(<>
          <div>{i18n.ERROR.UPDATING_OPTIONS}</div>
          <small>{toHTML(i18n.ERROR.CHECK_YOUR_CONSOLE)}</small>
        </>);
      }
    }
    finally {
      setBusyAction(false);
    }
  }, [options]);

  useEffect(() => {
    const performChecks = async () => {
      let updatesNeeded = false;
      const newOptions = { ...options };

      defaultEnvironmentSections.forEach(({ envKey, modelKey, defaultModel }) => {
        let exists = false;
        if (options[envKey]) {
          exists = !!ai_envs.find(x => x.id === options[envKey]);
        }
        if (!exists) {
          const foundEnv = ai_envs.find(x => x?.type === 'openai');
          if (foundEnv) {
            if (newOptions[envKey] !== foundEnv.id || newOptions[modelKey] !== defaultModel) {
              console.warn(`Updating ${envKey} and ${modelKey} to ${foundEnv.id} and ${defaultModel}`);
              updatesNeeded = true;
              newOptions[envKey] = foundEnv.id;
              newOptions[modelKey] = defaultModel;
            }
          }
          else {
            if (newOptions[envKey] !== null || newOptions[modelKey] !== null) {
              console.warn(`Updating ${envKey} and ${modelKey} to null`);
              updatesNeeded = true;
              newOptions[envKey] = null;
              newOptions[modelKey] = null;
            }
          }
        }

        if (modelKey === 'ai_embeddings_default_model' && newOptions[modelKey]) {
          const dimensions = newOptions?.ai_embeddings_default_dimensions || null;
          if (dimensions !== null) {
            const model = embeddingsModels.find(x => x.model === newOptions[modelKey]);
            if (model && model.dimensions && !model.dimensions.includes(dimensions)) {
              const newDimensions = model?.dimensions[model?.dimensions.length - 1] || null;
              if (newDimensions !== null) {
                newOptions.ai_embeddings_default_dimensions = newDimensions;
                console.warn(`Updating embeddings default dimensions to ${newDimensions}`);
                updatesNeeded = true;
              }
            }
          }
        }
      });

      if (updatesNeeded) {
        await updateOptions(newOptions);
      }
    };

    performChecks();
  }, [ai_envs, options, updateOptions, embeddingsModels]);

  const refreshOptions = async () => {
    setBusyAction(true);
    try {
      const optionsData = await retrieveOptions();
      setOptions(optionsData);
    }
    catch (err) {
      console.error(i18n.ERROR.GETTING_OPTIONS, err?.message ? { message: err.message } : { err });
      if (err.message) {
        setError(<>
          <div>{i18n.ERROR.GETTING_OPTIONS}</div>
          <small>{toHTML(i18n.ERROR.CHECK_YOUR_CONSOLE)}</small>
        </>);
      }
    }
    finally {
      setBusyAction(false);
    }
  };

  const updateOption = async (value, id) => {
    const newOptions = { ...options, [id]: value };
    console.log('Updating', id, value);
    await updateOptions(newOptions);
  };

  const updateVectorDbEnvironment = async (id, updatedValue) => {
    const updatedEnvironments = embeddings_envs.map(env => {
      if (env.id === id) {
        return { ...env, ...updatedValue };
      }
      return env;
    });
    updateOption(updatedEnvironments, 'embeddings_envs');
  };

  const updateAIEnvironment = async (id, updatedValue) => {
    const updatedEnvironments = ai_envs.map(env => {
      if (env.id === id) {
        return { ...env, ...updatedValue };
      }
      return env;
    });
    updateOption(updatedEnvironments, 'ai_envs');
  };

  const onResetSettings = async () => {
    if (!window.confirm(i18n.ALERTS.ARE_YOU_SURE)) {
      return;
    }
    setBusyAction(true);
    try {
      await nekoFetch(`${apiUrl}/settings/reset`, { method: 'POST', nonce: restNonce });
      alert("Settings reset. The page will now reload to reflect the changes.");
      window.location.reload();
    }
    catch (err) {
      alert("Error while resetting settings. Please check your console.");
      console.log(err);
    }
    finally {
      setBusyAction(false);
    }
  };

  const onExportSettings = async () => {
    setBusyAction('exportSettings');
    try {
      const chatbots = await retrieveChatbots();
      const themes = await retrieveThemes();
      const optionsData = await retrieveOptions();
      const data = { chatbots, themes, options: optionsData };
      const blob = new Blob([nekoStringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date();
      const filename = `ai-engine-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.json`;
      link.setAttribute('download', filename);
      link.click();
    }
    catch (err) {
      alert("Error while exporting settings. Please check your console.");
      console.log(err);
    }
    finally {
      setBusyAction(false);
    }
  };

  const onImportSettings = async () => {
    setBusyAction('importSettings');
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'application/json';
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
          const data = JSON.parse(e.target.result);
          const { chatbots, themes, options: importedOptions } = data;
          await updateChatbots(chatbots);
          await updateThemes(themes);
          await updateOptions(importedOptions);
          alert("Settings imported. The page will now reload to reflect the changes.");
          window.location.reload();
        };
        reader.readAsText(file);
      };
      fileInput.click();
    }
    catch (err) {
      alert("Error while importing settings. Please check your console.");
      console.log(err);
    }
    finally {
      setBusyAction(false);
    }
  };

  useEffect(() => {
    if (!isRegistered) {
      const newOptions = { ...options };
      let hasChanges = false;

      proOptions.forEach(option => {
        if (newOptions[option]) {
          newOptions[option] = false;
          console.warn(`Resetting ${option}`);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        if (nekoStringify(newOptions) !== nekoStringify(options)) {
          updateOptions(newOptions);
        }
      }
    }
  }, [options]);

  const jsxUtilities =
    <NekoSettings title={i18n.COMMON.UTILITIES}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="module_suggestions" label={i18n.COMMON.POSTS_SUGGESTIONS} value="1" checked={module_suggestions}
          description={i18n.COMMON.POSTS_SUGGESTIONS_HELP}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxAdvisors =
    <NekoSettings title={i18n.COMMON.ADVISOR}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="module_advisor" label={i18n.COMMON.ENABLE} value="1"
          checked={module_advisor}
          description={i18n.HELP.ADVISOR}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxGenerators =
    <NekoSettings title={i18n.COMMON.GENERATORS}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="module_generator_content" label={i18n.COMMON.CONTENT_GENERATOR} value="1" checked={module_generator_content}
          description={i18n.COMMON.CONTENT_GENERATOR_HELP}
          onChange={updateOption} />
        <NekoCheckbox name="module_generator_images" label={i18n.COMMON.IMAGES_GENERATOR} value="1" checked={module_generator_images}
          description={i18n.COMMON.IMAGES_GENERATOR_HELP}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxPlayground =
    <NekoSettings title={i18n.COMMON.PLAYGROUND}>
      <NekoCheckbox name="module_playground" label={i18n.COMMON.ENABLE} value="1"
        checked={module_playground}
        description={i18n.COMMON.PLAYGROUND_HELP}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxForms =
    <NekoSettings title={<>{i18n.COMMON.FORMS}<small style={{ position: 'relative', top: -3, fontSize: 8 }}> BETA</small></>}>
      <NekoCheckbox name="module_forms" label={i18n.COMMON.ENABLE} value="1"
        checked={module_forms} requirePro={true} isPro={isRegistered}
        description={i18n.COMMON.FORMS_HELP}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxFinetunes =
    <NekoSettings title={i18n.COMMON.FINETUNES}>
      <NekoCheckbox name="module_finetunes" label={i18n.COMMON.ENABLE} value="1"
        checked={module_finetunes}
        description={<><OpenAiIcon disabled={!module_finetunes} style={{ marginRight: 3 }} />
          {i18n.HELP.FINETUNES}
        </>}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxInsights =
    <NekoSettings title={<>{i18n.COMMON.INSIGHTS}</>}>
      <NekoCheckbox name="module_statistics" label={i18n.COMMON.ENABLE} value="1"
        checked={module_statistics} requirePro={true} isPro={isRegistered}
        description={i18n.COMMON.INSIGHTS_HELP}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxModeration =
    <NekoSettings title={<>{i18n.COMMON.MODERATION}</>}>
      <NekoCheckbox name="module_moderation" label={i18n.COMMON.ENABLE} value="1"
        checked={module_moderation}
        description={<><OpenAiIcon disabled={!module_moderation} style={{ marginRight: 3 }} />
          {i18n.COMMON.MODERATION_HELP}
        </>}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxTranscribe =
    <NekoSettings title={<>{i18n.COMMON.TRANSCRIPTION}</>}>
      <NekoCheckbox name="module_transcription" label={i18n.COMMON.ENABLE} value="1"
        checked={module_transcription}
        description={i18n.COMMON.TRANSCRIPTION_HELP}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxKnoweldge =
    <NekoSettings title={<>{i18n.COMMON.KNOWLEDGE}</>}>
      <NekoCheckbox name="module_embeddings" label={i18n.COMMON.ENABLE} value="1"
        checked={module_embeddings} requirePro={true} isPro={isRegistered}
        description={toHTML(i18n.COMMON.KNOWLEDGE_HELP)}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxAssistants =
    <NekoSettings
      title={<>{i18n.COMMON.ASSISTANTS}
        <small style={{ position: 'relative', top: -3, fontSize: 8 }}> BETA</small>
      </>}>
      <NekoCheckbox name="module_assistants" label={i18n.COMMON.ENABLE} value="1"
        checked={module_assistants} requirePro={true} isPro={isRegistered}
        description={<><OpenAiIcon disabled={!module_assistants} style={{ marginRight: 3 }} />
          {i18n.HELP.ASSISTANTS}
        </>}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxChatbot =
    <NekoSettings title={i18n.COMMON.CHATBOT}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="module_chatbots" label={i18n.COMMON.ENABLE} value="1" checked={module_chatbots}
          description={i18n.COMMON.CHATBOT_HELP}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>
   ;

  const jsxStatisticsData =
   <NekoSettings title={i18n.COMMON.QUERIES_DATA}>
     <NekoCheckboxGroup max="1">
       <NekoCheckbox name="statistics_data" label={i18n.COMMON.ENABLE} value="1" checked={statistics_data}
         description={i18n.HELP.QUERIES_DATA}
         onChange={updateOption} />
     </NekoCheckboxGroup>
   </NekoSettings>;

  const jsxStatisticsFormsData =
    <NekoSettings title={i18n.COMMON.QUERIES_FORMS_DATA}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="statistics_forms_data" label={i18n.COMMON.ENABLE} value="1" checked={statistics_forms_data}
          description={i18n.HELP.QUERIES_FORMS_DATA}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxIntroMessage =
    <NekoSettings title={i18n.COMMON.INTRO_MESSAGE}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="intro_message" label={i18n.COMMON.ENABLE} value="1" checked={intro_message}
          description={i18n.HELP.INTRO_MESSAGE}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxAddOns =
    <NekoSettings title={i18n.COMMON.ADDONS}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="module_addons" label={i18n.COMMON.ENABLE} value="1" checked={addons}
          description={i18n.HELP.ADDONS}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxChatbotSelection =
    <NekoSettings title={i18n.COMMON.CHATBOT_SELECT}>
      <NekoSelect scrolldown name="chatbot_select" value={options?.chatbot_select} onChange={updateOption}
        description={i18n.HELP.CHATBOT_SELECT}>
        <NekoOption key='tabs' value='tabs' label={i18n.COMMON.TABS}></NekoOption>
        <NekoOption key='dropdown' value='dropdown' label={i18n.COMMON.DROPDOWN}></NekoOption>
      </NekoSelect>
    </NekoSettings>;

  const jsxWebSpeechAPI =
    <NekoSettings title={i18n.COMMON.WEBSPEECH_API}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="speech_recognition" label={i18n.COMMON.SPEECH_RECOGNITION} value="1"
          checked={speech_recognition}
          description={i18n.HELP.SPEECH_RECOGNITION}
          onChange={updateOption} />
      </NekoCheckboxGroup>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="speech_synthesis" label={i18n.COMMON.SPEECH_SYNTHESIS + " (SOON)"} value="1"
          disabled={true}
          checked={speech_synthesis}
          description={i18n.HELP.SPEECH_SYNTHESIS}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxVirtualKeyboardFix =
    <NekoSettings title={i18n.COMMON.VIRTUAL_KEYBOARD}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="virtual_keyboard_fix" label={i18n.COMMON.FIX} value="1"
          checked={virtual_keyboard_fix}
          description={i18n.HELP.VIRTUAL_KEYBOARD}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxChatbotGDPRConsent =
    <NekoSettings title={i18n.COMMON.GDPR_CONSENT}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="chatbot_gdpr_consent" label={i18n.COMMON.ENABLE} value="1"
          checked={chatbot_gdpr_consent}
          description={i18n.HELP.GDPR_CONSENT}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxChatbotGDPRMessage =
    <NekoSettings title={i18n.COMMON.GDPR_TEXT}>
      <NekoInput name="chatbot_gdpr_text" value={chatbot_gdpr_text}
        onBlur={updateOption} />
    </NekoSettings>;

  const jsxChatbotGDPRButton =
    <NekoSettings title={i18n.COMMON.GDPR_BUTTON}>
      <NekoInput name="chatbot_gdpr_button" value={chatbot_gdpr_button}
        onBlur={updateOption} />
    </NekoSettings>;

  const jsxStream =
    <NekoSettings title={i18n.COMMON.STREAMING}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="ai_streaming" label={i18n.COMMON.ENABLE} value="1"
          checked={ai_streaming}
          description={i18n.HELP.STREAMING}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxPrivacyFirst =
    <NekoSettings title={i18n.COMMON.PRIVACY_FIRST}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="privacy_first" label={i18n.COMMON.ENABLE} value="1"
          checked={privacy_first}
          description={i18n.HELP.PRIVACY_FIRST}
          onChange={updateOption}
        />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxShortcodeDiscussions =
    <NekoSettings title={i18n.COMMON.DISCUSSIONS}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="chatbot_discussions" label={i18n.COMMON.ENABLE} value="1"
          checked={chatbot_discussions}
          description={i18n.HELP.DISCUSSIONS}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxDiscussionSummary =
    <NekoSettings title={i18n.COMMON.SUMMARIZE}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="chatbot_discussions_titling" label={i18n.COMMON.ENABLE} value="1"
          checked={options?.chatbot_discussions_titling}
          description={i18n.HELP.DISCUSSION_SUMMARY}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxShortcodeSyntaxHighlighting =
    <NekoSettings title={i18n.COMMON.SYNTAX_HIGHLIGHT}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="syntax_highlight" label={i18n.COMMON.ENABLE} value="1" checked={syntax_highlight}
          description={i18n.HELP.SYNTAX_HIGHLIGHT}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxPublicAPI =
    <NekoSettings title={i18n.COMMON.PUBLIC_API}>
      <NekoCheckbox name="public_api" label={i18n.COMMON.ENABLE} value="1" checked={public_api}
        description={i18n.HELP.PUBLIC_API}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxBearerToken =
    <NekoSettings title={i18n.COMMON.BEARER_TOKEN}>
      <NekoInput name="public_api_bearer_token" value={options?.public_api_bearer_token}
        description={toHTML(i18n.HELP.BEARER_TOKEN)}
        onBlur={updateOption} />
    </NekoSettings>;

  const jsxImageLocalUpload =
    <NekoSettings title="Local Upload">
      <NekoSelect scrolldown name="image_local_upload" value={options?.image_local_upload} onChange={updateOption}
        description="Files can be stored either in the filesystem or the Media Library.">
        <NekoOption key='uploads' value='uploads' label="Filesystem"></NekoOption>
        <NekoOption key='library' value='library' label="Media Library"></NekoOption>
      </NekoSelect>
    </NekoSettings>;

  const jsxImageRemoteUpload =
    <NekoSettings title="Remote Upload">
      <NekoSelect scrolldown name="image_remote_upload" value={options?.image_remote_upload} onChange={updateOption}
        description="Select Upload Data for private sites; Share URLs requires your WordPress to be online and reachable.">
        <NekoOption key='data' value='data' label="Upload Data"></NekoOption>
        <NekoOption key='url' value='url' label="Share URLs"></NekoOption>
      </NekoSelect>
    </NekoSettings>;

  const jsxImageExpiration =
    <NekoSettings title="Expiration">
      <NekoSelect scrolldown name="image_expires" value={options?.image_expires ?? 'never'} onChange={updateOption}
        description="Uploaded files will be deleted after a certain amount of time. This also affects files uploaded to OpenAI via the Assistants.">
        <NekoOption key={5 * 60} value={5 * 60} label="5 minutes"></NekoOption>
        <NekoOption key={1 * 60 * 60} value={1 * 60 * 60} label="1 hour"></NekoOption>
        <NekoOption key={6 * 60 * 60} value={6 * 60 * 60} label="6 hours"></NekoOption>
        <NekoOption key={24 * 60 * 60} value={24 * 60 * 60} label="1 day"></NekoOption>
        <NekoOption key={7 * 24 * 60 * 60} value={7 * 24 * 60 * 60} label="1 week"></NekoOption>
        <NekoOption key={30 * 24 * 60 * 60} value={30 * 24 * 60 * 60} label="1 month"></NekoOption>
        <NekoOption key={'Never'} value={'never'} label="Never"></NekoOption>
      </NekoSelect>
    </NekoSettings>;

  const jsxImageLocalDownload =
    <NekoSettings title="Local Download">
      <NekoSelect scrolldown name="image_local_download" value={options?.image_local_download ?? null}
        onChange={updateOption}
        description="Files can be stored either in the filesystem or the Media Library.">
        <NekoOption key={null} value={null} label="None"></NekoOption>
        <NekoOption key='uploads' value='uploads' label="Filesystem"></NekoOption>
        <NekoOption key='library' value='library' label="Media Library"></NekoOption>
      </NekoSelect>
    </NekoSettings>;

  const jsxImageExpirationDownload =
    <NekoSettings title="Expiration">
      <NekoSelect scrolldown name="image_expires_download" value={options?.image_expires_download ?? 'never'}
        onChange={updateOption}
        description="Downloaded files will be deleted after a certain amount of time.">
        <NekoOption key={5 * 60} value={5 * 60} label="5 minutes"></NekoOption>
        <NekoOption key={1 * 60 * 60} value={1 * 60 * 60} label="1 hour"></NekoOption>
        <NekoOption key={6 * 60 * 60} value={6 * 60 * 60} label="6 hours"></NekoOption>
        <NekoOption key={24 * 60 * 60} value={24 * 60 * 60} label="1 day"></NekoOption>
        <NekoOption key={7 * 24 * 60 * 60} value={7 * 24 * 60 * 60} label="1 week"></NekoOption>
        <NekoOption key={30 * 24 * 60 * 60} value={30 * 24 * 60 * 60} label="1 month"></NekoOption>
        <NekoOption key={'Never'} value={'never'} label="Never"></NekoOption>
      </NekoSelect>
    </NekoSettings>;

  const jsxDevTools =
    <NekoSettings title={i18n.COMMON.DEV_TOOLS}>
      <NekoCheckbox name="module_devtools" label={i18n.COMMON.ENABLE} value="1" checked={module_devtools}
        description={i18n.HELP.DEV_TOOLS}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxResolveShortcodes =
    <NekoSettings title={i18n.COMMON.SHORTCODES}>
      <NekoCheckbox name="resolve_shortcodes" label={i18n.COMMON.RESOLVE} value="1" checked={resolve_shortcodes}
        description={i18n.HELP.RESOLVE_SHORTCODE}
        onChange={updateOption} />
    </NekoSettings>;

  const jsxContextMaxTokens =
    <NekoSettings title={i18n.COMMON.CONTEXT_MAX_LENGTH}>
      <NekoInput name="context_max_length" value={context_max_length} type="number" step="1"
        description={i18n.HELP.CONTEXT_MAX_LENGTH}
        onBlur={updateOption} />
    </NekoSettings>;

  const jsxBannedKeywords =
    <NekoSettings title={i18n.COMMON.BANNED_WORDS}>
      <NekoInput id="banned_words" name="banned_words" value={banned_words}
        isCommaSeparatedArray={true}
        description={i18n.HELP.BANNED_WORDS}
        onBlur={updateOption} />
    </NekoSettings>;

  const jsxIgnoreWordBoundaries =
    <NekoSettings title={i18n.COMMON.WORD_BOUNDARIES}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="ignore_word_boundaries" label={i18n.COMMON.IGNORE} value="1"
          checked={ignore_word_boundaries}
          description={i18n.HELP.WORD_BOUNDARIES}
          onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  const jsxAIEnvironmentModelDefault =
    <NekoSettings title={i18n.COMMON.MODEL}>
      <NekoSelect scrolldown name="ai_default_model"
        value={ai_default_model} onChange={updateOption}>
        {completionModels.map((x) => (
          <NekoOption key={x.model} value={x.model} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>;

  const jsxAIEnvironmentModelFastDefault =
    <NekoSettings title={i18n.COMMON.MODEL}>
      <NekoSelect scrolldown name="ai_fast_default_model"
        value={ai_fast_default_model} onChange={updateOption}>
        {completionModels.map((x) => (
          <NekoOption key={x.model} value={x.model} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>;

  const jsxAIEnvironmentModelEmbeddingsDefault =
    <NekoSettings title={i18n.COMMON.MODEL}>
      <NekoSelect scrolldown name="ai_embeddings_default_model"
        value={ai_embeddings_default_model} onChange={updateOption}>
        {embeddingsModels.map((x) => (
          <NekoOption key={x.model} value={x.model} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>;

  const jsxAIEnvironmentDimensionsEmbeddingsDefault =
    <NekoSettings title={i18n.COMMON.DIMENSIONS}>
      <NekoSelect scrolldown name="ai_embeddings_default_dimensions"
        value={options?.ai_embeddings_default_dimensions || null} onChange={updateOption}>
        {defaultEmbeddingsModel?.dimensions?.map((x, i) => (
          <NekoOption key={x} value={x}
            label={i === defaultEmbeddingsModel.dimensions.length - 1 ? `${x} (Default)` : x}
          />
        ))}
        <NekoOption key={null} value={null} label="Not Set"></NekoOption>
      </NekoSelect>
    </NekoSettings>;

  const jsxAIEnvironmentModelVisionDefault =
    <NekoSettings title={i18n.COMMON.MODEL}>
      <NekoSelect scrolldown name="ai_vision_default_model"
        value={ai_vision_default_model} onChange={updateOption}>
        {visionModels.map((x) => (
          <NekoOption key={x.model} value={x.model} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>;

  const jsxAIEnvironmentModelAudioDefault =
    <NekoSettings title={i18n.COMMON.MODEL}>
      <NekoSelect scrolldown name="ai_audio_default_model"
        value={ai_audio_default_model} onChange={updateOption}>
        {audioModels.map((x) => (
          <NekoOption key={x.model} value={x.model} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>;

  const jsxAIEnvironmentModelJsonDefault =
    <NekoSettings title={i18n.COMMON.MODEL}>
      <NekoSelect scrolldown name="ai_json_default_model"
        value={ai_json_default_model} onChange={updateOption}>
        {jsonModels.map((x) => (
          <NekoOption key={x.model} value={x.model} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>;

  const jsxAIEnvironmentModelImagesDefault =
    <NekoSettings title={i18n.COMMON.MODEL}>
      <NekoSelect scrolldown name="ai_images_default_model"
        value={ai_images_default_model} onChange={updateOption}>
        {imageModels.map((x) => (
          <NekoOption key={x.model} value={x.model} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>;

  const jsxBannedIPs =
    <NekoSettings title={i18n.COMMON.BANNED_IPS}>
      <NekoInput id="banned_ips" name="banned_ips" value={banned_ips}
        isCommaSeparatedArray={true}
        description={i18n.HELP.BANNED_IPS}
        onBlur={updateOption} />
    </NekoSettings>;

  const jsxAdminBarPlayground =
    <NekoSettings title={i18n.COMMON.PLAYGROUND}>
      <NekoCheckbox label={i18n.COMMON.ENABLE} value="1"
        checked={admin_bar?.playground}
        onChange={(value) => {
          const freshAdminBar = { ...admin_bar, playground: value };
          updateOption(freshAdminBar, 'admin_bar');
        }} />
    </NekoSettings>;

  const jsxAdminBarGenerateContent =
    <NekoSettings title={i18n.COMMON.GENERATE_CONTENT}>
      <NekoCheckbox label={i18n.COMMON.ENABLE} value="1"
        checked={admin_bar?.content_generator}
        onChange={(value) => {
          const freshAdminBar = { ...admin_bar, content_generator: value };
          updateOption(freshAdminBar, 'admin_bar');
        }} />
    </NekoSettings>;

  const jsxAdminBarGenerateImages =
    <NekoSettings title={i18n.COMMON.GENERATE_IMAGES}>
      <NekoCheckbox label={i18n.COMMON.ENABLE} value="1"
        checked={admin_bar?.images_generator}
        onChange={(value) => {
          const freshAdminBar = { ...admin_bar, images_generator: value };
          updateOption(freshAdminBar, 'admin_bar');
        }} />
    </NekoSettings>;

  const jsxAdminBarSettings =
    <NekoSettings title={'AI Engine'}>
      <NekoCheckbox label={i18n.COMMON.ENABLE} value="1"
        checked={admin_bar?.settings}
        onChange={(value) => {
          const freshAdminBar = { ...admin_bar, settings: value };
          updateOption(freshAdminBar, 'admin_bar');
        }} />
    </NekoSettings>;

  const jsxOpenAiUsage = <div>
    <MonthlyUsage options={options} />
    <div style={{ fontSize: 12, marginTop: 15, lineHeight: 1.3, color: '#666' }}>
      {toHTML(i18n.COMMON.USAGE_HELP)}
    </div>
  </div>;

  const jsxAIEnvironmentDefault = <>
    <NekoSpacer height={5} />
    <NekoSettings title={i18n.COMMON.ENVIRONMENT}>
      <NekoSelect scrolldown name="ai_default_env" value={ai_default_env} onChange={updateOption}>
        {ai_envs.map((x) => (
          <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>
  </>;

  const jsxAIEnvironmentFastDefault = <>
    <NekoSpacer height={5} />
    <NekoSettings title={i18n.COMMON.ENVIRONMENT}>
      <NekoSelect scrolldown name="ai_fast_default_env" value={ai_fast_default_env} onChange={updateOption}>
        {ai_envs.map((x) => (
          <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>
  </>;

  const jsxAIEnvironmentEmbeddingsDefault = <>
    <NekoSpacer height={5} />
    <NekoSettings title={i18n.COMMON.ENVIRONMENT}>
      <NekoSelect scrolldown name="ai_embeddings_default_env" value={ai_embeddings_default_env} onChange={updateOption}>
        {ai_envs.map((x) => (
          <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>
  </>;

  const jsxAIEnvironmentVisionDefault = <>
    <NekoSpacer height={5} />
    <NekoSettings title={i18n.COMMON.ENVIRONMENT}>
      <NekoSelect scrolldown name="ai_vision_default_env" value={ai_vision_default_env} onChange={updateOption}>
        {ai_envs.map((x) => (
          <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>
  </>;

  const jsxAIEnvironmentAudioDefault = <>
    <NekoSpacer height={5} />
    <NekoSettings title={i18n.COMMON.ENVIRONMENT}>
      <NekoSelect scrolldown name="ai_audio_default_env" value={ai_audio_default_env} onChange={updateOption}>
        {ai_envs.map((x) => (
          <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>
  </>;

  const jsxAIEnvironmentJsonDefault = <>
    <NekoSpacer height={5} />
    <NekoSettings title={i18n.COMMON.ENVIRONMENT}>
      <NekoSelect scrolldown name="ai_json_default_env" value={ai_json_default_env} onChange={updateOption}>
        {ai_envs.map((x) => (
          <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>
  </>;

  const jsxAIEnvironmentImagesDefault = <>
    <NekoSpacer height={5} />
    <NekoSettings title={i18n.COMMON.ENVIRONMENT}>
      <NekoSelect scrolldown name="ai_images_default_env" value={ai_images_default_env} onChange={updateOption}>
        {ai_envs.map((x) => (
          <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
        ))}
      </NekoSelect>
    </NekoSettings>
  </>;

  const jsxKnoweldgeEnvironmentDefault =
    <NekoSelect scrolldown name="embeddings_default_env" value={embeddings_default_env} onChange={updateOption}>
      {embeddings_envs.map((x) => (
        <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
      ))}
    </NekoSelect>;

  const jsxCleanUninstall =
    <NekoSettings title={i18n.COMMON.PLUGIN_DATA}>
      <NekoCheckboxGroup max="1">
        <NekoCheckbox name="clean_uninstall" label={i18n.COMMON.DELETE_ALL} description={i18n.COMMON.PLUGIN_DATA_DESCRIPTION} value="1" checked={clean_uninstall} onChange={updateOption} />
      </NekoCheckboxGroup>
    </NekoSettings>;

  return (

    <NekoPage>

      <AiNekoHeader options={options} />

      <NekoWrapper>

        <NekoColumn fullWidth>

          <OptionsCheck options={options} />

          {intro_message && <NekoContainer>
            {toHTML(i18n.SETTINGS.INTRO)}
          </NekoContainer>}

          <NekoTabs keepTabOnReload={true}>

            <NekoTab key="dashboard" title={i18n.COMMON.DASHBOARD}>
              <NekoWrapper>

                <NekoColumn minimal>

                  <NekoBlock busy={busy} title={i18n.COMMON.CLIENT_MODULES} className="primary">
                    <p>{i18n.SETTINGS.MODULES_INTRO}</p>
                    <NekoSpacer />
                    {jsxChatbot}
                    {jsxForms}
                  </NekoBlock>

                  <NekoBlock busy={busy} title={i18n.COMMON.SERVER_MODULES} className="primary">
                    <p>{i18n.SETTINGS.MODULES_INTRO}</p>
                    <NekoSpacer />
                    {jsxInsights}
                    {jsxKnoweldge}
                    {jsxFinetunes}
                    {jsxModeration}
                    {jsxAssistants}
                  </NekoBlock>

                  <NekoBlock busy={busy} title={i18n.COMMON.BACKEND_MODULES} className="primary">
                    <p>{i18n.SETTINGS.MODULES_INTRO}</p>
                    <NekoSpacer />
                    {jsxAdvisors}
                    {jsxGenerators}
                    {jsxPlayground}
                    {jsxUtilities}
                    {jsxTranscribe}
                  </NekoBlock>

                </NekoColumn>

                <NekoColumn minimal>
                  <NekoBlock busy={busy} title={i18n.COMMON.USAGE} className="primary"
                    action={<><div>
                      <NekoButton className="danger" style={{ marginLeft: 5 }} disabled={busy}
                        onClick={async () => {
                          if (window.confirm(i18n.COMMON.RESET_USAGE_SURE)) {
                            await updateOption([], 'ai_models_usage');
                          }
                        }
                        }>{i18n.COMMON.RESET}</NekoButton></div></>}>
                    {jsxOpenAiUsage}
                  </NekoBlock>
                </NekoColumn>

              </NekoWrapper>
            </NekoTab>

            {module_chatbots && <NekoTab key="chatbots" title={i18n.COMMON.CHATBOTS}>
              <Chatbots options={options} updateOption={updateOption} busy={busy} />
            </NekoTab>}

            {module_chatbots && chatbot_discussions &&
              <NekoTab key="discussions" title={i18n.COMMON.DISCUSSIONS}>
                <Discussions />
              </NekoTab>
            }

            {module_statistics && <NekoTab key="insights" title={i18n.COMMON.INSIGHTS}>
              <Insights options={options} updateOption={updateOption} busy={busy} />
            </NekoTab>}

            {module_embeddings && <NekoTab key="knowledge" title={i18n.COMMON.KNOWLEDGE}>
              <Embeddings
                options={options}
                updateEnvironment={updateVectorDbEnvironment}
                updateOption={updateOption}
              />
            </NekoTab>}

            {module_assistants && <NekoTab key="assistants" title={i18n.COMMON.ASSISTANTS}>
              <Assistants options={options} updateOption={updateOption} refreshOptions={refreshOptions} />
            </NekoTab>}

            {module_finetunes && <NekoTab key="finetunes" title={i18n.COMMON.FINETUNES}>
              <FineTunes options={options} updateOption={updateOption} refreshOptions={refreshOptions} />
            </NekoTab>}

            {module_moderation && <NekoTab key="moderation" title={i18n.COMMON.MODERATION}>
              <Moderation options={options} updateOption={updateOption} busy={busy} />
            </NekoTab>}

            {module_transcription && <NekoTab key="transcription" title={i18n.COMMON.TRANSCRIPTION}>
              <Transcription options={options} updateOption={updateOption} />
            </NekoTab>}

            {module_addons && <NekoTab key="addons" title={i18n.COMMON.ADDONS}>
              <Addons addons={options?.addons} updateOption={updateOption} />
            </NekoTab>}

            <NekoTab key="settings" title={i18n.COMMON.SETTINGS}>

              <NekoWrapper>

                <NekoColumn minimal fullWidth style={{ paddingLeft: 10, paddingTop: 10 }}>
                  <NekoQuickLinks inversed name="quicklinks"
                    value={settingsSection} onChange={setSettingsSection}>
                    <NekoLink title="AI" value="ai" />
                    {module_chatbots && <NekoLink title="Chatbot" value="chatbot" />}
                    {module_embeddings && <NekoLink title="Knowledge" value="knowledge" />}
                    <NekoLink title="Files & Media" value="files" />
                    <NekoLink title={i18n.COMMON.OTHERS} value="others" />
                  </NekoQuickLinks>
                </NekoColumn>

                <NekoColumn minimal fullWidth>
                  <NekoWrapper>
                    <NekoColumn minimal style={{ flex: 1 }}>

                      {settingsSection === 'ai' && <>
                        <AIEnvironmentsSettings busy={busy}
                          options={options}
                          environments={ai_envs}
                          updateEnvironment={updateAIEnvironment}
                          updateOption={updateOption}
                        />

                        <div style={{ padding: '0px 10px 15px 10px', marginTop: 13, marginBottom: 5}}>
                          <NekoTypo h2 style={{ color: 'white', marginBottom: 15 }}>{i18n.COMMON.AI_ENVIRONMENT_DEFAULTS}</NekoTypo>
                          <NekoTabs inversed>

                            <NekoTab key="ai" title={i18n.COMMON.DEFAULT} busy={busy}>
                              {jsxAIEnvironmentDefault}
                              {jsxAIEnvironmentModelDefault}
                            </NekoTab>

                            <NekoTab key="fast" title={i18n.COMMON.DEFAULT_FAST} busy={busy}>
                              {jsxAIEnvironmentFastDefault}
                              {jsxAIEnvironmentModelFastDefault}
                            </NekoTab>

                            <NekoTab key="vision" title={i18n.COMMON.VISION} busy={busy}>
                              {jsxAIEnvironmentVisionDefault}
                              {jsxAIEnvironmentModelVisionDefault}
                            </NekoTab>

                            <NekoTab key="images" title={i18n.COMMON.IMAGES} busy={busy}>
                              {jsxAIEnvironmentImagesDefault}
                              {jsxAIEnvironmentModelImagesDefault}
                            </NekoTab>

                            <NekoTab key="embeddings" title={i18n.COMMON.EMBEDDINGS} busy={busy}>
                              {jsxAIEnvironmentEmbeddingsDefault}
                              {jsxAIEnvironmentModelEmbeddingsDefault}
                              {jsxAIEnvironmentDimensionsEmbeddingsDefault}
                            </NekoTab>

                            <NekoTab key="audio" title={i18n.COMMON.AUDIO} busy={busy}>
                              {jsxAIEnvironmentAudioDefault}
                              {jsxAIEnvironmentModelAudioDefault}
                            </NekoTab>

                            <NekoTab key="json" title={i18n.COMMON.JSON} busy={busy}>
                              {jsxAIEnvironmentJsonDefault}
                              {jsxAIEnvironmentModelJsonDefault}
                            </NekoTab>

                          </NekoTabs>
                        </div>
                      </>}

                      {settingsSection === 'knowledge' && module_embeddings && <>
                        <EmbeddingsEnvironmentsSettings busy={busy} options={options}
                          environments={embeddings_envs}
                          updateEnvironment={updateVectorDbEnvironment}
                          updateOption={updateOption}
                        />
                        <NekoBlock busy={busy} title={i18n.COMMON.EMBEDDINGS_ENVIRONMENT_DEFAULT} className="primary">
                          {jsxKnoweldgeEnvironmentDefault}
                        </NekoBlock>
                      </>}

                      {settingsSection === 'chatbot' && <>
                        <NekoBlock busy={busy} title={i18n.COMMON.CHATBOT} className="primary">
                          {jsxShortcodeDiscussions}
                          {jsxShortcodeSyntaxHighlighting}
                          {jsxWebSpeechAPI}
                          {jsxVirtualKeyboardFix}
                          {jsxChatbotGDPRConsent}
                          {chatbot_gdpr_consent && <>
                            {jsxChatbotGDPRMessage}
                            {jsxChatbotGDPRButton}
                          </>}
                        </NekoBlock>
                      </>}

                      {settingsSection === 'files' &&
                        <NekoBlock busy={busy} title={i18n.COMMON.IMAGES_AND_FILES} className="primary">
                          <p><b>Uploaded by Users</b></p>
                          {jsxImageLocalUpload}
                          {jsxImageRemoteUpload}
                          {jsxImageExpiration}
                          <p><b>Generated by AI</b></p>
                          {jsxImageLocalDownload}
                          {options?.image_local_download !== null && jsxImageExpirationDownload}
                        </NekoBlock>
                      }

                      {settingsSection === 'others' &&
                        <NekoBlock busy={busy} title={i18n.COMMON.USER_INTERFACE} className="primary">
                          {jsxIntroMessage}
                          {jsxAddOns}
                        </NekoBlock>
                      }

                      {settingsSection === 'others' && module_statistics && (
                        <NekoBlock busy={busy} title={i18n.COMMON.INSIGHTS} className="primary">
                          <p>{i18n.HELP.STATISTICS}</p>
                          {jsxStatisticsData}
                          {jsxStatisticsFormsData}
                        </NekoBlock>
                      )}

                      {settingsSection === 'others' &&
                        <NekoBlock busy={busy} title={i18n.COMMON.ADMIN_TOOLS} className="primary">
                          <NekoCollapsableCategory title={i18n.COMMON.ADMIN_BAR} />
                          {jsxAdminBarSettings}
                          {jsxAdminBarPlayground}
                          {jsxAdminBarGenerateContent}
                          {jsxAdminBarGenerateImages}
                        </NekoBlock>
                      }

                      {settingsSection === 'others' &&
                      <NekoBlock busy={busy} title={i18n.COMMON.MAINTENANCE} className="primary">

                        <NekoButton className="blue" onClick={onExportSettings}>
                          Export Settings
                        </NekoButton>

                        <NekoButton className="danger" onClick={onImportSettings}>
                          Import Settings
                        </NekoButton>

                        <NekoButton className="danger" onClick={onResetSettings}>
                          Reset Settings
                        </NekoButton>

                      </NekoBlock>
                      }

                    </NekoColumn>

                    <NekoColumn minimal style={{ flex: 1 }}>

                      {settingsSection === 'ai' && <>
                        <NekoBlock busy={busy} title={i18n.COMMON.GENERAL} className="primary">
                          {jsxStream}
                        </NekoBlock>
                      </>}

                      {settingsSection === 'knowledge' && module_embeddings && <>
                      </>}

                      {settingsSection === 'chatbot' && <>
                        {chatbot_discussions &&
                          <NekoBlock busy={busy} title={i18n.COMMON.DISCUSSIONS} className="primary">
                            {jsxDiscussionSummary}
                          </NekoBlock>
                        }

                        <NekoBlock busy={busy} title={i18n.COMMON.USER_INTERFACE} className="primary">
                          {jsxChatbotSelection}
                        </NekoBlock>
                      </>}

                      {settingsSection === 'others' &&
                        <NekoBlock busy={busy} title={i18n.COMMON.ADVANCED} className="primary">
                          {jsxResolveShortcodes}
                          {jsxContextMaxTokens}
                          {jsxPublicAPI}
                          {jsxBearerToken}
                          {jsxDevTools}
                          {jsxCleanUninstall}
                        </NekoBlock>
                      }

                      {settingsSection === 'others' &&
                        <NekoBlock busy={busy} title={i18n.COMMON.SECURITY} className="primary">
                          {jsxPrivacyFirst}
                          {jsxBannedKeywords}
                          {banned_words?.length > 0 && jsxIgnoreWordBoundaries}
                          {jsxBannedIPs}
                        </NekoBlock>
                      }

                    </NekoColumn>

                  </NekoWrapper>
                </NekoColumn>

              </NekoWrapper>
            </NekoTab>

            {module_devtools && <NekoTab key="devtools" title={i18n.COMMON.DEV_TOOLS}>
              <DevToolsTab options={options} setOptions={setOptions} updateOption={updateOption} />
            </NekoTab>}

            <NekoTab key="license" title={i18n.COMMON.LICENSE_TAB}>
              <LicenseBlock domain={domain} prefix={prefix} isPro={isPro} isRegistered={isRegistered} />
            </NekoTab>

          </NekoTabs>

        </NekoColumn>

      </NekoWrapper>

      <NekoModal isOpen={error}
        title={i18n.COMMON.ERROR}
        content={error}
        onRequestClose={() => setError(false)}
        okButton={{
          label: "Close",
          onClick: () => setError(false)
        }}
      />

    </NekoPage>
  );
};

export default Settings;