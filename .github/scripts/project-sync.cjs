const config = require('../project-config.json');

function linkedIssueNumbers(body, owner, repo) {
  const text = (body || '').replace(/```[\s\S]*?```/g, '');
  const escaped = `${owner}/${repo}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:Issue:|Closes|Fixes|Resolves)\\s+(?:#(\\d+)|https://github\\.com/${escaped}/issues/(\\d+))(?=\\s|$|[.,])`, 'gi');
  return [...text.matchAll(pattern)].map(match => Number(match[1] || match[2])).filter((number, index, all) => all.indexOf(number) === index);
}

function pullRequestStatus(pr) {
  if (pr.state === 'closed') return pr.merged ? 'Done' : 'Backlog';
  return pr.draft ? 'In progress' : 'In review';
}

async function syncProject({ github, context, core }) {
  const { owner, repo } = context.repo;
  if (`${owner}/${repo}` !== config.repository) throw new Error('Unexpected repository');

  async function setItem(contentId, status, dates = {}) {
    const added = await github.graphql(`mutation($project:ID!,$content:ID!){addProjectV2ItemById(input:{projectId:$project,contentId:$content}){item{id}}}`, { project: config.projectId, content: contentId });
    const item = added.addProjectV2ItemById.item.id;
    await github.graphql(`mutation($project:ID!,$item:ID!,$field:ID!,$option:String!){updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}}){projectV2Item{id}}}`, { project: config.projectId, item, field: config.statusFieldId, option: config.statusOptions[status] });
    if (dates.completed) {
      await github.graphql(`mutation($project:ID!,$item:ID!,$field:ID!,$date:Date!){updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{date:$date}}){projectV2Item{id}}}`, { project: config.projectId, item, field: config.completedDateFieldId, date: dates.completed });
    } else if (dates.clearCompleted) {
      await github.graphql(`mutation($project:ID!,$item:ID!,$field:ID!){clearProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field}){projectV2Item{id}}}`, { project: config.projectId, item, field: config.completedDateFieldId });
    }
    if (status === 'In progress') {
      const current = await github.graphql(`query($id:ID!){node(id:$id){... on ProjectV2Item{fieldValueByName(name:"Start date"){... on ProjectV2ItemFieldDateValue{date}}}}}`, { id: item });
      if (!current.node.fieldValueByName?.date) {
        await github.graphql(`mutation($project:ID!,$item:ID!,$field:ID!,$date:Date!){updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{date:$date}}){projectV2Item{id}}}`, { project: config.projectId, item, field: config.startDateFieldId, date: new Date().toISOString().slice(0, 10) });
      }
    }
  }

  async function syncPullRequest(pr) {
    await setItem(pr.node_id, pullRequestStatus(pr), pr.merged_at ? { completed: pr.merged_at.slice(0, 10) } : { clearCompleted: true });
    for (const number of linkedIssueNumbers(pr.body, owner, repo)) {
      const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: number });
      if (issue.pull_request) continue;
      // A merge into another stack layer does not complete the child issue.
      if (issue.state === 'closed') await setItem(issue.node_id, 'Done', { completed: issue.closed_at.slice(0, 10) });
      else await setItem(issue.node_id, pr.state === 'closed' && !pr.merged ? 'Ready' : pr.draft ? 'In progress' : 'In review');
    }
  }

  if (context.payload.pull_request) {
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: context.payload.pull_request.number });
    await syncPullRequest(pr);
  } else if (context.payload.issue) {
    const issue = context.payload.issue;
    if (issue.state === 'closed') await setItem(issue.node_id, 'Done', { completed: issue.closed_at.slice(0, 10) });
    else if (context.payload.action === 'reopened') await setItem(issue.node_id, 'Ready', { clearCompleted: true });
    else if (context.payload.action === 'opened') await setItem(issue.node_id, 'Backlog');
    // Labels/assignees must not overwrite deliberate Ready/Blocked choices.
  } else {
    for await (const response of github.paginate.iterator(github.rest.pulls.list, { owner, repo, state: 'open', per_page: 100 })) {
      for (const pr of response.data) await syncPullRequest(pr);
    }
  }
  core.info('Project metadata synchronized; no merge, deployment or issue-close action performed.');
}

module.exports = syncProject;
module.exports.linkedIssueNumbers = linkedIssueNumbers;
module.exports.pullRequestStatus = pullRequestStatus;
