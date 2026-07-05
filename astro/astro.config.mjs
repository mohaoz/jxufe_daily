import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mohaoz.github.io',
  base: '/jxufe_daily',
  output: 'static',
  srcDir: './src',
  publicDir: './public',
  outDir: './dist'
});
