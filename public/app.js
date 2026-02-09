// Game State
const gameState = {
  round: 1,
  stars: 0,
  strikes: 0,
  ended: false,
  endType: null, // 'success' or 'failure'
  history: []
};

// DOM Elements
const videoContainer = document.getElementById('video-container');
const bgVideoA = document.getElementById('bgVideoA');
const bgVideoB = document.getElementById('bgVideoB');
const chatPanel = document.getElementById('chat-panel');
const chatHistory = document.getElementById('chat-history');
const suggestedReplies = document.getElementById('suggested-replies');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const draftPreview = document.getElementById('draft-preview');
const clearChipsBtn = document.getElementById('clear-chips-btn');
const generateSuggestionsBtn = document.getElementById('generate-suggestions-btn');
const introCard = document.getElementById('intro-card');
const startBtn = document.getElementById('start-btn');
const mainContent = document.getElementById('main-content');
const moreOptionsBtn = document.getElementById('more-options-btn');
const advancedTools = document.getElementById('advanced-tools');
const thoughtBubble = document.getElementById('thoughtBubble');
const thoughtBubbleText = thoughtBubble.querySelector('.thoughtBubble__text');
const llmStatus = document.getElementById('llm-status');
const endOverlay = document.getElementById('end-overlay');
const endMessage = endOverlay.querySelector('.end-message');
const debugBtn = document.getElementById('debug-btn');
const debugPanel = document.getElementById('debug-panel');
const debugContent = document.getElementById('debug-content');
const debugClose = document.getElementById('debug-close');
const debugReset = document.getElementById('debug-reset');
const debugCopyCss = document.getElementById('debug-copy-css');
const debugCopyJson = document.getElementById('debug-copy-json');
const showOverlay = document.getElementById('show-overlay');
const safeAreaOverlay = document.getElementById('safe-area-overlay');
const hudElement = document.querySelector('.hud');
const langEnBtn = document.getElementById('lang-en');
const langZhTwBtn = document.getElementById('lang-zh-tw');

// Video paths
const VIDEO_PATHS = {
  base: '/assets/motion/kid_base.mp4',
  good: '/assets/motion/kid_good.mp4',
  confused: '/assets/motion/kid_confused.mp4',
  sad: '/assets/motion/kid_sad.mp4',
  open: '/assets/motion/kid_open.mp4',
  close: '/assets/motion/kid_close.mp4'
};

// Video manager state
let currentVideoEl = bgVideoA;
let nextVideoEl = bgVideoB;
let isVideoTransitioning = false;
let lastLLMResponse = null;
let isInitialLoad = true;
let interventionHistory = []; // Store each intervention with its result
let currentLLMStatus = 'ready';
let lastSuggestedReplies = [];

// UI Tuning state
const uiTuneDefaults = {
  // Chat panel positioning
  chatPanelX: '',
  chatPanelY: 3,
  chatPanelW: 870,
  chatPanelH: 1397,
  chatPanelScale: 1.01,
  
  // Chat frame safe-area padding
  chatPadTop: 99,
  chatPadRight: 25,
  chatPadBottom: 33,
  chatPadLeft: 26,
  
  // HUD tuning
  hudTopOffset: -50,
  hudPaddingTop: 20,
  hudTitleFontSize: 40,
  hudIconSize: 38,
  hudIconGap: 18,
  hudRowGap: 0,
  hudJustify: 'center',
  starIconSize: 60,
  xIconSize: 60,
  
  // Font sizes
  suggestedItemFontSize: 28,
  inputFontSize: 28,
  messageFontSize: 28,
  
  // Intro card font sizes
  introTitleFontSize: 24,
  introSubtitleFontSize: 16,
  introButtonFontSize: 16,
  
  // Chip font size
  chipFontSize: 28,
  
  // Thought bubble tuning
  thoughtX: 55, // percentage
  thoughtY: 26, // percentage
  thoughtWidth: 260,
  thoughtFontSize: 28,
  thoughtDurationMs: 300,
  
  // Background stage tuning
  stageScale: 1.78,
  stageOffsetX: 200,
  stageOffsetY: 8,
  
  // Video fit
  videoFit: 'contain',
  
  // Welcome image tuning
  welcomeX: 42, // percentage
  welcomeY: 51, // percentage
  welcomeMaxWidth: 80, // percentage
  welcomeMaxHeight: 80, // percentage
  welcomeScale: 0.8,

  // Base design size (used to scale layout)
  designWidth: 2560,
  designHeight: 1426
};

let uiTune = { ...uiTuneDefaults };
let debugMode = false;
const isDebugRoute = window.location.pathname.endsWith('/debug');
const useSavedTune = isDebugRoute && new URLSearchParams(window.location.search).get('useSaved') === '1';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTonePrefix(tone) {
  const key = `debugTuner.tonePrefix.${tone}`;
  return t(key);
}

function stripTonePrefix(text) {
  const prefixes = [
    translations.en.debugTuner.tonePrefix.reassure,
    translations.en.debugTuner.tonePrefix.praise,
    translations.en.debugTuner.tonePrefix.warn,
    translations.zh_TW.debugTuner.tonePrefix.reassure,
    translations.zh_TW.debugTuner.tonePrefix.praise,
    translations.zh_TW.debugTuner.tonePrefix.warn
  ].filter(Boolean);
  if (!prefixes.length) return text;
  const pattern = `^(${prefixes.map(escapeRegExp).join('|')})\\s*`;
  return text.replace(new RegExp(pattern, 'i'), '');
}

function updateLanguageButtons() {
  const currentLang = getLanguage();
  if (langEnBtn) langEnBtn.classList.toggle('active', currentLang === 'en');
  if (langZhTwBtn) langZhTwBtn.classList.toggle('active', currentLang === 'zh_TW');
}

function updateLanguageSpecificElements() {
  if (messageInput) messageInput.placeholder = t('input.placeholder');
  if (draftPreview) {
    const placeholder = t('draft.placeholder');
    const currentText = draftPreview.textContent.trim();
    if (!currentText || currentText === translations.en.draft.placeholder || currentText === translations.zh_TW.draft.placeholder) {
      draftPreview.textContent = placeholder;
    }
  }
  updateMoreOptionsButton();
  updateLLMStatus(currentLLMStatus);
  updateLanguageButtons();
  if (lastSuggestedReplies.length) {
    updateSuggestedReplies(lastSuggestedReplies);
  }
  if (debugMode) {
    renderDebugTuner();
    updateSafeAreaOverlay();
  }
}

window.updateLanguageSpecificElements = updateLanguageSpecificElements;

// Chip state
const chipState = {
  tone: null,
  strategy: null,
  action: []
};

// Preload videos for smoother transitions
function preloadVideo(src) {
  const video = document.createElement('video');
  video.src = src;
  video.preload = 'auto';
  video.style.position = 'absolute';
  video.style.top = '-9999px';
  video.style.width = '1px';
  video.style.height = '1px';
  video.load();
  document.body.appendChild(video);
  // Clean up after a delay
  setTimeout(() => {
    document.body.removeChild(video);
  }, 10000);
}

// Preload all emotion and ending videos on init
function preloadAllVideos() {
  preloadVideo(VIDEO_PATHS.good);
  preloadVideo(VIDEO_PATHS.confused);
  preloadVideo(VIDEO_PATHS.sad);
  preloadVideo(VIDEO_PATHS.open);
  preloadVideo(VIDEO_PATHS.close);
}

