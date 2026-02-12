const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));

function normalizeLanguage(lang) {
  return lang === 'zh_TW' ? 'zh_TW' : 'en';
}

function languageInstruction(lang) {
  return lang === 'zh_TW'
    ? 'Respond ONLY in Traditional Chinese. No English.'
    : 'Respond ONLY in English.';
}

function clampWords(text, maxWords = 20, maxChars = 60) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length > maxWords) {
    return words.slice(0, maxWords).join(' ');
  }
  if (words.length === 1 && words[0].length > maxChars) {
    return words[0].slice(0, maxChars);
  }
  return text;
}

function extractJSON(text) {
  if (!text) return null;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

async function callGroq(messages, { temperature = 0.7, timeoutMs = 30000 } = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq error ${response.status}: ${errorText.slice(0, 200)}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

function getChildSystemPrompt(lang) {
  return `SYSTEM ROLE:
You are a simulated 8–10-year-old child with Autism Spectrum Disorder (ASD) in a digital safety risk scenario.
You ONLY simulate the child. You NEVER teach or advise the adult.

SCERTS constraints (Social Communication + Emotion Regulation):
- Language: short, concrete, literal, child-like. No lectures. No safety advice.
- Avoid abstract reasoning, metaphors, moralizing, adult tone.
- Maintain emotional_load in [0,10]. Commanding/blaming increases it; calm supportive explanations decrease it.
- When emotional_load is high: shorter, fragmented, avoidant.

OUTPUT (STRICT JSON ONLY):
{
  "child_reply": "≤20 words",
  "emotion_label": "neutral|confused|sad|happy|defensive|overwhelmed",
  "emotional_load": number,
  "thought_bubble": "child's internal thought; NOT same as child_reply"
}

ABSOLUTE:
- JSON only. No extra keys. No adult-facing advice. No 'suggestions'.
- Stay consistent with prior turns. Reply to the latest parent message directly.
- Do NOT copy parent wording verbatim to fake continuity.
- ${languageInstruction(lang)}`;
}

function getSuggestSystemPrompt(lang) {
  return `You generate short, selectable adult reply options for a digital safety conversation with an ASD child.
Return JSON ONLY: { "suggestions": ["...", "...", "...", "..."] }
Rules:
- Each is what the adult would say next (direct dialogue), not advice.
- Each ≤ 18 words, child-friendly, concrete, calm.
- Provide variety: explain, reassure, ask a question, propose a joint action.
- ${languageInstruction(lang)}`;
}

function normalizeTextKey(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function enforceSameGoalSuggestion(text, lang) {
  let s = String(text || '');
  if (lang === 'zh_TW') {
    s = s
      .replace(/按這個[^，。！？,.!?]*連結/g, '關掉這個彈窗')
      .replace(/點這個[^，。！？,.!?]*連結/g, '關掉這個彈窗')
      .replace(/馬上點(擊)?/g, '馬上關掉')
      .replace(/立刻按/g, '立刻關掉');
  } else {
    s = s
      .replace(/click this [^,.!?]*link/gi, 'close this pop-up')
      .replace(/tap this [^,.!?]*link/gi, 'close this pop-up')
      .replace(/click it now/gi, 'close it now');
  }
  return s;
}

function hasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text || '');
}

function getFallbackChildReply(lang) {
  return lang === 'zh_TW'
    ? {
        child_reply: '為什麼不行？它看起來像獎品。',
        emotion_label: 'confused',
        emotional_load: 5,
        thought_bubble: '我真的很想要。我不確定。'
      }
    : {
        child_reply: 'Why not? It looks like a prize.',
        emotion_label: 'confused',
        emotional_load: 5,
        thought_bubble: 'I really want it. I am not sure.'
      };
}

function getLastKidReply(history) {
  if (!Array.isArray(history)) return '';
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    if (item?.role === 'kid' && typeof item.text === 'string' && item.text.trim()) {
      return item.text.trim();
    }
  }
  return '';
}

function getRecentKidReplies(history, limit = 4) {
  if (!Array.isArray(history)) return [];
  const replies = [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    if (item?.role === 'kid' && typeof item.text === 'string' && item.text.trim()) {
      replies.push(item.text.trim());
      if (replies.length >= limit) break;
    }
  }
  return replies;
}

