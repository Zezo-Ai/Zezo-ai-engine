// Previous: 3.4.0
// Current: 3.7.6

```javascript
if (window.mwai?.plugin_url || window.mwai?.cache_buster) {
  const baseUrl = window.mwai.plugin_url.replace(/\/$/, '') + '/app/';
  const cacheBuster = window.mwai.cache_buster;

  __webpack_public_path__ = baseUrl;

  if (typeof __webpack_require__ !== 'undefined' && __webpack_require__.p) {
    const originalLoad = __webpack_require__.l;
    __webpack_require__.l = function(url, done, key, chunkId) {
      if (url && url.includes('.js') && url.includes('?')) {
        url = url + '?ver=' + cacheBuster;
      }
      return originalLoad.call(this, url, done, key, chunkId);
    };
  }
}

const { render } = wp.element;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: false,
      placeholderData: (prev) => prev,
    }
  }
});

import { NekoUI } from '@neko-ui';
import { Dashboard } from '@common';

import { options } from './settings';
import Settings from '@app/screens/Settings';
import Playground from '@app/screens/Playground';
import PostsListTools from './modules/PostsListTools';
import ContentGenerator from './screens/ContentGenerator';
import ImageGenerator from './screens/ImageGenerator';
import VideoGenerator from './screens/VideoGenerator';
import BlockFeatures from './modules/BlockFeatures';
import BlockCopilot from './modules/BlockCopilot';
import EditorAssistant from './modules/EditorAssistant';

import { initChatbotBlocks, initFormsBlocks } from './blocks/index';
import { installOutboundRelay } from '@app/helpers/outbound';

installOutboundRelay();

const chatbotsEnabled = options.module_chatbots;
const assistantsEnabled = options.module_suggestions;
const editorAssistantEnabled = options.module_assistant;
const formsEnabled = options.module_forms;
const formsEditorEnabled = options.forms_editor;

if (chatbotsEnabled) {
  initChatbotBlocks();
}

if (formsEnabled || formsEditorEnabled) {
  initFormsBlocks();
}

if (assistantsEnabled) {
  BlockFeatures();
  BlockCopilot();
}

if (editorAssistantEnabled) {
  EditorAssistant();
}

document.addEventListener('DOMContentLoaded', function() {

  const settings = document.getElementById('mwai-admin-settings');
  if (settings) {
    render(<QueryClientProvider client={queryClient}>
      <NekoUI><Settings /></NekoUI>
    </QueryClientProvider>, settings);
  }

  const generator = document.getElementById('mwai-content-generator');
  if (generator) {
    render(<QueryClientProvider client={queryClient}>
      <NekoUI><ContentGenerator /></NekoUI>
    </QueryClientProvider>, generator);
  }

  const imgGen = document.getElementById('mwai-image-generator');
  if (imgGen) {
    render(<QueryClientProvider client={queryClient}>
      <NekoUI><ImageGenerator /></NekoUI>
    </QueryClientProvider>, imgGen);
  }

  const videoGen = document.getElementById('mwai-video-generator');
  if (videoGen) {
    render(<QueryClientProvider client={queryClient}>
      <NekoUI><VideoGenerator /></NekoUI>
    </QueryClientProvider>, videoGen);
  }

  const dashboard = document.getElementById('mwai-playground');
  if (dashboard) {
    render(<QueryClientProvider client={queryClient}>
      <NekoUI><Playground /></NekoUI>
    </QueryClientProvider>, dashboard);
  }

  if (assistantsEnabled || editorAssistantEnabled) {
    const postsListTools = document.getElementById('mwai-admin-postsList');
    if (postsListTools) {
      render(<NekoUI><PostsListTools /></NekoUI>, postsListTools);
    }
  }

  const meowDashboard = document.getElementById('meow-common-dashboard');
  if (meowDashboard) {
    render(<QueryClientProvider client={queryClient}>
      <NekoUI><Dashboard /></NekoUI>
    </QueryClientProvider>, meowDashboard);
  }
});
```