const Groq = require('groq-sdk');
const { languageInstruction, normalizeLanguage } = require('../utils/languages');
const { parseGroqError, toGroqHttpError } = require('../utils/groqErrors');

const apiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const groqFallbackModel = process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';

function modelChain() {
  const chain = [groqModel];
  if (groqFallbackModel && groqFallbackModel !== groqModel) chain.push(groqFallbackModel);
  return chain;
}
const isMockMode =
  !apiKey ||
  apiKey === 'your_key_from_console.groq.com' ||
  apiKey.trim() === '' ||
  apiKey.startsWith('mock');

let groq = null;

if (!isMockMode) {
  try {
    groq = new Groq({ apiKey });
    const chain = modelChain();
    console.log(
      `🤖 Groq AI client initialized. Primary: '${groqModel}'` +
        (chain.length > 1 ? `, fallback: '${groqFallbackModel}'` : '')
    );
  } catch (error) {
    console.error('❌ Failed to initialize Groq client:', error.message);
  }
} else {
  console.log('⚠️  GROQ_API_KEY not set — AI features disabled until you add a key to server/.env');
}

const MAX_PROMPT_CHARS = 12000;

function truncateForAI(text) {
  if (!text) return '';
  const s = String(text);
  if (s.length <= MAX_PROMPT_CHARS) return s;
  return s.slice(0, MAX_PROMPT_CHARS) + '\n\n[Content truncated for analysis...]';
}

function assertGroqReady(feature) {
  if (isMockMode || !groq) {
    const err = new Error(
      `GROQ_API_KEY is required for ${feature}. Get a free key at https://console.groq.com and add it to server/.env`
    );
    err.statusCode = 503;
    throw err;
  }
}

async function chatWithModel(model, prompt, options = {}) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
    });
    const text = completion.choices[0]?.message?.content || '';
    if (!text.trim()) {
      throw new Error('Groq returned an empty response.');
    }
    return text.trim();
  } catch (error) {
    throw toGroqHttpError(error);
  }
}

async function chatWithRetries(prompt, options = {}, retries = 2) {
  const models = modelChain();
  let lastError;

  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (m > 0) {
          console.warn(`⚠️  Using fallback Groq model: ${model}`);
        }
        return await chatWithModel(model, prompt, options);
      } catch (error) {
        lastError = error;
        const parsed = parseGroqError(error);
        console.error(
          `❌ Groq [${model}] attempt ${attempt}/${retries}:`,
          parsed.apiMessage?.slice(0, 200) || error.message
        );

        if (parsed.isRateLimit) {
          break;
        }
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }
    }
  }

  throw lastError || new Error('Groq request failed');
}

// Utility: strip markdown fences before JSON parsing
function cleanJSON(text) {
  return text.replace(/```json|```/g, '').trim();
}

// Utility: safe JSON parse with one retry
async function safeParseJSON(fn, retryCount = 1) {
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const raw = await fn();
      return JSON.parse(cleanJSON(raw));
    } catch (error) {
      console.error(`❌ Groq JSON parsing attempt ${attempt + 1} failed:`, error.message);
      if (attempt === retryCount) {
        throw error;
      }
    }
  }
}

// Generate 5 initial viva questions from submission content
async function generateQuestions(extractedText, language = 'en') {
  assertGroqReady('viva question generation');
  const langNote = languageInstruction(language);

  const prompt = `You are a strict academic examiner. Analyze the following submitted work and generate exactly 5 viva-style questions ordered from basic recall to deep synthesis.

LANGUAGE: ${langNote}

Return ONLY a valid JSON array of 5 question strings. No markdown, no explanation, no preamble.

Submitted Work:
${truncateForAI(extractedText)}`;

  const text = await chatWithRetries(prompt, { temperature: 0.5 });
  const parsed = JSON.parse(cleanJSON(text));
  const questions = normalizeQuestionsFromAI(parsed);
  if (!questions.length) {
    throw new Error('Groq returned invalid question format.');
  }
  while (questions.length < 5) questions.push(questions[questions.length - 1]);
  return questions.slice(0, 5);
}

function normalizeQuestionsFromAI(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'object' && Array.isArray(raw.questions)) list = raw.questions;
  return list
    .map((q) => (typeof q === 'string' ? q : q?.question || q?.text || ''))
    .map((s) => String(s).trim())
    .filter(Boolean);
}