// Video manager: crossfade without black frames
async function playScene(src, options = {}) {
  const {
    loop = false,
    returnToBase = false,
    onEnded = null
  } = options;

  if (isVideoTransitioning) {
    console.warn('Video transition already in progress');
    return Promise.resolve();
  }

  isVideoTransitioning = true;

  return new Promise((resolve) => {
    // Clean up previous event listeners from nextVideoEl
    const oldCanPlay = nextVideoEl.oncanplay;
    const oldPlaying = nextVideoEl.onplaying;
    const oldEnded = nextVideoEl.onended;
    const oldError = nextVideoEl.onerror;
    
    nextVideoEl.oncanplay = null;
    nextVideoEl.onplaying = null;
    nextVideoEl.onended = null;
    nextVideoEl.onerror = null;

    // Set up new video
    nextVideoEl.src = src;
    nextVideoEl.loop = loop;

    // Timeout fallback (2 seconds)
    let timeoutFired = false;
    const timeout = setTimeout(() => {
      if (!timeoutFired) {
        timeoutFired = true;
        console.warn('Video canplay timeout, attempting to play anyway');
        attemptPlay();
      }
    }, 2000);

    // Handle canplay event
    const handleCanPlay = () => {
      if (timeoutFired) return;
      clearTimeout(timeout);
      attemptPlay();
    };

    // Attempt to play and crossfade
    const attemptPlay = () => {
      nextVideoEl.play().then(() => {
        // Crossfade: next becomes active, current becomes inactive
        nextVideoEl.classList.add('bgVideo--active');
        currentVideoEl.classList.remove('bgVideo--active');

        // Swap references
        const temp = currentVideoEl;
        currentVideoEl = nextVideoEl;
        nextVideoEl = temp;

        // Set up ended handler if provided
        if (onEnded) {
          currentVideoEl.onended = () => {
            onEnded();
            if (returnToBase) {
              playScene(VIDEO_PATHS.base, { loop: true });
            }
            resolve();
            isVideoTransitioning = false;
          };
        } else if (returnToBase) {
          currentVideoEl.onended = () => {
            playScene(VIDEO_PATHS.base, { loop: true });
            resolve();
            isVideoTransitioning = false;
          };
        } else {
          if (!loop) {
            currentVideoEl.onended = () => {
              resolve();
              isVideoTransitioning = false;
            };
          } else {
            resolve();
            isVideoTransitioning = false;
          }
        }

        // Clean up
        nextVideoEl.oncanplay = null;
      }).catch(err => {
        console.error('Video play error:', err);
        clearTimeout(timeout);
        isVideoTransitioning = false;
        resolve();
      });
    };

    // Set up event listeners
    nextVideoEl.oncanplay = handleCanPlay;
    nextVideoEl.onerror = (e) => {
      console.error('Video load error:', e);
      clearTimeout(timeout);
      isVideoTransitioning = false;
      resolve();
    };

    // Load the video
    nextVideoEl.load();

    // If video is already ready, trigger immediately
    if (nextVideoEl.readyState >= 3) {
      handleCanPlay();
    }
  });
}

// Load UI tuning from localStorage
function loadUITune() {
  if (useSavedTune) {
    try {
      const saved = localStorage.getItem('uiTune');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Keep saved videoFit as-is; do not coerce on load
        // Convert legacy % values to px for fixed sizing
        if (typeof parsed.chatPanelW === 'number' && parsed.chatPanelW <= 100) {
          parsed.chatPanelW = Math.round((window.innerWidth || 0) * (parsed.chatPanelW / 100));
        }
        if (typeof parsed.chatPanelH === 'number' && parsed.chatPanelH <= 100) {
          parsed.chatPanelH = Math.round((window.innerHeight || 0) * (parsed.chatPanelH / 100));
        }
        uiTune = { ...uiTuneDefaults, ...parsed };
        applyUITune();
        return;
      }
    } catch (e) {
      console.error('Failed to load uiTune:', e);
    }
  }
  uiTune = { ...uiTuneDefaults };
  if (isDebugRoute && useSavedTune) {
    localStorage.setItem('uiTune', JSON.stringify(uiTune));
  }
  applyUITune();
}

function applyLayoutScale() {
  const designW = uiTune.designWidth || uiTuneDefaults.designWidth;
  const designH = uiTune.designHeight || uiTuneDefaults.designHeight;
  const vv = window.visualViewport;
  const viewportW = vv ? vv.width * vv.scale : (window.innerWidth || designW);
  const viewportH = vv ? vv.height * vv.scale : (window.innerHeight || designH);
  const scale = Math.min(viewportW / designW, viewportH / designH);
  const root = document.documentElement;
  root.style.setProperty('--design-w', `${designW}px`);
  root.style.setProperty('--design-h', `${designH}px`);
  root.style.setProperty('--layout-scale', scale.toFixed(4));
}

// Apply UI tuning to CSS variables
function applyUITune() {
  const root = document.documentElement;
  
  // Chat panel positioning
  root.style.setProperty('--chat-panel-y', `${uiTune.chatPanelY}`);
  root.style.setProperty('--chat-panel-w-px', `${uiTune.chatPanelW}px`);
  root.style.setProperty('--chat-panel-h-px', `${uiTune.chatPanelH}px`);
  root.style.setProperty('--chat-panel-scale', uiTune.chatPanelScale);
  
  // Grid layout handles X; keep panel aligned in flow
  chatPanel.style.left = 'auto';
  chatPanel.style.right = '0';
  chatPanel.style.top = `${uiTune.chatPanelY}px`;
  chatPanel.style.marginTop = '0';
  chatPanel.style.height = `${uiTune.chatPanelH}px`;
  chatPanel.style.width = `${uiTune.chatPanelW}px`;
  
  // Chat padding
  root.style.setProperty('--chat-pad-top', `${uiTune.chatPadTop}px`);
  root.style.setProperty('--chat-pad-right', `${uiTune.chatPadRight}px`);
  root.style.setProperty('--chat-pad-bottom', `${uiTune.chatPadBottom}px`);
  root.style.setProperty('--chat-pad-left', `${uiTune.chatPadLeft}px`);
  
  // HUD
  root.style.setProperty('--hud-top-offset', `${uiTune.hudTopOffset}px`);
  root.style.setProperty('--hud-padding-top', `${uiTune.hudPaddingTop || 0}px`);
  root.style.setProperty('--hud-title-font-size', `${uiTune.hudTitleFontSize}px`);
  root.style.setProperty('--hud-icon-size', `${uiTune.hudIconSize}px`);
  root.style.setProperty('--hud-icon-gap', `${uiTune.hudIconGap}px`);
  root.style.setProperty('--hud-row-gap', `${uiTune.hudRowGap}px`);
  root.style.setProperty('--hud-justify', uiTune.hudJustify);
  root.style.setProperty('--star-icon-size', `${uiTune.starIconSize || uiTune.hudIconSize}px`);
  root.style.setProperty('--x-icon-size', `${uiTune.xIconSize || uiTune.hudIconSize}px`);
  
  // Font sizes
  root.style.setProperty('--suggested-item-font-size', `${uiTune.suggestedItemFontSize || 16}px`);
  root.style.setProperty('--input-font-size', `${uiTune.inputFontSize || 14}px`);
  root.style.setProperty('--message-font-size', `${uiTune.messageFontSize || 14}px`);
  
  // Intro card font sizes
  root.style.setProperty('--intro-title-font-size', `${uiTune.introTitleFontSize || 24}px`);
  root.style.setProperty('--intro-subtitle-font-size', `${uiTune.introSubtitleFontSize || 16}px`);
  root.style.setProperty('--intro-button-font-size', `${uiTune.introButtonFontSize || 16}px`);
  
  // Chip font size
  root.style.setProperty('--chip-font-size', `${uiTune.chipFontSize || 12}px`);
  
  // Thought bubble
  root.style.setProperty('--thought-x', `${uiTune.thoughtX}%`);
  root.style.setProperty('--thought-y', `${uiTune.thoughtY}%`);
  root.style.setProperty('--thought-width', `${uiTune.thoughtWidth}px`);
  root.style.setProperty('--thought-font-size', `${uiTune.thoughtFontSize}px`);
  root.style.setProperty('--thought-duration-ms', `${uiTune.thoughtDurationMs}ms`);
  
  // Stage
  root.style.setProperty('--stage-scale', uiTune.stageScale);
  root.style.setProperty('--stage-offset-x', `${uiTune.stageOffsetX}px`);
  root.style.setProperty('--stage-offset-y', `${uiTune.stageOffsetY}px`);
  
  // Video fit
  root.style.setProperty('--video-fit', uiTune.videoFit);
  
  // Welcome image
  root.style.setProperty('--welcome-x', `${uiTune.welcomeX}%`);
  root.style.setProperty('--welcome-y', `${uiTune.welcomeY}%`);
  root.style.setProperty('--welcome-max-width', `${uiTune.welcomeMaxWidth}%`);
  root.style.setProperty('--welcome-max-height', `${uiTune.welcomeMaxHeight}%`);
  root.style.setProperty('--welcome-scale', uiTune.welcomeScale);
  
  applyLayoutScale();
  updateSafeAreaOverlay();
}