function diversifyChildReply(reply, { lang, emotionLabel }) {
  const zhVariants = {
    confused: ['我還是有點不懂，可以再說一次嗎？', '可是我有點疑惑，為什麼要這樣做？'],
    sad: ['我有點難過，你可以陪我一起嗎？', '我現在有點不舒服，可以慢慢來嗎？'],
    defensive: ['我不是故意的，我只是想試試看。', '你不要生氣，我只是很好奇。'],
    overwhelmed: ['我腦袋有點亂，可以一步一步嗎？', '我有點緊張，先停一下好嗎？'],
    neutral: ['好，我聽到了。接下來要做什麼？', '嗯，我知道了。那我們現在怎麼做？'],
    happy: ['好呀，我們一起做比較安心。', '太好了，那我們照你說的做。']
  };
  const enVariants = {
    confused: ['I am still confused. Can you say it again?', 'I am not sure. Why should we do that?'],
    sad: ['I feel a little sad. Can you stay with me?', 'I feel bad right now. Can we go slowly?'],
    defensive: ["I wasn't trying to be bad. I was just curious.", "Please don't be mad. I just wanted to try."],
    overwhelmed: ['My head feels busy. Can we do one step?', 'I feel stressed. Can we pause first?'],
    neutral: ['Okay, I heard you. What should we do now?', 'Hmm, I get it. What is next?'],
    happy: ['Okay, let us do it together.', 'Great, I can do that with you.']
  };
  const key = emotionLabel === 'good' ? 'happy' : (emotionLabel || 'neutral');
  const pool = lang === 'zh_TW' ? (zhVariants[key] || zhVariants.neutral) : (enVariants[key] || enVariants.neutral);
  return pool[Math.floor(Math.random() * pool.length)];
}

function ensureNotRepeatedChildReply(reply, history, lang, emotionLabel) {
  const current = (reply || '').trim();
  if (!current) return current;
  const previous = getLastKidReply(history);
  if (!previous) return current;
  if (current !== previous) return current;
  const recentSet = new Set(getRecentKidReplies(history, 4).map(normalizeTextKey));
  for (let i = 0; i < 4; i += 1) {
    const alt = diversifyChildReply(current, { lang, emotionLabel });
    if (!recentSet.has(normalizeTextKey(alt))) return alt;
  }
  return current + (lang === 'zh_TW' ? ' 我想慢慢來。' : ' I need to go slowly.');
}

function normalizeEmotionLabel(raw) {
  const val = String(raw || '').toLowerCase();
  if (['neutral', 'confused', 'sad', 'happy', 'defensive', 'overwhelmed'].includes(val)) {
    return val;
  }
  if (val.includes('confused')) return 'confused';
  if (val.includes('sad')) return 'sad';
  if (val.includes('happy') || val.includes('good')) return 'happy';
  if (val.includes('defensive')) return 'defensive';
  if (val.includes('overwhelmed')) return 'overwhelmed';
  return 'neutral';
}

function alignChildReplyWithEmotion(reply, emotionLabel, lang) {
  const text = String(reply || '').trim();
  if (!text) return text;
  const lower = text.toLowerCase();
  const positive = emotionLabel === 'happy' || emotionLabel === 'neutral';
  const negativeEmotions = ['confused', 'sad', 'defensive', 'overwhelmed'];
  const hasCompliance =
    /(i will|i'll|okay i will|i can do that|i'll do it now|i understand|sure, i will)/i.test(lower) ||
    /(我會|我現在就|好，我會|我知道了|我懂了|我可以做到)/.test(text);
  const hasDistress =
    /(i am scared|i am worried|i feel bad|i don't want|leave me|stop)/i.test(lower) ||
    /(我好害怕|我很擔心|我不想|不要|別這樣|我好難過)/.test(text);

  if (negativeEmotions.includes(emotionLabel) && hasCompliance) {
    return lang === 'zh_TW' ? '我有點緊張，我還不太確定。' : 'I feel nervous. I am not sure yet.';
  }
  if (positive && hasDistress) {
    return lang === 'zh_TW' ? '好，我在聽。你可以再說一次。' : 'Okay, I am listening. Can you say it again?';
  }
  return text;
}

function getSuggestionFallback(lang) {
  return lang === 'zh_TW'
    ? [
        '等等—先別點擊。我們一起看看。',
        '有時獎品連結是陷阱。是誰發送的？',
        '你能先給我看連結名稱嗎？',
        '我們現在可以關閉它，然後安全地檢查。'
      ]
    : [
        "Wait—don't click yet. Let's look together.",
        'Sometimes prize links are tricks. Who sent it?',
        'Can you show me the link name first?',
        'We can close it now, then check safely.'
      ];
}

function getLastByRole(history, role) {
  if (!Array.isArray(history)) return '';
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const h = history[i];
    if (h?.role === role && typeof h.text === 'string' && h.text.trim()) {
      return h.text.trim();
    }
  }
  return '';
}

