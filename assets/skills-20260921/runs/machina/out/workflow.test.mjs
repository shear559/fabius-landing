// node:test suite for out/workflow.json
//
// Two kinds of checks:
//  1. STRUCTURE — read workflow.json itself and assert the graph is sound:
//     every node is reachable/connected, an error path exists and reaches an
//     alert node, and every credential-bearing node references a credential
//     by {id, name} rather than embedding a secret value.
//  2. LOGIC — n8n is not available in this environment, so we cannot execute
//     the real workflow. Instead we re-implement the workflow's documented
//     control flow (see out/RUNBOOK.md) as a small pure function, injected
//     with stub services standing in for Google Sheets / SMTP / Slack, and
//     walk three sample payloads through it: a new lead, a duplicate, and a
//     failing email step. This proves the *intended* logic (dedupe-by-email,
//     append-before-send, mark-sent-after-send, alert-on-any-failure) is
//     internally consistent and matches what the node graph in workflow.json
//     encodes. It is not a substitute for running the real workflow.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflow = JSON.parse(readFileSync(join(__dirname, 'workflow.json'), 'utf8'));

// ---------------------------------------------------------------------------
// 1. STRUCTURE
// ---------------------------------------------------------------------------

describe('workflow.json structure', () => {
  const nodesByName = new Map(workflow.nodes.map((n) => [n.name, n]));

  test('every node has a unique id and name', () => {
    const ids = workflow.nodes.map((n) => n.id);
    const names = workflow.nodes.map((n) => n.name);
    assert.equal(new Set(ids).size, ids.length, 'duplicate node id found');
    assert.equal(new Set(names).size, names.length, 'duplicate node name found');
  });

  test('every connection references nodes that exist', () => {
    for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
      assert.ok(nodesByName.has(sourceName), `connection source "${sourceName}" is not a node`);
      for (const branch of outputs.main) {
        for (const conn of branch) {
          assert.ok(
            nodesByName.has(conn.node),
            `connection target "${conn.node}" (from "${sourceName}") is not a node`
          );
        }
      }
    }
  });

  test('every non-trigger, non-sticky node is connected (reachable from the trigger, or is an intentional sink)', () => {
    const trigger = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    assert.ok(trigger, 'no webhook trigger node found');

    // BFS forward reachability from the trigger.
    const reachable = new Set([trigger.name]);
    const queue = [trigger.name];
    while (queue.length) {
      const current = queue.shift();
      const outputs = workflow.connections[current];
      if (!outputs) continue;
      for (const branch of outputs.main) {
        for (const conn of branch) {
          if (!reachable.has(conn.node)) {
            reachable.add(conn.node);
            queue.push(conn.node);
          }
        }
      }
    }

    const realNodes = workflow.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
    for (const node of realNodes) {
      assert.ok(reachable.has(node.name), `node "${node.name}" is not reachable from the trigger`);
    }

    // Also require every non-trigger real node to have at least one incoming connection.
    const hasIncoming = new Set();
    for (const outputs of Object.values(workflow.connections)) {
      for (const branch of outputs.main) {
        for (const conn of branch) hasIncoming.add(conn.node);
      }
    }
    for (const node of realNodes) {
      if (node.name === trigger.name) continue;
      assert.ok(hasIncoming.has(node.name), `node "${node.name}" has no incoming connection`);
    }
  });

  test('an error path exists: service-calling nodes opt into continueErrorOutput and their error output reaches an alert node', () => {
    const serviceNodeTypes = new Set([
      'n8n-nodes-base.googleSheets',
      'n8n-nodes-base.emailSend',
      'n8n-nodes-base.slack',
    ]);
    // The alert node itself is the terminal leaf of the error-handling chain
    // (it runs in parallel with, not upstream of, the error response), so it
    // is exempt from needing its own further error branch.
    const serviceNodes = workflow.nodes.filter(
      (n) => serviceNodeTypes.has(n.type) && !/alert/i.test(n.name)
    );
    assert.ok(serviceNodes.length > 0, 'expected at least one external-service node');

    for (const node of serviceNodes) {
      assert.equal(
        node.onError,
        'continueErrorOutput',
        `service node "${node.name}" must set onError: continueErrorOutput so a failure doesn't just abort the run silently`
      );
      const outputs = workflow.connections[node.name];
      assert.ok(outputs, `service node "${node.name}" has no outgoing connections at all`);
      assert.ok(
        outputs.main.length >= 2 && outputs.main[1] && outputs.main[1].length > 0,
        `service node "${node.name}" has no wired error output (main[1])`
      );
    }

    // Every error output must eventually reach a Slack alert node.
    const alertNode = workflow.nodes.find(
      (n) => n.type === 'n8n-nodes-base.slack' && /alert/i.test(n.name)
    );
    assert.ok(alertNode, 'no Slack alert node found for failures');

    for (const node of serviceNodes) {
      const errorTargets = workflow.connections[node.name].main[1].map((c) => c.node);
      for (const targetName of errorTargets) {
        // Follow the chain forward until we hit the alert node or run out of nodes.
        let current = targetName;
        let reachedAlert = false;
        const seen = new Set();
        while (current && !seen.has(current)) {
          if (current === alertNode.name) {
            reachedAlert = true;
            break;
          }
          seen.add(current);
          const next = workflow.connections[current];
          current = next?.main?.[0]?.[0]?.node;
        }
        assert.ok(
          reachedAlert,
          `error output of "${node.name}" -> "${targetName}" does not reach the alert node "${alertNode.name}"`
        );
      }
    }
  });

  test('credential-bearing nodes reference credentials by {id, name} and never embed a secret value', () => {
    const credentialNodes = workflow.nodes.filter((n) => n.credentials);
    assert.ok(credentialNodes.length > 0, 'expected at least one node with credentials');

    const secretKeyPattern = /(key|token|secret|password|apikey)/i;

    for (const node of credentialNodes) {
      for (const [credType, cred] of Object.entries(node.credentials)) {
        assert.equal(typeof credType, 'string');
        assert.ok(cred && typeof cred === 'object', `credential on "${node.name}" must be an object`);
        assert.ok('id' in cred, `credential on "${node.name}" must reference an id`);
        assert.ok('name' in cred, `credential on "${node.name}" must reference a name`);
        const allowedKeys = new Set(['id', 'name']);
        for (const key of Object.keys(cred)) {
          assert.ok(allowedKeys.has(key), `credential on "${node.name}" has unexpected key "${key}" (possible embedded secret)`);
        }
      }

      // Scan this node's own parameters for anything that smells like an embedded secret
      // (a literal string value, not an n8n expression starting with "=", under a
      // suspicious key name).
      const scan = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && secretKeyPattern.test(key)) {
            assert.ok(
              value.startsWith('=') || value.startsWith('REPLACE_WITH') || value === '',
              `node "${node.name}" parameter "${key}" looks like an embedded secret literal: "${value}"`
            );
          } else if (typeof value === 'object') {
            scan(value);
          }
        }
      };
      scan(node.parameters);
    }
  });

  test('workflow is not active (must be reviewed on a live instance before activation)', () => {
    assert.equal(workflow.active, false);
  });
});

