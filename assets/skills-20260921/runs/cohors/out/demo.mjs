// Deterministic worked adapter for out/team.json: no model, network, shell or extra file writes.
// Demonstrates that (a) the plan executes end to end through the scheduler's caller-owned
// authorize/runner seam, and (b) no task output ever contains a "send" action — sending stays a
// human-only step outside this plan entirely.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const cohortPath = process.env.COHORT_MJS || '[fabius-3.2.0]/skills/fabius-cohors/scripts/cohort.mjs';
const { executePlan } = await import(pathToFileURL(cohortPath));

const plan = JSON.parse(readFileSync(new URL('./team.json', import.meta.url)));

const TRIAGE = {
  t_howto: { ticketId: 'T-1001', category: 'how_to', language: 'en', queue: 'self_serve', tags: ['how_to'], needsHumanEscalation: false, note: 'Customer asks how to export invoices as CSV.' },
  t_bug: { ticketId: 'T-1002', category: 'bug', language: 'pt', queue: 'engineering', tags: ['bug'], needsHumanEscalation: false, note: 'HTTP 500 saving a report, first seen today.' },
  t_billing_question: { ticketId: 'T-1003', category: 'billing_question', language: 'en', queue: 'billing', tags: ['billing_question'], needsHumanEscalation: false, note: 'Customer wants to update the card on file.' },
  t_billing_dispute: { ticketId: 'T-1004', category: 'billing_dispute', language: 'en', queue: 'billing', tags: ['billing_dispute'], needsHumanEscalation: true, note: 'Customer disputes a duplicate charge for September.' },
  t_account_access: { ticketId: 'T-1005', category: 'account_access', language: 'pt', queue: 'account_security', tags: ['account_access'], needsHumanEscalation: false, note: 'Login broken, password reset email not arriving.' },
  t_feature_request: { ticketId: 'T-1006', category: 'feature_request', language: 'en', queue: 'product', tags: ['feature_request'], needsHumanEscalation: false, note: 'Requesting a dark mode for the dashboard.' },
  t_security_report: { ticketId: 'T-1007', category: 'security_report', language: 'en', queue: 'security', tags: ['security_report'], needsHumanEscalation: true, note: '' },
  t_legal: { ticketId: 'T-1008', category: 'legal', language: 'en', queue: 'legal', tags: ['legal'], needsHumanEscalation: true, note: '' },
};

const DRAFT = {
  d_howto: { draftText: 'Hi! You can export all invoices as CSV from Billing > Invoices > Export. Let us know if you need a specific date range.', sourcesUsed: ['kb-0142'], confidence: 'high' },
  d_bug: { draftText: 'Obrigado por avisar. Nossa equipe de engenharia esta investigando o erro 500 ao salvar relatorios. Vamos atualizar este chamado assim que tivermos novidades.', sourcesUsed: [], confidence: 'medium' },
  d_billing_question: { draftText: 'You can update your card under Billing > Payment methods > Add new card, then set it as default before your next invoice date.', sourcesUsed: ['kb-0087'], confidence: 'high' },
  d_account_access: { draftText: 'Sinto muito pelo transtorno. Vamos reenviar o link de redefinicao de senha e verificar se seu email esta correto no cadastro.', sourcesUsed: ['kb-0021'], confidence: 'medium' },
  d_feature_request: { draftText: 'Thanks for the suggestion! We do not have dark mode shipped yet, but I have logged this request with our product team.', sourcesUsed: [], confidence: 'low' },
};

const result = await executePlan(plan, {
  concurrency: 4,
  // Mirrors the least-privilege claim in TEAM.md: triage can never touch create_draft_reply,
  // drafter can never touch add_tag/assign_queue, and no agent in this plan ever carries a
  // "send" tool at all.
  authorize: ({ agent }) =>
    (agent.id !== 'triage' || !agent.tools.includes('create_draft_reply'))
    && (agent.id !== 'drafter' || (!agent.tools.includes('add_tag') && !agent.tools.includes('assign_queue')))
    && agent.tools.every(tool => tool !== 'send_reply' && !tool.includes('send')),
  runner: async ({ task }) => (task.agent === 'triage' ? TRIAGE[task.id] : { ticketId: task.input.ticketId, category: TRIAGE['t_' + task.id.slice(2)].category, ...DRAFT[task.id], readyForReview: true }),
});

console.log(JSON.stringify(result, null, 2));
if (result.status !== 'succeeded') process.exitCode = 1;
