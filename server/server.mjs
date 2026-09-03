import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 8080);
const conversations = new Map();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Keep the role prompts on the server: browser requests can select a role, but cannot replace its policy.
const operators = {
  mira: { name: 'Mira', role: 'Product Designer', prompt: 'You are Mira, a thoughtful senior product designer. Be warm, decisive and visual. Clarify the product goal, user and desired outcome before proposing a structured design direction.' },
  noa: { name: 'Noa', role: 'Growth Operator', prompt: 'You are Noa, a practical growth operator. Focus on customer insight, a single measurable experiment and precise next steps. Avoid empty marketing language.' },
  avi: { name: 'Avi', role: 'Client Concierge', prompt: 'You are Avi, a calm and meticulous client operations concierge. Keep requests moving, make decisions legible, and draft messages that are concise and human.' },
  sam: { name: 'Sam', role: 'QA Investigator', prompt: 'You are Sam, an exacting but constructive QA investigator. Ask for expected behaviour, environment and reproduction steps. Prioritise impact and give clear test cases.' },
  rhea: { name: 'Rhea', role: 'Risk & Policy Analyst', prompt: 'You are Rhea, a careful risk and policy analyst. Be precise about uncertainty, avoid presenting legal advice, and give structured checklists with escalation points.' },
  leo: { name: 'Leo', role: 'Security Scout', prompt: 'You are Leo, a pragmatic security scout. Focus on defensive, authorised work. Explain risk in plain language, rank actions by impact, and never suggest bypassing protections.' }
};

app.use(express.json({ limit: '1mb' }));

app.post('/api/chat', async (req, res) => {
  const { agentId, message, conversationId, history } = req.body || {};
  const operator = operators[agentId];
  if (!operator || typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'A valid agent and message are required.' });
  const sessionId = conversationId || `rw_${agentId}_${crypto.randomUUID()}`;
  const session = conversations.get(sessionId) || { agentId, createdAt: new Date().toISOString(), previousResponseId: null };
  if (session.agentId !== agentId) return res.status(400).json({ error: 'This conversation belongs to another operator.' });
  conversations.set(sessionId, session);

  if (openai) {
    try {
      const retainedHistory = Array.isArray(history) ? history.slice(-20).flatMap((item) => {
        if (!item || typeof item.text !== 'string' || !['user', 'agent'].includes(item.from)) return [];
        return [{ role: item.from === 'agent' ? 'assistant' : 'user', content: item.text }];
      }) : [];
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        instructions: `${operator.prompt}\n\nYou are working inside RelayWorks. Stay in character as ${operator.name}. If the user asks for an action requiring an external connector, explain what you need and offer a draft or plan; do not claim it was completed.`,
        // If the local server was restarted, rebuild the visible history once. In a live
        // server session `previous_response_id` keeps the API conversation continuous.
        input: session.previousResponseId ? message.trim() : (retainedHistory.length ? retainedHistory : message.trim()),
        ...(session.previousResponseId ? { previous_response_id: session.previousResponseId } : {})
      });
      session.previousResponseId = response.id;
      return res.json({ reply: response.output_text || 'I could not produce a text response for that request.', conversationId: sessionId, mode: 'openai' });
    } catch (error) {
      console.error('OpenAI gateway error:', error.message);
      return res.status(error.status || 502).json({ error: error.message || 'OpenAI could not complete this request.' });
    }
  }
  return res.status(503).json({ error: 'OpenAI is not configured yet. Add OPENAI_API_KEY to the .env file and restart the server.' });
});

app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.listen(port, () => console.log(`RelayWorks is running at http://localhost:${port}`));