// Generate one adaptive follow-up question based on conversation history
async function generateFollowUp(submissionText, conversationHistory, language = 'en') {
  assertGroqReady('adaptive follow-up questions');
  const langNote = languageInstruction(language);

  const historyText = conversationHistory
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`)
    .join('\n\n');

  const prompt = `You are conducting an academic viva. Here is the student's submitted work and their answers so far.

LANGUAGE: ${langNote} The student may answer in any language — evaluate understanding, not grammar of English.

Submitted Work:
${truncateForAI(submissionText)}

Conversation So Far:
${historyText}

Generate ONE sharp follow-up question that probes for deeper understanding or exposes gaps in knowledge. Return only the question string, nothing else.`;

  return await chatWithRetries(prompt, { temperature: 0.6 });
}

// Evaluate the full viva session and return a structured score
async function evaluateSession(submissionText, conversationHistory, language = 'en') {
  assertGroqReady('viva evaluation');
  const langNote = languageInstruction(language);

  const historyText = conversationHistory
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`)
    .join('\n\n');

  const prompt = `You are an academic integrity evaluator. Review the following viva session carefully. The student may have answered in English, Urdu, or Hindi — judge conceptual understanding.

LANGUAGE CONTEXT: ${langNote}

Return ONLY a valid raw JSON object with exactly this shape:

{
  "overallScore": <number 0-100>,
  "depthRating": <"Surface" | "Moderate" | "Deep">,
  "authenticityFlag": <true if overallScore < 40, else false>,
  "perQuestionFeedback": [<string feedback for each question>],
  "summary": "<overall evaluation summary paragraph>"
}

No markdown. No explanation. Only raw JSON.

Submitted Work:
${truncateForAI(submissionText)}

Viva Session:
${historyText}`;

  return await safeParseJSON(async () => chatWithRetries(prompt, { temperature: 0.4, jsonMode: true }), 2);
}

function normalizeDetection(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI detection response from Groq.');
  }

  const ai = Number(raw.aiProbability);
  if (Number.isNaN(ai)) {
    throw new Error('Groq returned invalid aiProbability — analysis failed.');
  }
  const aiClamped = Math.max(0, Math.min(100, Math.round(ai)));
  const human = 100 - aiClamped;

  let verdict = raw.verdict;
  let riskLevel = raw.riskLevel;
  if (aiClamped >= 70) {
    verdict = 'Likely AI Generated';
    riskLevel = 'High Risk';
  } else if (aiClamped >= 40) {
    verdict = 'Possibly AI Assisted';
    riskLevel = 'Medium Risk';
  } else {
    verdict = 'Likely Human Written';
    riskLevel = 'Low Risk';
  }

  return {
    aiProbability: aiClamped,
    humanProbability: human,
    verdict,
    confidenceLevel: raw.confidenceLevel || 'Medium',
    signals: {
      aiSignals: Array.isArray(raw.signals?.aiSignals) ? raw.signals.aiSignals : [],
      humanSignals: Array.isArray(raw.signals?.humanSignals) ? raw.signals.humanSignals : []
    },
    detailedReason: raw.detailedReason || 'Analysis completed.',
    riskLevel
  };
}

async function detectAIContent(extractedText) {
  assertGroqReady('AI content detection');

  if (!extractedText || !String(extractedText).trim()) {
    throw new Error('No text available for AI detection.');
  }

  const prompt = `You are an expert AI content detection system. Your job is to analyze real student submissions and determine whether the text was written by a human student or generated/copied from AI tools (ChatGPT, Claude, Gemini, Copilot, etc.).

You MUST base your analysis only on the actual text provided below. Do not guess randomly. Cite specific evidence from the submission in your signals.

Analyze carefully using these signals:
- Sentence structure uniformity and predictability
- Vocabulary diversity and naturalness
- Presence of filler phrases common in AI writing
- Logical flow and transitions
- Personal voice, opinions, and unique insights
- Grammar perfection vs natural human errors
- Repetition patterns
- Depth of original thought vs generic statements

Submitted Work:
${truncateForAI(extractedText)}

Return ONLY a valid raw JSON object with exactly this shape:
{
  "aiProbability": <number 0-100>,
  "humanProbability": <number 0-100>,
  "verdict": <"Likely AI Generated" | "Possibly AI Assisted" | "Likely Human Written">,
  "confidenceLevel": <"High" | "Medium" | "Low">,
  "signals": {
    "aiSignals": [<list of specific AI indicators found>],
    "humanSignals": [<list of specific human indicators found>]
  },
  "detailedReason": "<2-3 sentence explanation of the verdict>",
  "riskLevel": <"High Risk" | "Medium Risk" | "Low Risk">
}

Rules:
- aiProbability + humanProbability must equal 100
- If aiProbability >= 70 → verdict must be "Likely AI Generated" and riskLevel "High Risk"
- If aiProbability >= 40 → verdict must be "Possibly AI Assisted" and riskLevel "Medium Risk"
- If aiProbability < 40 → verdict must be "Likely Human Written" and riskLevel "Low Risk"
- No markdown, no explanation, raw JSON only
- aiSignals and humanSignals must each have at least 1 specific item from the actual text`;

  const parsed = await safeParseJSON(
    async () => chatWithRetries(prompt, { temperature: 0.2, jsonMode: true, maxTokens: 1500 }),
    2
  );
  const result = normalizeDetection(parsed);
  result.analyzedBy = 'Groq';
  result.model = groqModel;
  return result;
}