// Save UI tuning to localStorage
function saveUITune() {
  if (!isDebugRoute) return;
  try {
    localStorage.setItem('uiTune', JSON.stringify(uiTune));
  } catch (e) {
    console.error('Failed to save uiTune:', e);
  }
}

// Update UI tuning value
function updateUITune(key, value) {
  if (!isDebugRoute) return;
  uiTune[key] = value;
  applyUITune();
  saveUITune();
  if (debugMode) {
    renderDebugTuner();
  }
}

// Update safe area overlay visualization
function updateSafeAreaOverlay() {
  if (!showOverlay || !showOverlay.checked || !chatPanel || !hudElement) {
    if (safeAreaOverlay) safeAreaOverlay.classList.add('hidden');
    return;
  }
  
  safeAreaOverlay.classList.remove('hidden');
  safeAreaOverlay.innerHTML = '';
  
  // Get chat panel position and size
  const chatRect = chatPanel.getBoundingClientRect();
  
  // Draw chat safe area
  const safeAreaBox = document.createElement('div');
  safeAreaBox.className = 'safe-area-box';
  safeAreaBox.style.left = `${chatRect.left + uiTune.chatPadLeft}px`;
  safeAreaBox.style.top = `${chatRect.top + uiTune.chatPadTop}px`;
  safeAreaBox.style.width = `${chatRect.width - uiTune.chatPadLeft - uiTune.chatPadRight}px`;
  safeAreaBox.style.height = `${chatRect.height - uiTune.chatPadTop - uiTune.chatPadBottom}px`;
  
  const safeAreaLabel = document.createElement('div');
  safeAreaLabel.className = 'safe-area-label';
  safeAreaLabel.textContent = t('safeArea.chat');
  safeAreaBox.appendChild(safeAreaLabel);
  safeAreaOverlay.appendChild(safeAreaBox);
  
  // Draw HUD bounding box
  const hudRect = hudElement.getBoundingClientRect();
  const hudBox = document.createElement('div');
  hudBox.className = 'safe-area-box';
  hudBox.style.borderColor = 'rgba(0, 255, 0, 0.6)';
  hudBox.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
  hudBox.style.left = `${hudRect.left}px`;
  hudBox.style.top = `${hudRect.top}px`;
  hudBox.style.width = `${hudRect.width}px`;
  hudBox.style.height = `${hudRect.height}px`;
  
  const hudLabel = document.createElement('div');
  hudLabel.className = 'safe-area-label';
  hudLabel.textContent = t('safeArea.hud');
  hudBox.appendChild(hudLabel);
  safeAreaOverlay.appendChild(hudBox);
  
  // Draw thought bubble anchor point
  const thoughtBubble = document.getElementById('thoughtBubble');
  if (thoughtBubble) {
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) {
      const videoRect = videoContainer.getBoundingClientRect();
      const anchorX = videoRect.left + (videoRect.width * uiTune.thoughtX / 100);
      const anchorY = videoRect.top + (videoRect.height * uiTune.thoughtY / 100);
      
      const anchorBox = document.createElement('div');
      anchorBox.className = 'safe-area-box';
      anchorBox.style.borderColor = 'rgba(255, 165, 0, 0.6)';
      anchorBox.style.backgroundColor = 'rgba(255, 165, 0, 0.1)';
      anchorBox.style.left = `${anchorX - 5}px`;
      anchorBox.style.top = `${anchorY - 5}px`;
      anchorBox.style.width = '10px';
      anchorBox.style.height = '10px';
      anchorBox.style.borderRadius = '50%';
      anchorBox.style.border = '2px solid rgba(255, 165, 0, 0.8)';
      
      const anchorLabel = document.createElement('div');
      anchorLabel.className = 'safe-area-label';
      anchorLabel.textContent = t('safeArea.thoughtBubble');
      anchorLabel.style.transform = 'translate(-50%, -100%)';
      anchorLabel.style.left = '50%';
      anchorBox.appendChild(anchorLabel);
      safeAreaOverlay.appendChild(anchorBox);
    }
  }
}

