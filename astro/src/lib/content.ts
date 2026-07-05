import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';

export type Difficulty = 'easy' | 'mid' | 'hard' | string;

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  submit?: string;
  std?: string;
  html: string;
  raw: string;
  solutionHtml?: string;
  solutionRaw?: string;
  dates: string[];
  submissions: Submission[];
}

export interface Submission {
  id: string;
  user: string;
  problemId: string;
  problemTitle: string;
  date: string | null;
  difficulty: Difficulty;
  tags: string[];
  record?: string;
  displayAsSolution: boolean;
  html: string;
  raw: string;
}

export interface DailyEntry {
  date: string;
  problems: string[];
}

export interface UserProfile {
  user: string;
  html: string;
  raw: string;
  meta: Record<string, unknown>;
}

export interface UserSummary {
  user: string;
  profile?: UserProfile;
  totalSubmissions: number;
  totalTrainingDays: number;
  totalDisplaySolutions: number;
  currentStreak: number;
  longestStreak: number;
  dateCounts: Record<string, number>;
  byDifficulty: Record<string, number>;
  byTag: Record<string, number>;
  submissions: Submission[];
}

export interface SiteData {
  stats: {
    problemCount: number;
    dailyCount: number;
    userCount: number;
    submissionCount: number;
    displaySolutionCount: number;
  };
  latestDate: string;
  scheduledDates: string[];
  problems: Problem[];
  dailyEntries: DailyEntry[];
  userProfiles: UserProfile[];
  userSummaries: UserSummary[];
  submissions: Submission[];
}

const dataDir = fileURLToPath(new URL('../../../data/', import.meta.url));

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, language) {
    const normalized = normalizeLanguage(language);
    const grammar = normalized ? Prism.languages[normalized] : undefined;
    const highlighted = grammar
      ? Prism.highlight(code, grammar, normalized)
      : escapeHtml(code);

    const className = normalized ? ` class="language-${normalized}"` : '';
    return `<pre class="code-block"><code${className}>${highlighted}</code></pre>`;
  }
}).use(markdownItKatex);

let cache: SiteData | undefined;

export function getSiteData(): SiteData {
  if (!cache) {
    cache = buildSiteData();
  }
  return cache;
}

export function difficultyLabel(difficulty: Difficulty): string {
  const labels: Record<string, string> = {
    easy: 'Easy',
    mid: 'Mid',
    hard: 'Hard'
  };
  return labels[String(difficulty)] ?? String(difficulty);
}

export function difficultyClass(difficulty: Difficulty): string {
  const normalized = String(difficulty).toLowerCase();
  if (normalized === 'easy' || normalized === 'mid' || normalized === 'hard') {
    return normalized;
  }
  return 'other';
}

export function formatDate(date: string | null): string {
  return date ?? '未归档';
}

function buildSiteData(): SiteData {
  const dailyEntries = readDailyEntries();
  const scheduledDates = dailyEntries.map((entry) => entry.date);
  const problemDateMap = buildProblemDateMap(dailyEntries);
  const userProfiles = readUserProfiles();
  const problems = readProblems(problemDateMap);
  const submissions = problems.flatMap((problem) => problem.submissions);
  const userSummaries = buildUserSummaries(submissions, userProfiles, scheduledDates);
  const latestDate =
    scheduledDates.at(-1) ??
    submissions
      .map((submission) => submission.date)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ??
    new Date().toISOString().slice(0, 10);

  return {
    stats: {
      problemCount: problems.length,
      dailyCount: dailyEntries.length,
      userCount: userSummaries.length,
      submissionCount: submissions.length,
      displaySolutionCount: submissions.filter((submission) => submission.displayAsSolution).length
    },
    latestDate,
    scheduledDates,
    problems,
    dailyEntries,
    userProfiles,
    userSummaries,
    submissions
  };
}

