# Training Site

Astro static site for the training data in `../data`.

## Commands

```bash
npm install
npm run dev
npm run build
```

The static build is written to `astro/dist`.

## Data flow

The site reads:

- `../data/daily/*.md`
- `../data/problems/*/problem.md`
- `../data/problems/*/solution.md` if present
- `../data/problems/*/submissions/*.md`
- `../data/users/*.md`

Submissions are assigned to dates by explicit `date` frontmatter first. If a submission has no date, the site infers it from `data/daily/*.md` by matching the problem id.