function clampScore(n, fallback = 50) {
  const v = Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
}

async function generateConfidenceAnalytics(submissionText, conversationHistory, baseScore, aiDetection) {
  assertGroqReady('confidence analytics');

  const historyText = conversationHistory
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`)
    .join('\n\n');

  const aiProb = aiDetection?.aiProbability ?? 0;

  const prompt = `You are an educational analytics AI. Analyze this viva session and return ONLY raw JSON:

{
  "understandingScore": <0-100>,
  "confidenceScore": <0-100 how confidently student expressed knowledge>,
  "originalityScore": <0-100 own thinking vs memorization>,
  "communicationScore": <0-100 clarity of explanations>,
  "topicMastery": <0-100>,
  "responseAccuracy": <0-100>,
  "completionRate": <0-100 based on answer completeness>,
  "aiSuspicionLevel": <0-100 submission AI risk; use ${aiProb} as baseline>,
  "weakAreas": [<specific weak concepts from answers>],
  "strongAreas": [<specific strong concepts>],
  "topicBreakdown": [{"topic": "<name>", "mastery": <0-100>}],
  "skillRadar": {
    "Conceptual": <0-100>,
    "Technical": <0-100>,
    "Communication": <0-100>,
    "ProblemSolving": <0-100>,
    "Authenticity": <0-100>
  }
}

Base viva score: ${baseScore?.overallScore ?? 'unknown'}. Submission AI probability: ${aiProb}%.

Submitted Work (excerpt):
${truncateForAI(submissionText)}

Viva:
${historyText}`;

  const raw = await safeParseJSON(
    async () => chatWithRetries(prompt, { temperature: 0.3, jsonMode: true, maxTokens: 1800 }),
    2
  );

  return {
    understandingScore: clampScore(raw.understandingScore, baseScore?.overallScore ?? 50),
    confidenceScore: clampScore(raw.confidenceScore),
    originalityScore: clampScore(raw.originalityScore),
    communicationScore: clampScore(raw.communicationScore),
    topicMastery: clampScore(raw.topicMastery),
    responseAccuracy: clampScore(raw.responseAccuracy),
    completionRate: clampScore(raw.completionRate, 100),
    aiSuspicionLevel: clampScore(raw.aiSuspicionLevel, aiProb),
    weakAreas: Array.isArray(raw.weakAreas) ? raw.weakAreas.slice(0, 8) : [],
    strongAreas: Array.isArray(raw.strongAreas) ? raw.strongAreas.slice(0, 8) : [],
    topicBreakdown: Array.isArray(raw.topicBreakdown) ? raw.topicBreakdown.slice(0, 10) : [],
    skillRadar: {
      Conceptual: clampScore(raw.skillRadar?.Conceptual),
      Technical: clampScore(raw.skillRadar?.Technical),
      Communication: clampScore(raw.skillRadar?.Communication),
      ProblemSolving: clampScore(raw.skillRadar?.ProblemSolving),
      Authenticity: clampScore(raw.skillRadar?.Authenticity, 100 - aiProb)
    },
    generatedAt: new Date()
  };
}

async function generateLearningRecommendations(submissionText, conversationHistory, analytics, baseScore) {
  assertGroqReady('learning recommendations');

  const historyText = conversationHistory
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`)
    .join('\n\n');

  const prompt = `You are an AI learning coach. Based on viva performance, create personalized study recommendations. Return ONLY raw JSON:

{
  "studyRoadmap": "<2-3 sentence personalized path>",
  "estimatedImprovementWeeks": <number 1-12>,
  "weakConcepts": [<strings>],
  "recommendations": [
    {
      "title": "<string>",
      "description": "<string>",
      "category": "<Beginner|Intermediate|Advanced>",
      "type": "<topic|video|exercise|article|coding>",
      "url": "<optional search-friendly resource hint or empty string>",
      "estimatedHours": <number>
    }
  ]
}

Provide 6-10 recommendations mixing topics, YouTube-style tutorials (describe search query), practice exercises, and coding problems where relevant.

Weak areas: ${JSON.stringify(analytics?.weakAreas || [])}
Understanding score: ${analytics?.understandingScore ?? baseScore?.overallScore}

Submission excerpt:
${truncateForAI(submissionText)}

Viva:
${historyText}`;

  const raw = await safeParseJSON(
    async () => chatWithRetries(prompt, { temperature: 0.5, jsonMode: true, maxTokens: 2200 }),
    2
  );

  return {
    studyRoadmap: raw.studyRoadmap || 'Review weak concepts and practice applied problems.',
    estimatedImprovementWeeks: Math.min(12, Math.max(1, Number(raw.estimatedImprovementWeeks) || 4)),
    weakConcepts: Array.isArray(raw.weakConcepts) ? raw.weakConcepts : analytics?.weakAreas || [],
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.slice(0, 12).map((r) => ({
          title: r.title || 'Study topic',
          description: r.description || '',
          category: ['Beginner', 'Intermediate', 'Advanced'].includes(r.category) ? r.category : 'Intermediate',
          type: r.type || 'topic',
          url: r.url || '',
          estimatedHours: Number(r.estimatedHours) || 2
        }))
      : [],
    generatedAt: new Date()
  };
}