function readDailyEntries(): DailyEntry[] {
  const dailyDir = path.join(dataDir, 'daily');
  return listFiles(dailyDir, '.md')
    .map((filename) => {
      const problems = readDailyProblems(path.join(dailyDir, filename));
      return {
        date: path.basename(filename, '.md'),
        problems
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function readUserProfiles(): UserProfile[] {
  const usersDir = path.join(dataDir, 'users');
  return listFiles(usersDir, '.md')
    .map((filename) => {
      const parsed = parseMarkdown(path.join(usersDir, filename));
      return {
        user: path.basename(filename, '.md'),
        html: parsed.html,
        raw: parsed.raw,
        meta: parsed.meta
      };
    })
    .sort((a, b) => a.user.localeCompare(b.user));
}

function readProblems(problemDateMap: Map<string, string[]>): Problem[] {
  const problemsDir = path.join(dataDir, 'problems');
  return listDirs(problemsDir)
    .map((id) => {
      const problemDir = path.join(problemsDir, id);
      const problemFile = path.join(problemDir, 'problem.md');
      const problemMarkdown = parseMarkdown(problemFile);
      const solutionFile = path.join(problemDir, 'solution.md');
      const solutionMarkdown = fs.existsSync(solutionFile) ? parseMarkdown(solutionFile) : null;
      const title = extractTitle(problemMarkdown.raw) || id;
      const difficulty = String(problemMarkdown.meta.difficulty ?? 'unknown');
      const tags = toStringArray(problemMarkdown.meta.tags);
      const dates = problemDateMap.get(id) ?? [];

      const problem: Problem = {
        id,
        title,
        difficulty,
        tags,
        submit: toOptionalString(problemMarkdown.meta.submit),
        std: toOptionalString(problemMarkdown.meta.std),
        html: problemMarkdown.html,
        raw: problemMarkdown.raw,
        solutionHtml: solutionMarkdown?.html,
        solutionRaw: solutionMarkdown?.raw,
        dates,
        submissions: []
      };

      problem.submissions = readSubmissions(problemDir, problem, dates);
      return problem;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function readSubmissions(problemDir: string, problem: Problem, problemDates: string[]): Submission[] {
  const submissionsDir = path.join(problemDir, 'submissions');
  return listFiles(submissionsDir, '.md')
    .map((filename) => {
      const parsed = parseMarkdown(path.join(submissionsDir, filename));
      const user = path.basename(filename, '.md');
      const explicitDate = toDateString(parsed.meta.date);
      const date = explicitDate ?? problemDates[0] ?? null;

      return {
        id: `${problem.id}:${user}`,
        user,
        problemId: problem.id,
        problemTitle: problem.title,
        date,
        difficulty: problem.difficulty,
        tags: problem.tags,
        record: toOptionalString(parsed.meta.record),
        displayAsSolution: toBoolean(parsed.meta.solution),
        html: parsed.html,
        raw: parsed.raw
      };
    })
    .sort((a, b) => a.user.localeCompare(b.user));
}

function buildProblemDateMap(dailyEntries: DailyEntry[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entry of dailyEntries) {
    for (const problemId of entry.problems) {
      const dates = map.get(problemId) ?? [];
      dates.push(entry.date);
      map.set(problemId, dates);
    }
  }
  return map;
}

function buildUserSummaries(
  submissions: Submission[],
  userProfiles: UserProfile[],
  scheduledDates: string[]
): UserSummary[] {
  const profileMap = new Map(userProfiles.map((profile) => [profile.user, profile]));
  const users = new Map<string, Submission[]>();

  for (const submission of submissions) {
    const list = users.get(submission.user) ?? [];
    list.push(submission);
    users.set(submission.user, list);
  }

  for (const profile of userProfiles) {
    if (!users.has(profile.user)) {
      users.set(profile.user, []);
    }
  }

  return [...users.entries()]
    .map(([user, userSubmissions]) => {
      const sortedSubmissions = [...userSubmissions].sort(compareSubmission);
      const dateCounts = countByDate(sortedSubmissions);
      const schedule = scheduledDates.length > 0 ? scheduledDates : Object.keys(dateCounts).sort();
      const streaks = calculateStreaks(dateCounts, schedule);

      return {
        user,
        profile: profileMap.get(user),
        totalSubmissions: sortedSubmissions.length,
        totalTrainingDays: Object.keys(dateCounts).length,
        totalDisplaySolutions: sortedSubmissions.filter((submission) => submission.displayAsSolution).length,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        dateCounts,
        byDifficulty: countBy(sortedSubmissions, (submission) => String(submission.difficulty)),
        byTag: countMany(sortedSubmissions, (submission) => submission.tags),
        submissions: sortedSubmissions
      };
    })
    .sort((a, b) => {
      return (
        b.currentStreak - a.currentStreak ||
        b.longestStreak - a.longestStreak ||
        b.totalTrainingDays - a.totalTrainingDays ||
        b.totalSubmissions - a.totalSubmissions ||
        a.user.localeCompare(b.user)
      );
    });
}

function parseMarkdown(filePath: string): { meta: Record<string, unknown>; raw: string; html: string } {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(source);
  return {
    meta: parsed.data,
    raw: parsed.content.trim(),
    html: md.render(parsed.content)
  };
}

function readDailyProblems(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const looseProblems = extractProblemList(frontmatter);
  if (looseProblems.length > 0) {
    return looseProblems;
  }

  const parsed = matter(source);
  return toStringArray(parsed.data.problems).map(normalizeProblemRef).filter(Boolean);
}

function extractProblemList(frontmatter: string): string[] {
  const problems: string[] = [];
  let inProblems = false;

  for (const line of frontmatter.split(/\r?\n/)) {
    if (/^\s*problems\s*:/.test(line)) {
      inProblems = true;
      const inline = line.split(':').slice(1).join(':').trim();
      if (inline.startsWith('[') && inline.endsWith(']')) {
        problems.push(
          ...inline
            .slice(1, -1)
            .split(',')
            .map((item) => normalizeProblemRef(item.trim()))
            .filter(Boolean)
        );
      }
      continue;
    }

    if (!inProblems) {
      continue;
    }

    const item = line.match(/^\s*-\s*(.+?)\s*$/)?.[1];
    if (item) {
      const normalized = normalizeProblemRef(item);
      if (normalized) {
        problems.push(normalized);
      }
      continue;
    }

    if (/^\S/.test(line)) {
      inProblems = false;
    }
  }

  return problems;
}

function countByDate(submissions: Submission[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const submission of submissions) {
    if (!submission.date) {
      continue;
    }
    counts[submission.date] = (counts[submission.date] ?? 0) + 1;
  }
  return counts;
}

function calculateStreaks(dateCounts: Record<string, number>, schedule: string[]): { current: number; longest: number } {
  let longest = 0;
  let run = 0;

  for (const date of schedule) {
    if ((dateCounts[date] ?? 0) > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = schedule.length - 1; i >= 0; i -= 1) {
    if ((dateCounts[schedule[i]] ?? 0) > 0) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

function countBy<T>(items: T[], getKey: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return sortRecord(counts);
}

function countMany<T>(items: T[], getKeys: (item: T) => string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const key of getKeys(item)) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return sortRecord(counts);
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
}

function compareSubmission(a: Submission, b: Submission): number {
  return (
    String(b.date ?? '').localeCompare(String(a.date ?? '')) ||
    a.problemId.localeCompare(b.problemId) ||
    a.user.localeCompare(b.user)
  );
}

function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listFiles(dir: string, extension: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => entry.name)
    .sort();
}

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (!match) {
    return null;
  }
  return match[1]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`/g, '')
    .trim();
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeProblemRef(value: string): string {
  const trimmed = value.replace(/^['"]|['"]$/g, '').trim();
  const markdownLink = trimmed.match(/^\[([^\]]+)\]\([^)]+\)$/);
  if (markdownLink) {
    return markdownLink[1].trim();
  }
  return trimmed;
}

function normalizeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  const aliases: Record<string, string> = {
    cxx: 'cpp',
    'c++': 'cpp',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    js: 'javascript',
    ts: 'typescript'
  };
  return aliases[normalized] ?? normalized;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toDateString(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return null;
}
