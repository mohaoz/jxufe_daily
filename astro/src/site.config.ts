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
  return `[做题记录] ${problem.id} 用户ID`;
}

export function getSubmissionIssueBody(problem: Problem): string {
  return [
    '## 基本信息',
    '',
    `- 题目：${problem.id}`,
    '- 用户：',
    '- 评测记录：',
    '- 是否愿意公开展示为题解：false',
    '- 备注：',
    '',
    '## 可展示内容',
    '',
    '<!-- 可选。若愿意公开展示为题解，可以在这里填写思路、证明、复杂度或提示。 -->',
    '',
    '## 代码',
    '',
    '```cpp',
    '',
    '```'
  ].join('\n');
}

export function getSubmissionIssueUrl(problem: Problem): string | null {
  const repository = siteConfig.github.repository.trim();
  if (!repository) {
    return null;
  }

  const url = new URL(`https://github.com/${repository}/issues/new`);
  url.searchParams.set('template', siteConfig.github.submissionIssueTemplate);
  url.searchParams.set('title', getSubmissionIssueTitle(problem));
  url.searchParams.set('body', getSubmissionIssueBody(problem));
  if (siteConfig.github.submissionLabels.length > 0) {
    url.searchParams.set('labels', siteConfig.github.submissionLabels.join(','));
  }
  return url.toString();
}