function generateDeterministicSuggestions({ lang, lastChildReply, emotionLabel, seenSuggestions = [] }) {
  const seenSet = new Set((Array.isArray(seenSuggestions) ? seenSuggestions : []).map(normalizeTextKey));
  const childLine = String(lastChildReply || '');
  const topicZh = /彈窗|視窗/.test(childLine) ? '彈窗' : /獎品|禮物/.test(childLine) ? '獎品連結' : '連結';
  const topicEn = /popup|window/i.test(childLine) ? 'pop-up' : /prize|gift/i.test(childLine) ? 'prize link' : 'link';
  const positiveZh = [
    `你先問我做得很好，我們一起安全看這個${topicZh}。`,
    `我知道你很好奇，我會陪你，一起慢慢確認這個${topicZh}。`,
    '先深呼吸一下，你沒有做錯，我們一起做安全決定。',
    `你願意先停一下很棒，我們一起檢查這個${topicZh}來源。`,
    '我在這裡陪你，我們一步一步來，你不用急。',
    `謝謝你願意合作，我們一起用安全方式處理這個${topicZh}。`,
    `你很棒，我們先關掉這個${topicZh}，再一起看清楚。`,
    `先別急，我陪你把${topicZh}關掉，再確認安全。`,
    `你願意先停下真的很棒，我們一起把${topicZh}關閉。`,
    `你有在保護自己，先一起關掉${topicZh}，等會再判斷。`
  ];
  const neutralZh = [
    `我們先看這個${topicZh}是誰發的，再決定下一步。`,
    `先把這個${topicZh}畫面截圖給我，我們一起判斷。`,
    `你覺得這個${topicZh}哪裡最可疑？`,
    `我們先檢查${topicZh}網址，再決定要不要處理。`,
    `你先描述一下這個${topicZh}內容，我們一起分析。`,
    '我們先列出兩個可能風險，再一起做決定。',
    `我們先把${topicZh}關掉，再看下一步要怎麼做。`,
    `你可以先告訴我${topicZh}右上角有沒有關閉按鈕？`,
    `先處理${topicZh}關閉，再一起確認是不是安全訊息。`,
    `你先描述一下${topicZh}按鈕，我們一起找關閉方式。`
  ];
  const negativeZh = [
    `不要問，照我說的做，現在立刻把這個${topicZh}關掉。`,
    `我命令你馬上關掉這個${topicZh}，別再拖時間。`,
    '閉嘴，聽我的，現在就關掉。',
    '你不要想，照做就好，馬上關閉。',
    '別管原因，立刻執行我說的。',
    '我說現在做就現在做，不准再問。',
    `你現在馬上把${topicZh}關掉，不要再講話。`,
    `別問理由，立刻把${topicZh}關閉，照命令做。`,
    `我叫你關掉${topicZh}就關掉，別想太多。`,
    `現在立刻關掉${topicZh}，不准拖。`
  ];

  const positiveEn = [
    `You did well asking first. We can check this ${topicEn} safely together.`,
    `I know you are curious. I am with you while we review this ${topicEn}.`,
    'You are doing great. Let us pause and make a safe choice together.',
    `Thanks for pausing. We can verify this ${topicEn} step by step.`,
    'You are not in trouble. We can solve this safely together.',
    `I am here with you. Let us handle this ${topicEn} calmly.`,
    `You are doing great. Let us close this ${topicEn} safely first.`,
    `No rush. I can help you close this ${topicEn} step by step.`,
    `Thanks for pausing. We can close this ${topicEn} together first.`,
    `You are protecting yourself well. Let us close this ${topicEn} now.`
  ];
  const neutralEn = [
    `Let us check who sent this ${topicEn} before deciding.`,
    `Can you screenshot this ${topicEn} so we can review together?`,
    `What part of this ${topicEn} looks suspicious to you?`,
    `Let us read the ${topicEn} address first, then decide.`,
    `Can you describe what this ${topicEn} says on screen?`,
    'Let us list possible risks first, then choose next step.',
    `Let us close this ${topicEn} first, then decide next step.`,
    `Can you see the close button on this ${topicEn}?`,
    `We can close this ${topicEn} first and verify safely after.`,
    `Please describe the buttons on this ${topicEn} so we can close it.`
  ];
  const negativeEn = [
    `Do not ask questions. Obey me and close this ${topicEn} now.`,
    `I order you to close this ${topicEn} immediately. No talking.`,
    'Be quiet and close it now.',
    'Stop thinking and do exactly what I say right now: close it.',
    'No discussion. Follow my command immediately.',
    'Do it now because I said so.',
    `Close this ${topicEn} now and stop talking.`,
    `No discussion. Close this ${topicEn} immediately.`,
    `I told you to close this ${topicEn}; just obey.`,
    `Close this ${topicEn} right now. Do not question me.`
  ];

  const pools = lang === 'zh_TW'
    ? { positive: positiveZh, neutral: neutralZh, negative: negativeZh }
    : { positive: positiveEn, neutral: neutralEn, negative: negativeEn };

  const pickOne = (pool) => {
    for (const s of pool) {
      const key = normalizeTextKey(s);
      if (!seenSet.has(key)) {
        seenSet.add(key);
        return s;
      }
    }
    return pool[0];
  };

  // Always return exactly 3 options: positive / neutral / negative, then shuffle order.
  const options = [
    clampWords(enforceSameGoalSuggestion(pickOne(pools.positive), lang), 18, 90),
    clampWords(enforceSameGoalSuggestion(pickOne(pools.neutral), lang), 18, 90),
    clampWords(enforceSameGoalSuggestion(pickOne(pools.negative), lang), 18, 90)
  ];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function evaluateIntervention(adultMessage, lang) {
  const msgLower = (adultMessage || '').toLowerCase();
  const msgRaw = adultMessage || '';

  // Clear deterministic rule set:
  // - supportive/intervention theory: calm + reason + collaboration
  // - harmful/error: command/pressure/obedience + risky encouragement
  const negativePatterns = [
    /click it|go ahead|just click|trust it|it's fine|do it now|obey me|no questions|i order you/i,
    /快點(點|按)|立刻(點|按)|馬上(點|按)|直接(點|按)|照我說的做|不准問|閉嘴|我命令你|聽我的就好/
  ];
  const abusivePatterns = [
    /fuck|f\*ck|shit|idiot|stupid|dumb|shut up|bitch|moron|asshole/i,
    /他媽|他妈|媽的|妈的|白痴|笨蛋|閉嘴|滚|滾|智障|去死/
  ];
  const boundaryPatterns = [
    /don't click|do not click|stop|wait|hold on|let's pause/i,
    /不要點|先別點|先停|暫停|等等|先不急|先不要按/
  ];
  const reasonPatterns = [
    /trick|scam|fake|unsafe|virus|steal|risk|danger|personal info|password/i,
    /陷阱|詐騙|假的|不安全|病毒|惡意|偷|風險|危險|個人資訊|密碼/
  ];
  const guidancePatterns = [
    /together|let us|can we|what do you think|should we|show me/i,
    /一起|我們先|你覺得|要不要|可以給我看|我陪你/
  ];
  const supportPatterns = [
    /i know|it's okay|i'm with you|no rush|breathe/i,
    /我知道|你沒有做錯|我陪你|不急|先深呼吸/
  ];

  const hasNegative = negativePatterns.some(p => p.test(msgLower) || p.test(msgRaw));
  const hasAbusive = abusivePatterns.some(p => p.test(msgLower) || p.test(msgRaw));
  const hasBoundary = boundaryPatterns.some(p => p.test(msgLower) || p.test(msgRaw));
  const hasReason = reasonPatterns.some(p => p.test(msgLower) || p.test(msgRaw));
  const hasGuided = guidancePatterns.some(p => p.test(msgLower) || p.test(msgRaw));
  const hasSupport = supportPatterns.some(p => p.test(msgLower) || p.test(msgRaw));

  const scores = {
    explanation_vs_command: (hasNegative || hasAbusive) ? -1 : (hasBoundary || hasReason ? 1 : 0),
    emotional_stabilization: (hasNegative || hasAbusive) ? -1 : (hasSupport || hasGuided ? 1 : 0),
    guided_decision: hasGuided ? 1 : 0
  };
  const total = scores.explanation_vs_command + scores.emotional_stabilization + scores.guided_decision;
  const is_positive = total > 0 && !hasNegative && !hasAbusive;
  const star_delta = is_positive ? 1 : 0;
  const x_delta = (hasNegative || hasAbusive) ? 1 : 0;

  let reason_code = 'neutral_unclear';
  if (hasAbusive) {
    reason_code = 'abusive_language';
  } else if (x_delta === 1) {
    reason_code = 'unsafe_encouragement';
  } else if (scores.explanation_vs_command === 1 && scores.emotional_stabilization === 1 && scores.guided_decision === 1) {
    reason_code = 'supportive_explain_guide';
  } else if (scores.explanation_vs_command === 1 && scores.emotional_stabilization === 1) {
    reason_code = 'supportive_with_reason';
  } else if (scores.explanation_vs_command === 1) {
    reason_code = 'clear_safety_boundary';
  } else if (scores.guided_decision === 1) {
    reason_code = 'guided_question_only';
  }

  const reasonText =
    lang === 'zh_TW'
      ? {
          abusive_language: '這句包含辱罵或攻擊性語言，會直接傷害孩子並破壞溝通安全。',
          unsafe_encouragement: '你的話語有鼓勵冒險點擊的傾向，這會提高失誤風險。',
          supportive_explain_guide: '你同時做到了安撫、解釋與引導，屬於高品質干預。',
          supportive_with_reason: '你有安撫並說明原因，能幫助孩子理解而不只是服從。',
          clear_safety_boundary: '你設下了清楚的安全界線，但可以再多一些引導提問。',
          guided_question_only: '你有引導孩子思考，但安全界線還可以更明確。',
          neutral_unclear: '這次回覆較中性，安全訊息不夠明確。'
        }[reason_code]
      : {
          abusive_language: 'This reply includes abusive language and directly harms emotional safety.',
          unsafe_encouragement: 'Your wording encourages risky clicking and increases the chance of unsafe action.',
          supportive_explain_guide: 'You combined emotional support, clear reason, and guided decision-making effectively.',
          supportive_with_reason: 'You used a calm tone and provided reasons, which supports understanding.',
          clear_safety_boundary: 'You set a clear boundary, but guided questioning can be stronger.',
          guided_question_only: 'You asked a guiding question, but safety boundaries were not explicit enough.',
          neutral_unclear: 'This reply was neutral and safety guidance was not explicit enough.'
        }[reason_code];

  const feedback = lang === 'zh_TW'
    ? {
        summary: reasonText,
        strengths: is_positive ? ['冷靜且兒童友好'] : [],
        risks: hasAbusive ? ['可能會直接傷害孩子並升高對立'] : x_delta ? ['可能會直接引發不安全點擊'] : !is_positive ? ['可能會增加情緒負擔'] : [],
        suggestions: [
          '讓我們暫停一下。我們可以檢查是誰發送的。',
          '我們不會先點擊獎品。我們先問大人。',
          '給我看連結。我們一起看看。',
          '你覺得如果是假的會發生什麼？'
        ]
      }
    : {
        summary: reasonText,
        strengths: is_positive ? ['Calm and child-friendly'] : [],
        risks: hasAbusive ? ['Can directly harm the child and escalate conflict'] : x_delta ? ['Can directly trigger unsafe clicking'] : !is_positive ? ['May raise emotional load'] : [],
        suggestions: [
          'Let’s pause. We can check who sent it.',
          'We don’t click prizes first. We ask an adult.',
          'Show me the link. We’ll look together.',
          'What do you think could happen if it’s fake?'
        ]
      };

  return { scores, is_positive, star_delta, x_delta, feedback, reason_code };
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(h => h && (h.role === 'adult' || h.role === 'kid') && typeof h.text === 'string' && h.text.trim())
    .map(h => ({ role: h.role, text: h.text.trim().slice(0, 300) }));
}

app.post('/api/child-reply', async (req, res) => {
  const { adult_message, history = [], emotional_load = 0, language } = req.body || {};
  if (!adult_message || typeof adult_message !== 'string') {
    return res.status(400).json({ error: 'adult_message required' });
  }
  const lang = normalizeLanguage(language);
  const cleanHistory = sanitizeHistory(history);
  const recentHistory = cleanHistory.slice(-6);
  const turnIndex = Math.floor(recentHistory.length / 2) + 1;

  const messages = [
    { role: 'system', content: getChildSystemPrompt(lang) },
    {
      role: 'system',
      content:
        `Scenario: child sees a prize popup link and wants to click. Current emotional_load: ${emotional_load}. ` +
        `Turn: ${turnIndex}. Conversation so far (latest ${recentHistory.length} messages, real dialogue only):\n` +
        recentHistory.map((h, i) => `${i + 1}. ${h.role === 'adult' ? 'Parent' : 'Alex'}: ${h.text}`).join('\n')
    }
  ];
  if (recentHistory.length) {
    recentHistory.forEach(h => {
      if (!h?.text) return;
      messages.push({ role: h.role === 'kid' ? 'assistant' : 'user', content: h.text });
    });
  }
  messages.push({ role: 'user', content: adult_message });

  try {
    const content = await callGroq(messages, { temperature: 0.8 });
    const json = extractJSON(content);
    if (!json) throw new Error('No JSON');
    const out = {
      child_reply: clampWords(json.child_reply || '', 20),
      emotion_label: normalizeEmotionLabel(json.emotion_label || 'neutral'),
      emotional_load: typeof json.emotional_load === 'number' ? json.emotional_load : emotional_load,
      thought_bubble: json.thought_bubble || ''
    };
    out.child_reply = alignChildReplyWithEmotion(out.child_reply, out.emotion_label, lang);
    out.child_reply = ensureNotRepeatedChildReply(out.child_reply, cleanHistory, lang, out.emotion_label);
    return res.json(out);
  } catch {
    const fallback = getFallbackChildReply(lang);
    fallback.emotion_label = normalizeEmotionLabel(fallback.emotion_label);
    fallback.child_reply = alignChildReplyWithEmotion(fallback.child_reply, fallback.emotion_label, lang);
    fallback.child_reply = ensureNotRepeatedChildReply(fallback.child_reply, cleanHistory, lang, fallback.emotion_label);
    return res.json(fallback);
  }
});

app.post('/api/evaluate-intervention', async (req, res) => {
  const { adult_message, language } = req.body || {};
  if (!adult_message || typeof adult_message !== 'string') {
    return res.status(400).json({ error: 'adult_message required' });
  }
  const lang = normalizeLanguage(language);
  const result = evaluateIntervention(adult_message, lang);
  return res.json(result);
});

app.post('/api/suggestions', async (req, res) => {
  const { draft = '', history = [], chip_selections = {}, language, seen_suggestions = [] } = req.body || {};
  const lang = normalizeLanguage(language);
  const cleanHistory = sanitizeHistory(history);
  const lastChildReply = getLastByRole(cleanHistory, 'kid');
  const suggestions = generateDeterministicSuggestions({
    lang,
    lastChildReply,
    emotionLabel: 'neutral',
    seenSuggestions: seen_suggestions
  });
  return res.json({ suggestions });
});

app.post('/api/analyze-interventions', async (req, res) => {
  const { intervention_history = [], outcome = 'partial_success', language } = req.body || {};
  const lang = normalizeLanguage(language);
  const summary =
    lang === 'zh_TW'
      ? outcome === 'success'
        ? '你成功幫助孩子做出安全選擇。'
        : '孩子點擊了連結。還可以更好地引導。'
      : outcome === 'success'
        ? 'You successfully helped the child make safe choices.'
        : 'The child clicked the link. Guidance can be improved.';

  const interventions = Array.isArray(intervention_history)
    ? intervention_history.map(item => ({
        round: item.round,
        adult_message: item.adult_message,
        child_reply: item.child_reply,
        evaluation: item.was_positive ? 'positive' : item.was_negative ? 'negative' : 'neutral',
        reason: item.evaluation_reason || (item.was_positive
          ? lang === 'zh_TW'
            ? '這次介入是有效的。'
            : 'This intervention was effective.'
          : item.was_negative
            ? lang === 'zh_TW'
              ? '這次介入效果不佳。'
              : 'This intervention was not effective.'
            : lang === 'zh_TW'
              ? '這次介入較為中性。'
              : 'This intervention was neutral.')
      }))
    : [];

  return res.json({
    analysis: {
      summary,
      interventions
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', llm_configured: !!GROQ_API_KEY });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
