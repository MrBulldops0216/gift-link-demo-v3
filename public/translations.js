const translations = {
  en: {
    ui: {
      llm: {
        ready: 'LLM: ready',
        waiting: 'LLM: waiting',
        error: 'LLM: error',
        unknown: 'LLM: unknown'
      },
      debug: 'Debug',
      debugTitle: 'Debug & Adjust',
      showOverlay: 'Show Safe Area Overlay',
      reset: 'Reset',
      copyCss: 'Copy CSS',
      copyJson: 'Copy JSON',
      close: 'Close',
      copyCssSuccess: 'CSS copied to clipboard!',
      copyJsonSuccess: 'JSON copied to clipboard!',
      resetConfirm: 'Reset all UI tuning to defaults?'
    },
    intro: {
      title: 'Alex needs your help',
      subtitle: 'Reply in chat to prevent risky clicks.',
      start: 'Start'
    },
    hud: {
      goal: 'Goal: Help the child make safe choices'
    },
    input: {
      placeholder: 'Type your message...',
      send: 'Send'
    },
    more: {
      moreOptions: 'More options',
      lessOptions: 'Less options'
    },
    chips: {
      toneLabel: 'Tone:',
      strategyLabel: 'Strategy:',
      actionLabel: 'Action:',
      reassure: 'Reassure',
      praise: 'Praise',
      warn: 'Warn',
      neutral: 'Neutral',
      ask: 'Ask',
      explain: 'Explain',
      boundary: 'Boundary',
      dontClick: "Don't click",
      screenshot: 'Screenshot',
      showLink: 'Show me the link',
      askAdult: 'Ask an adult',
      clear: 'Clear chips',
      generate: 'Generate Suggestions',
      generating: 'Generating...',
      selectFirst: 'Please select some chips first.'
    },
    draft: {
      label: 'Draft:',
      placeholder: 'Select chips to build a message...',
      and: ' and ',
      strategy: {
        ask: 'ask',
        explain: 'explain',
        boundary: 'set a boundary'
      },
      action: {
        dontClick: "don't click the link",
        screenshot: 'take a screenshot',
        showLink: 'show me the link first',
        askAdult: 'ask an adult before clicking'
      }
    },
    analysis: {
      title: 'Intervention Analysis Report',
      close: 'Close',
      restart: 'Restart'
    },
    end: {
      success: 'Great job! You kept them safe.',
      failure: 'Time ran out. Try again!'
    },
    messages: {
      first: 'I got a message with a link. Should I click it?',
      error: 'Sorry, something went wrong. Please try again.'
    },
    suggestions: {
      initial: [
        "Don't click that link, it might not be safe.",
        "Let's ask a grown-up first before clicking.",
        "That looks suspicious. We should stay away from it."
      ],
      fallbackTemplates: [
        "Let's {base} together.",
        "I think we should {base}.",
        "How about we {base}?",
        "Let me help you {base}."
      ],
      naturalFallbacks: [
        "Let's talk about why this link might not be safe.",
        "Can you show me what you're looking at?",
        "I'm here if you need help.",
        "What do you think might happen if we click it?"
      ]
    },
    safeArea: {
      chat: 'Chat Safe Area',
      hud: 'HUD',
      thoughtBubble: 'Thought Bubble'
    },
    analysis: {
      overallOutcome: 'Overall Outcome',
      success: 'Success',
      failure: 'Failure',
      interventionTitle: 'Intervention Analysis',
      evaluation: {
        positive: '✓ Effective',
        negative: '✗ Ineffective',
        neutral: '○ Neutral'
      },
      local: {
        successSummary: 'You successfully helped the child make safe choices. Final score: {stars} stars, {strikes} strikes.',
        failureSummary: 'The child clicked the link. Final score: {stars} stars, {strikes} strikes. Intervention strategies need improvement.',
        reasons: {
          positiveEffective: 'This intervention was effective. You used a supportive approach that helped the child understand the importance of safety. By explaining and guiding rather than commanding, the child was more receptive to your advice.',
          negativeIneffective: 'This intervention was not effective. Possible reasons: using commanding language made the child feel controlled, or you did not adequately explain why caution was needed. A better approach would be to explain the reasons and guide the child to make their own decision.',
          positiveSupportive: 'You used supportive explanation and guidance rather than commanding instructions. This helps the child understand why caution is needed, rather than simply being told "don\'t do it." Through explanation and collaborative discussion, the child is more likely to accept your advice.',
          negativeCommand: 'You used commanding language, which may make the child feel controlled and increase emotional load. A better approach would be to explain the reasons and guide the child to make their own decision, rather than directly commanding them.',
          positiveBasic: 'You provided safety advice, but could explain the reasons in more detail to help the child better understand.',
          neutral: 'Your response was relatively neutral. You could provide more explicit safety guidance or explain potential risks.'
        }
      }
    },
    debugTuner: {
      groups: {
        chatPanelPosition: 'Chat Panel Position',
        chatSafeAreaPadding: 'Chat Safe Area Padding',
        hudTuning: 'HUD Tuning',
        fontSizes: 'Font Sizes',
        introCardFontSizes: 'Intro Card Font Sizes',
        chipFontSizes: 'Chip Font Sizes',
        thoughtBubble: 'Thought Bubble',
        backgroundStage: 'Background Stage',
        welcomeImage: 'Welcome Image'
      },
      fields: {
        chatPanelX: 'X Position (px or auto)',
        chatPanelY: 'Y Position (px)',
        chatPanelW: 'Width (%)',
        chatPanelH: 'Height (%)',
        chatPanelScale: 'Scale',
        chatPadTop: 'Padding Top',
        chatPadRight: 'Padding Right',
        chatPadBottom: 'Padding Bottom',
        chatPadLeft: 'Padding Left',
        hudTopOffset: 'Top Offset',
        hudPaddingTop: 'Padding Top',
        hudTitleFontSize: 'Title Font Size',
        starIconSize: 'Star Icon Size',
        xIconSize: 'X Icon Size',
        hudIconGap: 'Icon Gap',
        hudRowGap: 'Row Gap',
        hudJustify: 'Justify',
        suggestedItemFontSize: 'Suggested Reply Font Size',
        inputFontSize: 'Input Font Size',
        messageFontSize: 'Message Font Size',
        introTitleFontSize: 'Title Font Size (Alex needs your help)',
        introSubtitleFontSize: 'Subtitle Font Size (Reply in chat...)',
        introButtonFontSize: 'Button Font Size (Start)',
        chipFontSize: 'Chip Font Size (Tone/Strategy/Action buttons)',
        thoughtX: 'X Position (%)',
        thoughtY: 'Y Position (%)',
        thoughtWidth: 'Width',
        thoughtFontSize: 'Font Size',
        thoughtDurationMs: 'Duration (ms)',
        stageScale: 'Scale',
        stageOffsetX: 'Offset X',
        stageOffsetY: 'Offset Y',
        videoFit: 'Video Fit',
        welcomeX: 'X Position (%)',
        welcomeY: 'Y Position (%)',
        welcomeMaxWidth: 'Max Width (%)',
        welcomeMaxHeight: 'Max Height (%)',
        welcomeScale: 'Scale'
      },
      options: {
        hudJustify: {
          'space-between': 'space-between',
          'flex-start': 'flex-start',
          'flex-end': 'flex-end',
          center: 'center'
        },
        videoFit: {
          contain: 'contain',
          cover: 'cover'
        }
      },
      tonePrefix: {
        reassure: 'Reassuringly,',
        praise: 'Praising,',
        warn: 'Warning,',
        neutral: ''
      }
    }
  },
  zh_TW: {
    ui: {
      llm: {
        ready: 'LLM: 就緒',
        waiting: 'LLM: 等待中',
        error: 'LLM: 錯誤',
        unknown: 'LLM: 未知'
      },
      debug: '調試',
      debugTitle: '調試與調整',
      showOverlay: '顯示安全區域覆蓋',
      reset: '重置',
      copyCss: '複製 CSS',
      copyJson: '複製 JSON',
      close: '關閉',
      copyCssSuccess: '已複製 CSS 到剪貼簿！',
      copyJsonSuccess: '已複製 JSON 到剪貼簿！',
      resetConfirm: '要重置所有 UI 調整到預設值嗎？'
    },
    intro: {
      title: 'Alex 需要你的幫助',
      subtitle: '在聊天室回覆，避免冒險點擊。',
      start: '開始'
    },
    hud: {
      goal: '目標：幫助孩子做出安全選擇'
    },
    input: {
      placeholder: '輸入你的訊息...',
      send: '送出'
    },
    more: {
      moreOptions: '更多選項',
      lessOptions: '收起選項'
    },
    chips: {
      toneLabel: '語氣：',
      strategyLabel: '策略：',
      actionLabel: '行動：',
      reassure: '安撫',
      praise: '稱讚',
      warn: '提醒',
      neutral: '中性',
      ask: '提問',
      explain: '解釋',
      boundary: '界線',
      dontClick: '不要點擊',
      screenshot: '截圖',
      showLink: '給我看連結',
      askAdult: '詢問大人',
      clear: '清除選項',
      generate: '生成建議',
      generating: '生成中...',
      selectFirst: '請先選擇一些晶片。'
    },
    draft: {
      label: '草稿：',
      placeholder: '選擇晶片來組合訊息...',
      and: '、',
      strategy: {
        ask: '提問',
        explain: '解釋',
        boundary: '設定界線'
      },
      action: {
        dontClick: '不要點擊連結',
        screenshot: '先截圖',
        showLink: '先給我看連結',
        askAdult: '先詢問大人'
      }
    },
    analysis: {
      title: '介入分析報告',
      close: '關閉',
      restart: '重新開始'
    },
    end: {
      success: '做得好！你幫他保持安全了。',
      failure: '時間到了，再試一次！'
    },
    messages: {
      first: '我收到一個有連結的訊息。我應該點擊它嗎？',
      error: '抱歉，出了問題。請再試一次。'
    },
    suggestions: {
      initial: [
        '不要點擊那個連結，它可能不安全。',
        '在點擊之前，讓我們先問問大人。',
        '那看起來可疑。我們應該遠離它。'
      ],
      fallbackTemplates: [
        '我們一起{base}。',
        '我覺得我們應該{base}。',
        '要不要{base}？',
        '讓我幫你{base}。'
      ],
      naturalFallbacks: [
        '讓我們聊聊為什麼這個連結可能不安全。',
        '你可以給我看你看到的內容嗎？',
        '如果你需要幫忙，我在這裡。',
        '你覺得如果點擊會發生什麼？'
      ]
    },
    safeArea: {
      chat: '聊天安全區',
      hud: 'HUD',
      thoughtBubble: '思考泡泡'
    },
    analysis: {
      overallOutcome: '整體結果',
      success: '成功',
      failure: '失敗',
      interventionTitle: '介入分析',
      evaluation: {
        positive: '✓ 有效',
        negative: '✗ 無效',
        neutral: '○ 中性'
      },
      local: {
        successSummary: '你成功幫助孩子做出安全選擇。最終分數：{stars} 顆星，{strikes} 個叉。',
        failureSummary: '孩子點擊了連結。最終分數：{stars} 顆星，{strikes} 個叉。介入策略需要改進。',
        reasons: {
          positiveEffective: '這次介入是有效的。你用了支持性的方式，幫助孩子理解安全的重要性。透過解釋與引導而非命令，孩子更容易接受你的建議。',
          negativeIneffective: '這次介入效果不佳。可能原因：命令式語言讓孩子感到被控制，或是沒有清楚說明為何需要小心。更好的方式是說明原因並引導孩子做出自己的判斷。',
          positiveSupportive: '你使用了支持性的解釋與引導，而不是命令式指示。這有助於孩子理解為何需要小心，而不只是被要求「不要做」。透過解釋與協作討論，孩子更可能接受你的建議。',
          negativeCommand: '你使用了命令式語言，可能讓孩子感到被控制並增加情緒負擔。更好的方式是說明原因並引導孩子自行判斷，而不是直接命令。',
          positiveBasic: '你提供了安全建議，但可以更清楚地說明理由，幫助孩子更理解。',
          neutral: '你的回應相對中性。你可以提供更明確的安全指引或解釋潛在風險。'
        }
      }
    },
    debugTuner: {
      groups: {
        chatPanelPosition: '聊天面板位置',
        chatSafeAreaPadding: '聊天安全區內距',
        hudTuning: 'HUD 調整',
        fontSizes: '字體大小',
        introCardFontSizes: '導覽卡字體大小',
        chipFontSizes: '晶片字體大小',
        thoughtBubble: '思考泡泡',
        backgroundStage: '背景舞台',
        welcomeImage: '歡迎圖片'
      },
      fields: {
        chatPanelX: 'X 位置（px 或 auto）',
        chatPanelY: 'Y 位置（px）',
        chatPanelW: '寬度（%）',
        chatPanelH: '高度（%）',
        chatPanelScale: '縮放',
        chatPadTop: '上內距',
        chatPadRight: '右內距',
        chatPadBottom: '下內距',
        chatPadLeft: '左內距',
        hudTopOffset: '上偏移',
        hudPaddingTop: '上內距',
        hudTitleFontSize: '標題字體大小',
        starIconSize: '星星圖示大小',
        xIconSize: 'X 圖示大小',
        hudIconGap: '圖示間距',
        hudRowGap: '行距',
        hudJustify: '對齊',
        suggestedItemFontSize: '建議回覆字體大小',
        inputFontSize: '輸入框字體大小',
        messageFontSize: '訊息字體大小',
        introTitleFontSize: '標題字體大小（Alex 需要你的幫助）',
        introSubtitleFontSize: '副標字體大小（在聊天室回覆...）',
        introButtonFontSize: '按鈕字體大小（開始）',
        chipFontSize: '晶片字體大小（語氣/策略/行動）',
        thoughtX: 'X 位置（%）',
        thoughtY: 'Y 位置（%）',
        thoughtWidth: '寬度',
        thoughtFontSize: '字體大小',
        thoughtDurationMs: '顯示時間（毫秒）',
        stageScale: '縮放',
        stageOffsetX: 'X 偏移',
        stageOffsetY: 'Y 偏移',
        videoFit: '影片填滿',
        welcomeX: 'X 位置（%）',
        welcomeY: 'Y 位置（%）',
        welcomeMaxWidth: '最大寬度（%）',
        welcomeMaxHeight: '最大高度（%）',
        welcomeScale: '縮放'
      },
      options: {
        hudJustify: {
          'space-between': '兩端對齊',
          'flex-start': '靠左',
          'flex-end': '靠右',
          center: '置中'
        },
        videoFit: {
          contain: '完整顯示',
          cover: '覆蓋填滿'
        }
      },
      tonePrefix: {
        reassure: '安撫地，',
        praise: '稱讚地，',
        warn: '提醒地，',
        neutral: ''
      }
    }
  }
};
