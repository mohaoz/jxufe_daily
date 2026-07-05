/// <reference types="astro/client" />

declare module 'markdown-it-katex' {
  import type MarkdownIt from 'markdown-it';

  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'prismjs/components/prism-c';
declare module 'prismjs/components/prism-cpp';
declare module 'prismjs/components/prism-python';
declare module 'prismjs/components/prism-bash';
declare module 'prismjs/components/prism-javascript';
declare module 'prismjs/components/prism-typescript';