// Render debug tuner UI
function renderDebugTuner() {
  if (!debugMode) return;

  const getChatPanelWidthInfo = () => ` (${Math.round(uiTune.chatPanelW)}px)`;
  
  const tunerProps = [
    {
      groupKey: 'chatPanelPosition',
      fields: [
        { key: 'chatPanelX', labelKey: 'chatPanelX', min: -500, max: 500, step: 1, isText: true },
        { key: 'chatPanelY', labelKey: 'chatPanelY', min: -200, max: 200, step: 1 },
        { key: 'chatPanelW', labelKey: 'chatPanelW', min: 200, max: 1200, step: 1 },
        { key: 'chatPanelH', labelKey: 'chatPanelH', min: 400, max: 1200, step: 1 },
        { key: 'chatPanelScale', labelKey: 'chatPanelScale', min: 0.7, max: 1.4, step: 0.01 }
      ]
    },
    {
      groupKey: 'chatSafeAreaPadding',
      fields: [
        { key: 'chatPadTop', labelKey: 'chatPadTop', min: 0, max: 100, step: 1 },
        { key: 'chatPadRight', labelKey: 'chatPadRight', min: 0, max: 100, step: 1 },
        { key: 'chatPadBottom', labelKey: 'chatPadBottom', min: 0, max: 100, step: 1 },
        { key: 'chatPadLeft', labelKey: 'chatPadLeft', min: 0, max: 100, step: 1 }
      ]
    },
    {
      groupKey: 'hudTuning',
      fields: [
        { key: 'hudTopOffset', labelKey: 'hudTopOffset', min: -50, max: 50, step: 1 },
        { key: 'hudPaddingTop', labelKey: 'hudPaddingTop', min: 0, max: 20, step: 1 },
        { key: 'hudTitleFontSize', labelKey: 'hudTitleFontSize', min: 10, max: 40, step: 1 },
        { key: 'starIconSize', labelKey: 'starIconSize', min: 20, max: 60, step: 1 },
        { key: 'xIconSize', labelKey: 'xIconSize', min: 20, max: 60, step: 1 },
        { key: 'hudIconGap', labelKey: 'hudIconGap', min: 0, max: 30, step: 1 },
        { key: 'hudRowGap', labelKey: 'hudRowGap', min: 0, max: 30, step: 1 },
        { key: 'hudJustify', labelKey: 'hudJustify', type: 'select', options: ['space-between', 'flex-start', 'flex-end', 'center'] }
      ]
    },
    {
      groupKey: 'fontSizes',
      fields: [
        { key: 'suggestedItemFontSize', labelKey: 'suggestedItemFontSize', min: 12, max: 40, step: 1 },
        { key: 'inputFontSize', labelKey: 'inputFontSize', min: 12, max: 40, step: 1 },
        { key: 'messageFontSize', labelKey: 'messageFontSize', min: 12, max: 40, step: 1 }
      ]
    },
    {
      groupKey: 'introCardFontSizes',
      fields: [
        { key: 'introTitleFontSize', labelKey: 'introTitleFontSize', min: 14, max: 40, step: 1 },
        { key: 'introSubtitleFontSize', labelKey: 'introSubtitleFontSize', min: 12, max: 40, step: 1 },
        { key: 'introButtonFontSize', labelKey: 'introButtonFontSize', min: 12, max: 40, step: 1 }
      ]
    },
    {
      groupKey: 'chipFontSizes',
      fields: [
        { key: 'chipFontSize', labelKey: 'chipFontSize', min: 10, max: 40, step: 1 }
      ]
    },
    {
      groupKey: 'thoughtBubble',
      fields: [
        { key: 'thoughtX', labelKey: 'thoughtX', min: 0, max: 100, step: 1 },
        { key: 'thoughtY', labelKey: 'thoughtY', min: 0, max: 50, step: 1 },
        { key: 'thoughtWidth', labelKey: 'thoughtWidth', min: 150, max: 400, step: 5 },
        { key: 'thoughtFontSize', labelKey: 'thoughtFontSize', min: 10, max: 40, step: 1 },
        { key: 'thoughtDurationMs', labelKey: 'thoughtDurationMs', min: 1000, max: 5000, step: 100 }
      ]
    },
    {
      groupKey: 'backgroundStage',
      fields: [
        { key: 'stageScale', labelKey: 'stageScale', min: 0.5, max: 2, step: 0.01 },
        { key: 'stageOffsetX', labelKey: 'stageOffsetX', min: -200, max: 200, step: 1 },
        { key: 'stageOffsetY', labelKey: 'stageOffsetY', min: -200, max: 200, step: 1 },
        { key: 'videoFit', labelKey: 'videoFit', type: 'select', options: ['contain', 'cover'] }
      ]
    },
    {
      groupKey: 'welcomeImage',
      fields: [
        { key: 'welcomeX', labelKey: 'welcomeX', min: 0, max: 100, step: 1 },
        { key: 'welcomeY', labelKey: 'welcomeY', min: 0, max: 100, step: 1 },
        { key: 'welcomeMaxWidth', labelKey: 'welcomeMaxWidth', min: 10, max: 100, step: 1 },
        { key: 'welcomeMaxHeight', labelKey: 'welcomeMaxHeight', min: 10, max: 100, step: 1 },
        { key: 'welcomeScale', labelKey: 'welcomeScale', min: 0.1, max: 3, step: 0.1 }
      ]
    }
  ];
  
  let html = '';
  tunerProps.forEach(group => {
    html += `<div class="tuner-group">
      <div class="tuner-group-title">${t(`debugTuner.groups.${group.groupKey}`)}</div>`;
    
    group.fields.forEach(field => {
      const value = uiTune[field.key];
      const fieldLabel = field.key === 'chatPanelW'
        ? `${t(`debugTuner.fields.${field.labelKey}`)}${getChatPanelWidthInfo()}`
        : t(`debugTuner.fields.${field.labelKey}`);
      if (field.type === 'select') {
        html += `<div class="tuner-field">
          <label>${fieldLabel}:</label>
          <select data-key="${field.key}">
            ${field.options.map(opt => {
              const optionLabel = t(`debugTuner.options.${field.key}.${opt}`);
              return `<option value="${opt}" ${opt === value ? 'selected' : ''}>${optionLabel}</option>`;
            }).join('')}
          </select>
        </div>`;
      } else if (field.isText) {
        html += `<div class="tuner-field">
          <label>${fieldLabel}:</label>
          <input type="text" data-key="${field.key}" value="${value}" style="flex: 1; padding: 4px 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
        </div>`;
      } else {
        html += `<div class="tuner-field">
          <label>${fieldLabel}:</label>
          <input type="range" data-key="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}">
          <input type="number" data-key="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}">
        </div>`;
      }
    });
    
    html += `</div>`;
  });
  
  debugContent.innerHTML = html;
  
  // Attach event listeners
  debugContent.querySelectorAll('input[type="range"], input[type="number"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      const value = parseFloat(e.target.value);
      updateUITune(key, value);
      
      // Sync range and number inputs
      const pair = debugContent.querySelectorAll(`[data-key="${key}"]`);
      pair.forEach(inp => {
        if (inp !== e.target && inp.type !== 'text') inp.value = value;
      });
    });
  });
  
  debugContent.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      const value = e.target.value;
      updateUITune(key, value);
    });
  });
  
  debugContent.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', (e) => {
      const key = e.target.getAttribute('data-key');
      updateUITune(key, e.target.value);
    });
  });
}

