import type { Problem } from './lib/content';

export const siteConfig = {
  title: '训练记录',
  github: {
    repository: 'mohaoz/jxufe_daily',
    submissionIssueTemplate: 'record.yml',
    submissionLabels: ['record']
  }
};

export function getSubmissionIssueTitle(problem: Problem): string {
  return `[做题记录] [${problem.id}]`;
}

export function getSubmissionIssuePrefill(problem: Problem) {
  return [
    { label: 'Issue 标题', value: getSubmissionIssueTitle(problem) },
    { label: '题目 ID', value: problem.id },
    { label: '可展示为题解', value: 'false' },
    { label: '标签', value: siteConfig.github.submissionLabels.join(', ') }
  ];
}

export function getSubmissionIssueUrl(problem: Problem): string | null {
  const repository = siteConfig.github.repository.trim();
  if (!repository) {
    return null;
  }

  const url = new URL(`https://github.com/${repository}/issues/new`);
  url.searchParams.set('template', siteConfig.github.submissionIssueTemplate);
  url.searchParams.set('title', getSubmissionIssueTitle(problem));
  url.searchParams.set('problem', problem.id);
  url.searchParams.set('solution', 'false');
  if (siteConfig.github.submissionLabels.length > 0) {
    url.searchParams.set('labels', siteConfig.github.submissionLabels.join(','));
  }
  return url.toString();
}