function truncateSourceText(text, max = 12000) {
  if (!text) return '';
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

async function generateExamQuestions({
  topic,
  subject,
  difficulty,
  count,
  questionTypes,
  sourceText,
  sourceFileName
}) {
  assertGroqReady('exam generation');

  const types = questionTypes?.length ? questionTypes.join(', ') : 'mcq, text, long';
  const n = Math.min(20, Math.max(3, Number(count) || 10));
  const fromPdf = sourceText?.trim();

  const prompt = `You are an expert exam creator. Generate exactly ${n} exam questions.

Subject/Course: ${subject || 'General'}
Topic: ${topic || (fromPdf ? 'Content from uploaded document' : 'General')}
Difficulty: ${difficulty || 'Intermediate'}
Allowed types: ${types}
${fromPdf ? `\nSOURCE MATERIAL (from ${sourceFileName || 'PDF'} — base ALL questions on this content only):\n${truncateSourceText(fromPdf)}\n` : ''}

Return ONLY raw JSON:
{
  "title": "<exam title>",
  "instructions": "<exam instructions for students>",
  "questions": [
    {
      "id": "q1",
      "type": "mcq" | "text" | "long",
      "question": "<question text>",
      "options": ["A", "B", "C", "D"],
      "marks": <number 1-20>,
      "correctOption": "<optional for mcq: A/B/C/D index letter>"
    }
  ]
}

Rules:
- Mix question types as requested
- For mcq include exactly 4 options
- For text use short answers; for long use paragraph answers
- Total marks should be reasonable (5-15 per question)
- Questions must be original and academically sound`;

  const raw = await safeParseJSON(
    async () => chatWithRetries(prompt, { temperature: 0.5, jsonMode: true, maxTokens: 2200 }),
    2
  );

  const questions = (raw.questions || []).map((q, i) => ({
    id: q.id || `q${i + 1}`,
    type: ['mcq', 'text', 'long'].includes(q.type) ? q.type : 'text',
    question: String(q.question || '').trim(),
    options: q.type === 'mcq' && Array.isArray(q.options) ? q.options.slice(0, 4) : undefined,
    marks: Math.max(1, Math.min(20, Number(q.marks) || 5)),
    correctOption: q.correctOption
  }));

  return {
    title: raw.title || `${topic} Exam`,
    instructions: raw.instructions || 'Answer all questions. Read carefully before submitting.',
    questions
  };
}

async function suggestExamGrading(exam, attempt) {
  assertGroqReady('exam grading assist');

  const qna = exam.questions.map((q) => {
    const ans = attempt.answers?.find((a) => a.questionId === q.id);
    return { question: q.question, type: q.type, maxMarks: q.marks, answer: ans?.value ?? '(no answer)' };
  });

  const prompt = `You are an exam grader assistant. Suggest marks and feedback. Return ONLY raw JSON:
{
  "suggestedMarks": <total marks awarded>,
  "maxMarks": <total possible>,
  "percentage": <0-100>,
  "feedback": "<overall feedback>",
  "perQuestion": [{"questionId": "<id>", "marksAwarded": <n>, "comment": "<brief>"}],
  "missingConcepts": [<strings>],
  "qualityNotes": "<analysis of answer quality>"
}

Exam: ${exam.title}
${JSON.stringify(qna, null, 0).slice(0, 8000)}`;

  return await safeParseJSON(
    async () => chatWithRetries(prompt, { temperature: 0.3, jsonMode: true, maxTokens: 2000 }),
    2
  );
}

module.exports = {
  generateQuestions,
  generateFollowUp,
  evaluateSession,
  detectAIContent,
  generateConfidenceAnalytics,
  generateLearningRecommendations,
  generateExamQuestions,
  suggestExamGrading,
  normalizeLanguage
};