// Copy CSS variables
function copyCSSToClipboard() {
  const panelX = uiTune.chatPanelX === 'auto' || uiTune.chatPanelX === '' ? 'auto' : `${uiTune.chatPanelX}px`;
  const css = `:root {
  --chat-panel-y: ${uiTune.chatPanelY}px;
  --chat-panel-w: ${uiTune.chatPanelW}%;
  --chat-panel-h: ${uiTune.chatPanelH}%;
  --chat-panel-scale: ${uiTune.chatPanelScale};
  --chat-pad-top: ${uiTune.chatPadTop}px;
  --chat-pad-right: ${uiTune.chatPadRight}px;
  --chat-pad-bottom: ${uiTune.chatPadBottom}px;
  --chat-pad-left: ${uiTune.chatPadLeft}px;
  --hud-top-offset: ${uiTune.hudTopOffset}px;
  --hud-padding-top: ${uiTune.hudPaddingTop || 0}px;
  --hud-title-font-size: ${uiTune.hudTitleFontSize}px;
  --hud-icon-size: ${uiTune.hudIconSize}px;
  --star-icon-size: ${uiTune.starIconSize || uiTune.hudIconSize}px;
  --x-icon-size: ${uiTune.xIconSize || uiTune.hudIconSize}px;
  --hud-icon-gap: ${uiTune.hudIconGap}px;
  --hud-row-gap: ${uiTune.hudRowGap}px;
  --hud-justify: ${uiTune.hudJustify};
  --suggested-item-font-size: ${uiTune.suggestedItemFontSize || 16}px;
  --input-font-size: ${uiTune.inputFontSize || 14}px;
  --message-font-size: ${uiTune.messageFontSize || 14}px;
  --thought-x: ${uiTune.thoughtX}%;
  --thought-y: ${uiTune.thoughtY}%;
  --thought-width: ${uiTune.thoughtWidth}px;
  --thought-font-size: ${uiTune.thoughtFontSize}px;
  --thought-duration-ms: ${uiTune.thoughtDurationMs}ms;
  --stage-scale: ${uiTune.stageScale};
  --stage-offset-x: ${uiTune.stageOffsetX}px;
  --stage-offset-y: ${uiTune.stageOffsetY}px;
  --video-fit: ${uiTune.videoFit};
}`;
  
  navigator.clipboard.writeText(css).then(() => {
    alert(t('ui.copyCssSuccess'));
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Copy JSON
function copyJSONToClipboard() {
  const designW = uiTune.designWidth || uiTuneDefaults.designWidth;
  const designH = uiTune.designHeight || uiTuneDefaults.designHeight;
  const viewportW = window.innerWidth || designW;
  const viewportH = window.innerHeight || designH;
  const layoutScale = Math.min(viewportW / designW, viewportH / designH);
  const exported = {
    units: {
      chatPanelY: 'px',
      chatPanelW: 'px',
      chatPanelH: 'px',
      chatPanelScale: 'ratio',
      chatPadTop: 'px',
      chatPadRight: 'px',
      chatPadBottom: 'px',
      chatPadLeft: 'px',
      hudTopOffset: 'px',
      hudPaddingTop: 'px',
      hudTitleFontSize: 'px',
      hudIconSize: 'px',
      hudIconGap: 'px',
      hudRowGap: 'px',
      starIconSize: 'px',
      xIconSize: 'px',
      suggestedItemFontSize: 'px',
      inputFontSize: 'px',
      messageFontSize: 'px',
      introTitleFontSize: 'px',
      introSubtitleFontSize: 'px',
      introButtonFontSize: 'px',
      chipFontSize: 'px',
      thoughtX: '%',
      thoughtY: '%',
      thoughtWidth: 'px',
      thoughtFontSize: 'px',
      thoughtDurationMs: 'ms',
      stageScale: 'ratio',
      stageOffsetX: 'px',
      stageOffsetY: 'px',
      videoFit: 'keyword',
      welcomeX: '%',
      welcomeY: '%',
      welcomeMaxWidth: '%',
      welcomeMaxHeight: '%',
      welcomeScale: 'ratio',
      designWidth: 'px',
      designHeight: 'px',
      layoutScale: 'ratio',
      viewportWidth: 'px',
      viewportHeight: 'px'
    },
    values: {
      ...uiTune,
      layoutScale: Number(layoutScale.toFixed(4)),
      viewportWidth: viewportW,
      viewportHeight: viewportH
    }
  };
  const json = JSON.stringify(exported, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    alert(t('ui.copyJsonSuccess'));
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Reset UI tuning
function resetUITune() {
  if (confirm(t('ui.resetConfirm'))) {
    localStorage.removeItem('uiTune');
    uiTune = { ...uiTuneDefaults };
    applyUITune();
    renderDebugTuner();
  }
}

function updateMoreOptionsButton() {
  if (!moreOptionsBtn || !advancedTools) return;
  moreOptionsBtn.textContent = advancedTools.classList.contains('hidden')
    ? t('more.moreOptions')
    : t('more.lessOptions');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadUITune();
  initializeApp();
});

function initializeApp() {
  // Initial state: show intro card, keep video dark
  chatPanel.classList.add('visible');
  // Video container stays dark (opacity 0, pointer-events none)
  // Intro card is visible, main content is hidden
  
  // Hide main content initially
  if (mainContent) {
    mainContent.classList.add('hidden');
  }
  
  // Render initial progress indicators (hidden in intro card, but prepare)
  renderProgress(0, 0);
  
  // Start button event listener
  if (startBtn) {
    startBtn.addEventListener('click', handleStart);
  }
  
  // More options toggle
  if (moreOptionsBtn) {
    moreOptionsBtn.addEventListener('click', () => {
      if (advancedTools) {
        advancedTools.classList.toggle('hidden');
        updateMoreOptionsButton();
      }
    });
  }
  
  // Event listeners (for when main content is shown)
  sendBtn.addEventListener('click', () => handleSend());
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  
  debugBtn.addEventListener('click', toggleDebug);
  if (debugClose) {
    debugClose.addEventListener('click', () => {
      debugMode = false;
      debugPanel.classList.add('hidden');
      if (safeAreaOverlay) safeAreaOverlay.classList.add('hidden');
    });
  }
  if (debugReset) {
    debugReset.addEventListener('click', resetUITune);
  }
  if (debugCopyCss) {
    debugCopyCss.addEventListener('click', copyCSSToClipboard);
  }
  if (debugCopyJson) {
    debugCopyJson.addEventListener('click', copyJSONToClipboard);
  }
  if (showOverlay) {
    showOverlay.addEventListener('change', () => {
      updateSafeAreaOverlay();
    });
  }

  if (!isDebugRoute) {
    if (debugBtn) debugBtn.classList.add('hidden');
    if (debugPanel) debugPanel.classList.add('hidden');
    if (safeAreaOverlay) safeAreaOverlay.classList.add('hidden');
  }

  if (langEnBtn) {
    langEnBtn.addEventListener('click', () => setLanguage('en'));
  }
  if (langZhTwBtn) {
    langZhTwBtn.addEventListener('click', () => setLanguage('zh_TW'));
  }

  window.addEventListener('languageChanged', () => {
    applyLanguage();
  });
  
  // Update overlay on window resize
  window.addEventListener('resize', () => {
    applyLayoutScale();
    if (showOverlay && showOverlay.checked) {
      updateSafeAreaOverlay();
    }
  });
  
  // Chip button event listeners
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.closest('.chip-group').dataset.category;
      const chip = btn.dataset.chip;
      toggleChip(category, chip);
    });
  });
  
  if (clearChipsBtn) {
    clearChipsBtn.addEventListener('click', clearChips);
  }
  
  if (generateSuggestionsBtn) {
    generateSuggestionsBtn.addEventListener('click', generateSuggestions);
  }
  
  // Initialize chip UI
  updateChipButtons();
  generateDraft();

  updateLanguageButtons();
  
  // Check health
  checkHealth();
  
  // Focus input
  messageInput.focus();
}

// Check API health
async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    updateLLMStatus(data.llm_configured ? 'ready' : 'error');
  } catch (error) {
    console.error('Health check failed:', error);
    updateLLMStatus('error');
  }
}

// Update LLM status badge
function updateLLMStatus(status) {
  currentLLMStatus = status;
  llmStatus.className = `status-badge ${status}`;
  const statusText = {
    ready: t('ui.llm.ready'),
    waiting: t('ui.llm.waiting'),
    error: t('ui.llm.error')
  };
  llmStatus.textContent = statusText[status] || t('ui.llm.unknown');
}

// Handle Start button click
async function handleStart() {
  // Hide intro card
  if (introCard) {
    introCard.style.display = 'none';
  }
  
  // Show main content
  if (mainContent) {
    mainContent.classList.remove('hidden');
  }
  
  // Fade in video (600-900ms transition)
  videoContainer.classList.add('visible');
  // Start base video loop
  await playScene(VIDEO_PATHS.base, { loop: true });
  isInitialLoad = false;
  
  // Preload other videos
  preloadAllVideos();
  
  // Trigger first child message
  await triggerFirstMessage();
}

// Trigger first child message
async function triggerFirstMessage() {
  // First message from child (simulated - no adult input needed)
  const firstMessage = t('messages.first');
  
  // Add kid message to chat
  addMessage('kid', firstMessage);
  gameState.history.push({ role: 'kid', text: firstMessage });
  
  // Show initial suggestions (using fallback or empty array for now)
  // These will be generated on first adult response
  const initialSuggestions = getTranslation('suggestions.initial');
  updateSuggestedReplies(Array.isArray(initialSuggestions) ? initialSuggestions : []);
  
  // Enable input
  setInputEnabled(true);
  messageInput.focus();
}

