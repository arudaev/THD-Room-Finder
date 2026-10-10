const test = require('node:test');
const assert = require('node:assert/strict');
const { linkedIssueNumbers, pullRequestStatus } = require('./project-sync.cjs');
const syncProject = require('./project-sync.cjs');
const config = require('../project-config.json');

test('links only explicit same-repository issue lines', () => {
  assert.deepEqual(linkedIssueNumbers('Issue: #17\nCloses https://github.com/arudaev/THD-Room-Finder/issues/18\nParent epic #16\nDependency #19', 'arudaev', 'THD-Room-Finder'), [17, 18]);
});
test('ignores foreign links, code examples, duplicates and malformed IDs', () => {
  assert.deepEqual(linkedIssueNumbers('Issue: https://github.com/other/repo/issues/1\n```\nCloses #2\n```\nIssue: #3\nCloses #3\nIssue: #4oops', 'arudaev', 'THD-Room-Finder'), [3]);
});
test('draft and review-ready PRs have different project states', () => {
  assert.equal(pullRequestStatus({ state: 'open', draft: true }), 'In progress');
  assert.equal(pullRequestStatus({ state: 'open', draft: false }), 'In review');
});
test('closed-unmerged PR is not completed work', () => {
  assert.equal(pullRequestStatus({ state: 'closed', merged: false }), 'Backlog');
  assert.equal(pullRequestStatus({ state: 'closed', merged: true }), 'Done');
});

test('merging a stack layer does not complete its still-open issue', async () => {
  const updates = [];
  const pr = { node_id: 'pr-node', number: 7, state: 'closed', merged: true, merged_at: '2026-10-10T12:00:00Z', body: 'Closes #19' };
  const github = {
    graphql: async (query, variables) => {
      if (query.includes('addProjectV2ItemById')) return { addProjectV2ItemById: { item: { id: variables.content } } };
      updates.push(variables);
      return {};
    },
    rest: {
      pulls: { get: async () => ({ data: pr }) },
      issues: { get: async () => ({ data: { node_id: 'issue-node', state: 'open' } }) },
    },
  };
  await syncProject({ github, context: { repo: { owner: 'arudaev', repo: 'THD-Room-Finder' }, payload: { pull_request: pr } }, core: { info() {} } });
  assert.ok(updates.some(update => update.item === 'pr-node' && update.option === config.statusOptions.Done));
  assert.ok(updates.some(update => update.item === 'issue-node' && update.option === config.statusOptions['In review']));
  assert.ok(!updates.some(update => update.item === 'issue-node' && (update.option === config.statusOptions.Done || update.date)));
});
