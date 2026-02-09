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

function evaluateIntervention(adultMessage, lang) {
  const msgLower = (adultMessage || '').toLowerCase();
  const msgRaw = adultMessage || '';

  const positiveEn = ['don\'t', 'do not', 'safe', 'danger', 'ask', 'adult', 'parent', 'explain', 'help', "let's", 'together', 'why'];
  const negativeEn = ['click it', 'go ahead', 'just click', 'trust it', 'it\'s fine'];
  const positiveZh = ['不要', '安全', '危險', '詢問', '大人', '家長', '解釋', '幫忙', '一起', '為什麼'];
  const negativeZh = ['點擊', '快點', '直接', '沒事', '放心'];

  const hasPositive =
    positiveEn.some(k => msgLower.includes(k)) || positiveZh.some(k => msgRaw.includes(k));
  const hasNegative =
    negativeEn.some(k => msgLower.includes(k)) || negativeZh.some(k => msgRaw.includes(k));

  const hasSupport =
    msgLower.includes('together') ||
    msgLower.includes('help') ||
    msgRaw.includes('一起') ||
    msgRaw.includes('幫');

  const hasGuided =
    msgLower.includes('what do you think') ||
    msgLower.includes('should we') ||
    msgRaw.includes('你覺得') ||
    msgRaw.includes('要不要');

  const scores = {
    explanation_vs_command: hasPositive && !hasNegative ? 1 : hasNegative ? -1 : 0,
    emotional_stabilization: hasSupport ? 1 : hasNegative ? -1 : 0,
    guided_decision: hasGuided ? 1 : 0
  };
  const total = scores.explanation_vs_command + scores.emotional_stabilization + scores.guided_decision;
  const is_positive = total > 0;

  const feedback = lang === 'zh_TW'
    ? {
        summary: is_positive ? '支持性指導。' : '過於控制或不清楚。',
        strengths: is_positive ? ['冷靜且兒童友好'] : [],
        risks: !is_positive ? ['可能會增加情緒負擔'] : [],
        suggestions: [
          '讓我們暫停一下。我們可以檢查是誰發送的。',
          '我們不會先點擊獎品。我們先問大人。',
          '給我看連結。我們一起看看。',
          '你覺得如果是假的會發生什麼？'
        ]
      }
    : {
        summary: is_positive ? 'Supportive guidance.' : 'Too controlling or unclear.',
        strengths: is_positive ? ['Calm and child-friendly'] : [],
        risks: !is_positive ? ['May raise emotional load'] : [],
        suggestions: [
          'Let’s pause. We can check who sent it.',
          'We don’t click prizes first. We ask an adult.',
          'Show me the link. We’ll look together.',
          'What do you think could happen if it’s fake?'
        ]
      };

  return { scores, is_positive, feedback };
}

app.post('/api/child-reply', async (req, res) => {
  const { adult_message, history = [], emotional_load = 0, language } = req.body || {};
  if (!adult_message || typeof adult_message !== 'string') {
    return res.status(400).json({ error: 'adult_message required' });
  }
  const lang = normalizeLanguage(language);
  const messages = [
    { role: 'system', content: getChildSystemPrompt(lang) },
    { role: 'system', content: `Scenario: child sees a prize popup link and wants to click. Current emotional_load: ${emotional_load}.` }
  ];
  if (Array.isArray(history)) {
    history.forEach(h => {
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
      emotion_label: json.emotion_label || 'neutral',
      emotional_load: typeof json.emotional_load === 'number' ? json.emotional_load : emotional_load,
      thought_bubble: json.thought_bubble || ''
    };
    return res.json(out);
  } catch {
    return res.json(getFallbackChildReply(lang));
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
  const { draft = '', history = [], chip_selections = {}, language } = req.body || {};
  const lang = normalizeLanguage(language);
  const userPrompt = `Draft idea: "${draft}"
Chips: ${JSON.stringify(chip_selections)}
Return 4 adult dialogue options as JSON.`;

  const messages = [
    { role: 'system', content: getSuggestSystemPrompt(lang) },
    { role: 'user', content: userPrompt }
  ];

  try {
    const content = await callGroq(messages, { temperature: 0.7 });
    const json = extractJSON(content);
    if (!json || !Array.isArray(json.suggestions)) throw new Error('Bad format');
    let suggestions = json.suggestions.slice(0, 4).map(s => String(s));
    if (lang === 'zh_TW' && !suggestions.every(hasChinese)) {
      suggestions = getSuggestionFallback(lang);
    }
    return res.json({ suggestions });
  } catch {
    return res.json({ suggestions: getSuggestionFallback(lang) });
  }
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
        reason: item.was_positive
          ? lang === 'zh_TW'
            ? '這次介入是有效的。'
            : 'This intervention was effective.'
          : item.was_negative
            ? lang === 'zh_TW'
              ? '這次介入效果不佳。'
              : 'This intervention was not effective.'
            : lang === 'zh_TW'
              ? '這次介入較為中性。'
              : 'This intervention was neutral.'
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