// Handle send message
async function handleSend(messageText) {
  // Handle event object from click listener
  let text;
  if (messageText && typeof messageText === 'string') {
    text = messageText;
  } else {
    text = messageInput.value.trim();
  }
  
  // If empty, try draft preview
  if (!text && draftPreview) {
    text = draftPreview.textContent.trim();
    if (text === t('draft.placeholder')) text = '';
  }

  const lang = getLanguage();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:850',message:'handleSend called',data:{messageTextType:typeof messageText,textValue:text,isString:typeof text==='string'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!text || gameState.ended || gameState.round > 5) return;
  
  // Disable input
  setInputEnabled(false);
  updateLLMStatus('waiting');
  
  // Add adult message to chat
  addMessage('adult', text);
  messageInput.value = '';
  
  // Update history
  gameState.history.push({ role: 'adult', text });
  
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:871',message:'Calling /api/child-reply',data:{round:gameState.round,stars:gameState.stars,strikes:gameState.strikes,adult_message:text},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    const childResponse = await fetch('/api/child-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adult_message: text,
        history: gameState.history.map(h => ({ role: h.role === 'kid' ? 'kid' : 'adult', text: h.text })),
        emotional_load: 0,
        language: lang
      })
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:888',message:'Child reply response received',data:{status:childResponse.status,ok:childResponse.ok},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (!childResponse.ok) {
      const errorText = await childResponse.text();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:894',message:'Child reply error',data:{status:childResponse.status,errorText},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      throw new Error(`HTTP ${childResponse.status}`);
    }

    const childData = await childResponse.json();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:902',message:'Child reply parsed',data:{hasChildReply:!!childData.child_reply,hasEmotionLabel:!!childData.emotion_label,hasThoughtBubble:!!childData.thought_bubble},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    const evalResponse = await fetch('/api/evaluate-intervention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adult_message: text,
        child_state: {
          emotion_label: childData.emotion_label,
          emotional_load: childData.emotional_load
        },
        history: gameState.history.map(h => ({ role: h.role === 'kid' ? 'kid' : 'adult', text: h.text })),
        language: lang
      })
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:923',message:'Eval response received',data:{status:evalResponse.status,ok:evalResponse.ok},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (!evalResponse.ok) {
      const errorText = await evalResponse.text();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:929',message:'Eval error',data:{status:evalResponse.status,errorText},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      throw new Error(`HTTP ${evalResponse.status}`);
    }

    const evalData = await evalResponse.json();

    const suggestionsResponse = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: '',
        history: [...gameState.history, { role: 'kid', text: childData.child_reply || '' }],
        chip_selections: {},
        language: lang
      })
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:947',message:'Suggestions response received',data:{status:suggestionsResponse.status,ok:suggestionsResponse.ok},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    let suggestionList = [];
    if (suggestionsResponse.ok) {
      const suggestionsData = await suggestionsResponse.json();
      suggestionList = Array.isArray(suggestionsData.suggestions) ? suggestionsData.suggestions : [];
    }

    let emotionLabel = childData.emotion_label || 'neutral';
    if (emotionLabel === 'happy') emotionLabel = 'good';
    else if (emotionLabel === 'overwhelmed' || emotionLabel === 'defensive') emotionLabel = 'sad';

    const transformedData = {
      kid_reply: childData.child_reply || '',
      emotion: emotionLabel,
      thought: childData.thought_bubble || '',
      is_positive: evalData.is_positive !== undefined ? evalData.is_positive : false,
      suggested_replies: suggestionList,
      intervention_feedback: evalData.feedback
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:969',message:'Data transformed',data:{hasKidReply:!!transformedData.kid_reply,hasSuggestions:transformedData.suggested_replies.length},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    lastLLMResponse = transformedData;
    updateLLMStatus('ready');

    // Process LLM response
    await processLLMResponse(transformedData);
    
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:988',message:'LLM pipeline error caught',data:{error:error instanceof Error ? error.message : String(error),errorType:error instanceof Error ? error.constructor.name : typeof error,errorStack:error instanceof Error ? error.stack : undefined,stage:'child/eval/suggestions'},timestamp:Date.now(),runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    console.error('LLM API error:', error);
    updateLLMStatus('error');
    
    // Show error message
    addMessage('kid', t('messages.error'));
    setInputEnabled(true);
  }
}

// Process LLM response
async function processLLMResponse(data) {
  // Add kid reply to chat
  addMessage('kid', data.kid_reply);
  gameState.history.push({ role: 'kid', text: data.kid_reply });
  
  // Determine if this intervention was positive or negative
  let wasPositive = false;
  let wasNegative = false;
  
  // Update stars/strikes based on emotion (more reliable than is_positive)
  // Positive emotions = stars, negative emotions = strikes
  // Map backend emotion labels to frontend expected values
  const emotion = data.emotion === 'happy' ? 'good' : data.emotion;
  
  if (emotion === 'good') {
    gameState.stars = Math.min(gameState.stars + 1, 3);
    wasPositive = true;
  } else if (emotion === 'confused' || emotion === 'sad' || emotion === 'overwhelmed' || emotion === 'defensive') {
    gameState.strikes = Math.min(gameState.strikes + 1, 3);
    wasNegative = true;
  } else if (emotion === 'neutral') {
    // For neutral, fall back to is_positive
    if (data.is_positive) {
      gameState.stars = Math.min(gameState.stars + 1, 3);
      wasPositive = true;
    } else {
      gameState.strikes = Math.min(gameState.strikes + 1, 3);
      wasNegative = true;
    }
  }
  
  // Store intervention for analysis
  const adultMessage = gameState.history[gameState.history.length - 2];
  if (adultMessage && adultMessage.role === 'adult') {
    interventionHistory.push({
      round: gameState.round,
      adult_message: adultMessage.text,
      child_reply: data.kid_reply,
      emotion: data.emotion,
      was_positive: wasPositive,
      was_negative: wasNegative,
      thought: data.thought
    });
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1002',message:'Updating progress indicators',data:{stars:gameState.stars,strikes:gameState.strikes},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  
  updateProgressIndicators();
  
  // Switch video based on emotion (map happy to good for video)
  const videoEmotion = data.emotion === 'happy' ? 'good' : data.emotion;
  await switchVideo(videoEmotion);
  
  // Show thought bubble
  showThoughtBubble(data.thought);
  
  // Update suggested replies
  // Backend returns suggestions in intervention_feedback.suggestions
  let suggestions = data.suggested_replies || data.intervention_feedback?.suggestions || [];
  
  // Fallback filter for meta-strategy text (safety net if backend filter missed any)
  const metaPatterns = [
    /^use\s+(calmer|softer|gentler|child-friendly)\s+tone/i,
    /^explain\s+(why|the reason|the reasoning)/i,
    /^ask\s+what\s+they\s+think/i,
    /^offer\s+to\s+help/i,
    /^provide\s+reasons/i,
    /^apply\s+(strategy|technique|framework)/i,
    /^show\s+trust\s+by/i,
    /^say\s+it'?s\s+okay/i,
    /^explain\s+what\s+a\s+/i
  ];
  
  const naturalFallbacks = Array.isArray(getTranslation('suggestions.naturalFallbacks'))
    ? getTranslation('suggestions.naturalFallbacks')
    : [];
  
  suggestions = suggestions.filter(s => {
    if (typeof s !== 'string') return false;
    return !metaPatterns.some(pattern => pattern.test(s.trim()));
  });
  
  // If all were filtered, use fallbacks
  if (suggestions.length === 0) {
    suggestions = naturalFallbacks;
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1017',message:'Filtered suggestions before display',data:{originalSuggestions:data.intervention_feedback?.suggestions,filteredSuggestions:suggestions,wasFiltered:JSON.stringify(data.intervention_feedback?.suggestions)!==JSON.stringify(suggestions)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  updateSuggestedReplies(suggestions);
  
  // Check game end conditions
  gameState.round++;
  
  if (gameState.stars >= 3) {
    endGame('success');
  } else if (gameState.strikes >= 3) {
    endGame('failure');
  } else if (gameState.round > 5) {
    // Compare stars vs strikes
    if (gameState.stars > gameState.strikes) {
      endGame('success');
    } else {
      endGame('failure');
    }
  } else {
    // Continue game
    setInputEnabled(true);
    messageInput.focus();
  }
}

// Switch video based on emotion
async function switchVideo(emotion) {
  if (isVideoTransitioning) return;
  
  const videoMap = {
    good: VIDEO_PATHS.good,
    confused: VIDEO_PATHS.confused,
    sad: VIDEO_PATHS.sad,
    neutral: VIDEO_PATHS.base
  };
  
  const targetVideo = videoMap[emotion] || VIDEO_PATHS.base;
  
  if (targetVideo === VIDEO_PATHS.base) {
    // Return to base loop
    await playScene(VIDEO_PATHS.base, { loop: true });
  } else {
    // Play emotion video once, then return to base
    await playScene(targetVideo, { 
      loop: false, 
      returnToBase: true 
    });
  }
}

// Show thought bubble
function showThoughtBubble(text) {
  thoughtBubbleText.textContent = text;
  thoughtBubble.classList.remove('hidden');
  thoughtBubble.classList.add('visible');
  
  // Hide after 3 seconds (fades out by 3s, stays visible for 2.5s)
  setTimeout(() => {
    thoughtBubble.classList.remove('visible');
    setTimeout(() => {
      thoughtBubble.classList.add('hidden');
    }, 500);
  }, 3000);
}

// Add message to chat
function addMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;
  
  messageDiv.appendChild(contentDiv);
  chatHistory.appendChild(messageDiv);
  
  // Scroll to bottom
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  return messageDiv;
}

// Render progress indicators with images
function renderProgress(stars, strikes) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1094',message:'renderProgress called',data:{stars,strikes},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  
  const starsContainer = document.querySelector('.hud__stars');
  const xsContainer = document.querySelector('.hud__xs');
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1098',message:'DOM elements found',data:{hasStarsContainer:!!starsContainer,hasXsContainer:!!xsContainer},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  
  if (!starsContainer || !xsContainer) return;
  
  // Clear and render stars
  starsContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const img = document.createElement('img');
    const starSrc = i < stars ? '/assets/UI/star.png' : '/assets/UI/star_empty.png';
    img.src = starSrc;
    img.alt = i < stars ? 'Star earned' : 'Star empty';
    // Use CSS variables for size, matching style.css
    img.style.width = 'var(--star-icon-size, 38px)';
    img.style.height = 'var(--star-icon-size, 38px)';
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    // #region agent log
    img.onerror = () => {
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1110',message:'Star image failed to load',data:{src:starSrc,index:i,stars},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
    };
    img.onload = () => {
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1111',message:'Star image loaded',data:{src:starSrc,index:i},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
    };
    // #endregion
    starsContainer.appendChild(img);
  }
  
  // Clear and render X marks
  xsContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const img = document.createElement('img');
    const xSrc = i < strikes ? '/assets/UI/X.png' : '/assets/UI/X_empty.png';
    img.src = xSrc;
    img.alt = i < strikes ? 'Strike earned' : 'Strike empty';
    img.style.width = 'var(--x-icon-size, 38px)';
    img.style.height = 'var(--x-icon-size, 38px)';
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    // #region agent log
    img.onerror = () => {
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1125',message:'X image failed to load',data:{src:xSrc,index:i,strikes},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
    };
    img.onload = () => {
      fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1126',message:'X image loaded',data:{src:xSrc,index:i},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
    };
    // #endregion
    xsContainer.appendChild(img);
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1117',message:'Progress rendered',data:{starsRendered:starsContainer.children.length,xsRendered:xsContainer.children.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
}