// ---------------------------------------------------------------------------
// 2. LOGIC — reference implementation of the documented control flow, run
//    against stubbed services standing in for Google Sheets / SMTP / Slack.
// ---------------------------------------------------------------------------

/**
 * Mirrors the node graph in workflow.json:
 *   Validate Email -> Search by Email -> Is Duplicate? -> [Mark Duplicate | Append -> Send Email -> Mark Sent -> Slack]
 * with every service call funneling failures into a single alert+error-response path.
 */
async function processLead(payload, services) {
  const email = (payload?.email ?? '').toString().trim().toLowerCase();

  if (!email) {
    await services.alert({ failedNode: 'Validate Email', email: 'unknown', errorMessage: 'Missing required field: email' });
    return { status: 'error', statusCode: 400, message: 'Missing required field: email' };
  }

  let existing;
  try {
    existing = await services.searchByEmail(email);
  } catch (err) {
    await services.alert({ failedNode: 'Google Sheets - Search by Email', email, errorMessage: err.message });
    return { status: 'error', statusCode: 500, message: err.message };
  }

  if (existing) {
    return { status: 'duplicate', statusCode: 200, message: 'Lead already processed, skipped.', email };
  }

  const record = {
    email,
    firstName: payload.firstName ?? '',
    lastName: payload.lastName ?? '',
    company: payload.company ?? '',
    submittedAt: new Date().toISOString(),
    welcomeEmailSent: false,
  };

  try {
    await services.appendLead(record);
  } catch (err) {
    await services.alert({ failedNode: 'Google Sheets - Append Lead', email, errorMessage: err.message });
    return { status: 'error', statusCode: 500, message: err.message };
  }

  try {
    await services.sendWelcomeEmail(record);
  } catch (err) {
    // Row already exists with welcomeEmailSent=false. We deliberately do NOT
    // retry automatically here: a resubmission with the same email will now
    // be caught by the duplicate check above and skipped, guaranteeing the
    // email is never sent twice at the cost of requiring manual remediation
    // on this alert. See out/RUNBOOK.md.
    await services.alert({ failedNode: 'Send Welcome Email', email, errorMessage: err.message });
    return { status: 'error', statusCode: 500, message: err.message };
  }

  try {
    await services.markEmailSent(email);
  } catch (err) {
    await services.alert({ failedNode: 'Google Sheets - Mark Email Sent', email, errorMessage: err.message });
    return { status: 'error', statusCode: 500, message: err.message };
  }

  try {
    await services.postSlack(record);
  } catch (err) {
    await services.alert({ failedNode: 'Slack - Notify Team', email, errorMessage: err.message });
    return { status: 'error', statusCode: 500, message: err.message };
  }

  return { status: 'created', statusCode: 200, message: 'Lead processed.', email };
}

