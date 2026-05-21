/**
 * Quick Groq connectivity test — run from server folder:
 *   node test-gemini.js
 */
require('dotenv').config();
const { detectAIContent, generateQuestions } = require('./services/gemini');

const sampleText = `
I implemented a binary search tree in Python for my data structures assignment.
The insert function walks from the root and compares keys — I chose recursion because
it matches how we drew it on the whiteboard in lab. My partner thought iterative was
cleaner but I stuck with what I understood from lecture 7.
`.trim();

async function main() {
  const keyOk =
    process.env.GROQ_API_KEY &&
    !process.env.GROQ_API_KEY.startsWith('your_') &&
    !process.env.GROQ_API_KEY.startsWith('mock');

  console.log(`GROQ_API_KEY: ${keyOk ? 'configured' : 'MISSING — add to server/.env'}`);
  if (!keyOk) {
    process.exit(1);
  }

  console.log('\n--- AI Detection Test ---');
  const detection = await detectAIContent(sampleText);
  console.log(JSON.stringify(detection, null, 2));

  console.log('\n--- Question Generation Test ---');
  const questions = await generateQuestions(sampleText);
  questions.forEach((q, i) => console.log(`${i + 1}. ${q}`));

  console.log('\n✅ Groq tests passed.');
}

main().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