// Update progress indicators (alias for renderProgress)
function updateProgressIndicators() {
  renderProgress(gameState.stars, gameState.strikes);
}

// Update suggested replies (show only first 3, make them prominent)
function updateSuggestedReplies(replies) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1125',message:'updateSuggestedReplies called',data:{repliesCount:replies?.length||0,replies,gameStateEnded:gameState.ended,gameStateRound:gameState.round},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
  // #endregion

  lastSuggestedReplies = Array.isArray(replies) ? replies : [];
  
  suggestedReplies.innerHTML = '';
  
  if (gameState.ended || gameState.round > 5) {
    return;
  }
  
  const lang = getLanguage();
  const hasChinese = (text) => /[\u4e00-\u9fff]/.test(text);
  let normalized = (replies || []).filter(s => typeof s === 'string' && s.trim());
  if (lang === 'zh_TW') {
    normalized = normalized.filter(s => hasChinese(s));
    if (normalized.length === 0) {
      const fallback = getTranslation('suggestions.naturalFallbacks');
      normalized = Array.isArray(fallback) ? fallback : [];
    }
  } else {
    normalized = normalized.filter(s => !hasChinese(s));
  }

  // Take only first 3 suggestions
  const displayReplies = normalized.slice(0, 3);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d69bdf60-6ca3-4341-98c0-a47c8bd37863',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1135',message:'Creating suggestion buttons',data:{displayRepliesCount:displayReplies.length,displayReplies},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  displayReplies.forEach(reply => {
    const btn = document.createElement('button');
    btn.className = 'suggested-reply-btn';
    btn.textContent = reply;
    btn.disabled = gameState.ended || gameState.round > 5;
    btn.addEventListener('click', () => {
      handleSend(reply);
    });
    suggestedReplies.appendChild(btn);
  });
}

// Set input enabled/disabled
function setInputEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
  const replyBtns = document.querySelectorAll('.suggested-reply-btn');
  replyBtns.forEach(btn => {
    btn.disabled = !enabled || gameState.ended || gameState.round > 5;
  });
}

// End game
async function endGame(type) {
  gameState.ended = true;
  gameState.endType = type;
  setInputEnabled(false);
  
  // Play ending video (no return to base)
  const endingVideo = type === 'success' ? VIDEO_PATHS.close : VIDEO_PATHS.open;
  await playScene(endingVideo, { loop: false });
  
  // Generate and show intervention analysis
  try {
    const analysis = await generateInterventionAnalysis();
    showAnalysisModal(analysis, type);
  } catch (error) {
    console.error('Failed to generate analysis:', error);
    // Fallback: show simple end message
    setTimeout(() => {
      endMessage.className = `end-message ${type}`;
      endMessage.textContent = type === 'success' 
        ? t('end.success')
        : t('end.failure');
      
      endOverlay.classList.remove('hidden');
      endOverlay.classList.add('visible');
    }, 1000);
  }
}

// Generate intervention analysis
async function generateInterventionAnalysis() {
  try {
    const response = await fetch('/api/analyze-interventions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        history: gameState.history,
        intervention_history: interventionHistory,
        stars: gameState.stars,
        strikes: gameState.strikes,
        outcome: gameState.endType
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.analysis || data;
  } catch (error) {
    console.error('Analysis generation error:', error);
    // Fallback to local analysis
    return generateLocalAnalysis();
  }
}

function formatTemplate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in data ? data[key] : `{${key}}`));
}

// Generate local analysis (fallback)
function generateLocalAnalysis() {
  const analysis = {
    summary: gameState.endType === 'success' 
      ? formatTemplate(t('analysis.local.successSummary'), { stars: gameState.stars, strikes: gameState.strikes })
      : formatTemplate(t('analysis.local.failureSummary'), { stars: gameState.stars, strikes: gameState.strikes }),
    interventions: []
  };
  
  // Use interventionHistory if available, otherwise parse from gameState.history
  if (interventionHistory && interventionHistory.length > 0) {
    interventionHistory.forEach(intervention => {
      const msg = intervention.adult_message.toLowerCase();
      const isPositive = /don't|do not|shouldn't|should not|danger|safe|ask|adult|parent|explain|help|let's|why|because|understand|together/.test(msg);
      const isCommand = /must|have to|need to|required|do this|do that|stop|no|can't/.test(msg);
      const isSupportive = /let's|together|we can|help|understand|explain|why|because/.test(msg);
      
      let evaluation = '';
      let reason = '';
      
      // Use actual result if available
      if (intervention.was_positive) {
        evaluation = 'positive';
        reason = t('analysis.local.reasons.positiveEffective');
      } else if (intervention.was_negative) {
        evaluation = 'negative';
        reason = t('analysis.local.reasons.negativeIneffective');
      } else if (isPositive && !isCommand && isSupportive) {
        evaluation = 'positive';
        reason = t('analysis.local.reasons.positiveSupportive');
      } else if (isCommand) {
        evaluation = 'negative';
        reason = t('analysis.local.reasons.negativeCommand');
      } else if (isPositive) {
        evaluation = 'positive';
        reason = t('analysis.local.reasons.positiveBasic');
      } else {
        evaluation = 'neutral';
        reason = t('analysis.local.reasons.neutral');
      }
      
      analysis.interventions.push({
        round: intervention.round,
        adult_message: intervention.adult_message,
        child_reply: intervention.child_reply,
        evaluation: evaluation,
        reason: reason
      });
    });
  } else {
    // Fallback: parse from history
    let roundNum = 1;
    for (let i = 0; i < gameState.history.length; i += 2) {
      const adultMsg = gameState.history[i];
      const kidMsg = gameState.history[i + 1];
      
      if (adultMsg && adultMsg.role === 'adult' && kidMsg && kidMsg.role === 'kid') {
        const msg = adultMsg.text.toLowerCase();
        const isPositive = /don't|do not|shouldn't|should not|danger|safe|ask|adult|parent|explain|help|let's|why|because|understand|together/.test(msg);
        const isCommand = /must|have to|need to|required|do this|do that|stop|no|can't/.test(msg);
        const isSupportive = /let's|together|we can|help|understand|explain|why|because/.test(msg);
        
        let evaluation = '';
        let reason = '';
        
        if (isPositive && !isCommand && isSupportive) {
          evaluation = 'positive';
          reason = t('analysis.local.reasons.positiveSupportive');
        } else if (isCommand) {
          evaluation = 'negative';
          reason = t('analysis.local.reasons.negativeCommand');
        } else if (isPositive) {
          evaluation = 'positive';
          reason = t('analysis.local.reasons.positiveBasic');
        } else {
          evaluation = 'neutral';
          reason = t('analysis.local.reasons.neutral');
        }
        
        analysis.interventions.push({
          round: roundNum,
          adult_message: adultMsg.text,
          child_reply: kidMsg.text,
          evaluation: evaluation,
          reason: reason
        });
        
        roundNum++;
      }
    }
  }
  
  return analysis;
}