function makeStubServices(sheetRows) {
  const emailsSent = [];
  const slackPosts = [];
  const alerts = [];
  return {
    sheetRows,
    emailsSent,
    slackPosts,
    alerts,
    async searchByEmail(email) {
      return sheetRows.find((r) => r.email === email) ?? null;
    },
    async appendLead(record) {
      sheetRows.push({ ...record });
    },
    async sendWelcomeEmail(record) {
      emailsSent.push(record.email);
    },
    async markEmailSent(email) {
      const row = sheetRows.find((r) => r.email === email);
      if (row) row.welcomeEmailSent = true;
    },
    async postSlack(record) {
      slackPosts.push(record.email);
    },
    async alert(details) {
      alerts.push(details);
    },
  };
}

describe('workflow logic (stubbed services)', () => {
  test('new lead: added to the sheet, welcome email sent once, posted to Slack, no alert', async () => {
    const sheetRows = [];
    const services = makeStubServices(sheetRows);

    const result = await processLead(
      { email: '[email]', firstName: 'Ada', lastName: 'Lovelace', company: 'Analytical Engines' },
      services
    );

    assert.equal(result.status, 'created');
    assert.equal(result.statusCode, 200);
    assert.equal(sheetRows.length, 1);
    assert.equal(sheetRows[0].email, 'ada@example.com', 'email should be normalized to lowercase/trimmed');
    assert.equal(sheetRows[0].welcomeEmailSent, true);
    assert.deepEqual(services.emailsSent, ['ada@example.com']);
    assert.deepEqual(services.slackPosts, ['ada@example.com']);
    assert.equal(services.alerts.length, 0);
  });

  test('duplicate lead: second submission with the same email is skipped, no second email, no second Slack post, no alert', async () => {
    const sheetRows = [];
    const services = makeStubServices(sheetRows);

    const first = await processLead({ email: 'grace@example.com', firstName: 'Grace' }, services);
    const second = await processLead({ email: '[email]  '.trim(), firstName: 'Grace' }, services);

    assert.equal(first.status, 'created');
    assert.equal(second.status, 'duplicate');
    assert.equal(second.statusCode, 200);
    assert.equal(sheetRows.length, 1, 'only one row should exist for the email');
    assert.deepEqual(services.emailsSent, ['grace@example.com'], 'welcome email must be sent exactly once');
    assert.deepEqual(services.slackPosts, ['grace@example.com'], 'Slack notification must be posted exactly once');
    assert.equal(services.alerts.length, 0);
  });

  test('failing email step: lead is recorded, alert fires, email is not marked sent, and a retried submission is treated as a duplicate (never double-sent)', async () => {
    const sheetRows = [];
    const services = makeStubServices(sheetRows);
    services.sendWelcomeEmail = async () => {
      throw new Error('SMTP connection refused');
    };

    const result = await processLead({ email: 'hedy@example.com', firstName: 'Hedy' }, services);

    assert.equal(result.status, 'error');
    assert.equal(result.statusCode, 500);
    assert.equal(sheetRows.length, 1, 'the lead row must still be appended before the email attempt');
    assert.equal(sheetRows[0].welcomeEmailSent, false, 'must not be marked sent when the send failed');
    assert.deepEqual(services.emailsSent, [], 'no email was actually sent');
    assert.deepEqual(services.slackPosts, [], 'Slack notification must not fire after an upstream failure');
    assert.equal(services.alerts.length, 1, 'exactly one alert must fire');
    assert.equal(services.alerts[0].failedNode, 'Send Welcome Email');
    assert.equal(services.alerts[0].email, 'hedy@example.com');

    // A retry (e.g. the user resubmits the form, or a naive automatic retry)
    // must not send a second welcome email — this is the hard guarantee.
    const retry = await processLead({ email: 'hedy@example.com', firstName: 'Hedy' }, services);
    assert.equal(retry.status, 'duplicate');
    assert.deepEqual(services.emailsSent, [], 'welcome email must still never have been sent, even after a retry');
  });

  test('missing email: rejected with 400 and an alert, before any service is called', async () => {
    const sheetRows = [];
    const services = makeStubServices(sheetRows);

    const result = await processLead({ firstName: 'No Email' }, services);

    assert.equal(result.status, 'error');
    assert.equal(result.statusCode, 400);
    assert.equal(sheetRows.length, 0);
    assert.equal(services.emailsSent.length, 0);
    assert.equal(services.alerts.length, 1);
    assert.equal(services.alerts[0].failedNode, 'Validate Email');
  });
});