// Show analysis modal
function showAnalysisModal(analysis, outcome) {
  const modal = document.getElementById('analysis-modal');
  const body = document.getElementById('analysis-body');
  
  if (!modal || !body) {
    // Fallback to simple end message
    setTimeout(() => {
      endMessage.className = `end-message ${outcome}`;
      endMessage.textContent = outcome === 'success' 
        ? t('end.success')
        : t('end.failure');
      
      endOverlay.classList.remove('hidden');
      endOverlay.classList.add('visible');
    }, 1000);
    return;
  }
  
  // Build analysis HTML
  let html = '';
  
  // Summary
  html += `<div class="analysis-summary">
    <h3>${t('analysis.overallOutcome')}</h3>
    <p class="outcome-badge ${outcome}">${outcome === 'success' ? t('analysis.success') : t('analysis.failure')}</p>
    <p class="summary-text">${analysis.summary || ''}</p>
  </div>`;
  
  // Interventions analysis
  if (analysis.interventions && analysis.interventions.length > 0) {
    html += `<div class="analysis-interventions">
      <h3>${t('analysis.interventionTitle')}</h3>
      <div class="interventions-list">`;
    
    analysis.interventions.forEach(intervention => {
      const evalClass = intervention.evaluation === 'positive' ? 'positive' : 
                       intervention.evaluation === 'negative' ? 'negative' : 'neutral';
      const evalLabel = intervention.evaluation === 'positive' ? t('analysis.evaluation.positive') : 
                       intervention.evaluation === 'negative' ? t('analysis.evaluation.negative') : t('analysis.evaluation.neutral');
      
      html += `<div class="intervention-item">
        <div class="intervention-header">
          <span class="intervention-round">Round ${intervention.round}</span>
          <span class="intervention-eval ${evalClass}">${evalLabel}</span>
        </div>
        <div class="intervention-content">
          <div class="intervention-message">
            <strong>Your Response:</strong> "${intervention.adult_message}"
          </div>
          <div class="intervention-response">
            <strong>Child's Reaction:</strong> "${intervention.child_reply}"
          </div>
          <div class="intervention-reason">
            <strong>Analysis:</strong> ${intervention.reason}
          </div>
        </div>
      </div>`;
    });
    
    html += `</div></div>`;
  }
  
  body.innerHTML = html;
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Setup button handlers
  const closeBtn = document.getElementById('close-analysis-btn');
  const restartBtn = document.getElementById('restart-analysis-btn');
  
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.add('hidden');
    };
  }
  
  if (restartBtn) {
    restartBtn.onclick = () => {
      location.reload();
    };
  }
}

// Toggle debug panel
function toggleDebug() {
  if (!isDebugRoute) return;
  debugMode = !debugMode;
  if (debugMode) {
    debugPanel.classList.remove('hidden');
    renderDebugTuner();
    updateSafeAreaOverlay();
  } else {
    debugPanel.classList.add('hidden');
    if (safeAreaOverlay) safeAreaOverlay.classList.add('hidden');
  }
}

// Generate draft sentence from chip selections
function generateDraft() {
  const parts = [];
  if (chipState.tone) {
    const tonePrefix = getTonePrefix(chipState.tone);
    if (tonePrefix) parts.push(tonePrefix);
  }
  if (chipState.strategy) {
    parts.push(t(`draft.strategy.${chipState.strategy}`));
  }
  if (chipState.action.length > 0) {
    const actionText = {
      'dont-click': t('draft.action.dontClick'),
      'screenshot': t('draft.action.screenshot'),
      'show-link': t('draft.action.showLink'),
      'ask-adult': t('draft.action.askAdult')
    };
    const separator = t('draft.and');
    const actions = chipState.action.map(a => actionText[a]).join(separator);
    parts.push(actions);
  }
  
  const draft = parts.length > 0 ? parts.join(' ') : t('draft.placeholder');
  if (draftPreview) {
    draftPreview.textContent = draft;
  }
  return draft;
}

// Toggle chip selection
function toggleChip(category, chip) {
  const max = category === 'action' ? 2 : 1;
  const current = category === 'action' ? chipState.action : [chipState[category]].filter(Boolean);
  
  if (category === 'action') {
    const idx = chipState.action.indexOf(chip);
    if (idx >= 0) {
      chipState.action.splice(idx, 1);
    } else if (chipState.action.length < max) {
      chipState.action.push(chip);
    }
  } else {
    chipState[category] = chipState[category] === chip ? null : chip;
  }
  
  updateChipButtons();
  generateDraft();
}

// Update chip button visual states
function updateChipButtons() {
  document.querySelectorAll('.chip-btn').forEach(btn => {
    const category = btn.closest('.chip-group').dataset.category;
    const chip = btn.dataset.chip;
    btn.classList.remove('active');
    
    if (category === 'action') {
      if (chipState.action.includes(chip)) btn.classList.add('active');
    } else {
      if (chipState[category] === chip) btn.classList.add('active');
    }
  });
}

// Clear all chips
function clearChips() {
  chipState.tone = null;
  chipState.strategy = null;
  chipState.action = [];
  updateChipButtons();
  generateDraft();
}

// Generate suggestions from chips (with LLM or fallback)
async function generateSuggestions() {
  if (!generateSuggestionsBtn) return;
  
  const draft = generateDraft();
  if (draft === t('draft.placeholder')) {
    alert(t('chips.selectFirst'));
    return;
  }
  
  generateSuggestionsBtn.disabled = true;
  generateSuggestionsBtn.textContent = t('chips.generating');
  
  try {
    const lang = getLanguage();
    const response = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round: gameState.round,
        stars: gameState.stars,
        strikes: gameState.strikes,
        history: gameState.history,
        chip_selections: {
          tone: chipState.tone,
          strategy: chipState.strategy,
          action: chipState.action
        },
        draft: draft,
        language: lang
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      updateSuggestedReplies(data.suggestions || []);
    } else {
      throw new Error('API error');
    }
  } catch (error) {
    console.error('Generate suggestions error:', error);
    // Fallback to deterministic suggestions
    const fallback = generateFallbackSuggestions(draft);
    updateSuggestedReplies(fallback);
  } finally {
    generateSuggestionsBtn.disabled = false;
    generateSuggestionsBtn.textContent = t('chips.generate');
  }
}

// Generate fallback suggestions deterministically
function generateFallbackSuggestions(draft) {
  const base = stripTonePrefix(draft);
  const templates = getTranslation('suggestions.fallbackTemplates');
  if (!Array.isArray(templates)) return [];
  const suggestions = templates.map(tpl => tpl.replace('{base}', base));
  return suggestions.slice(0, 4);
}
