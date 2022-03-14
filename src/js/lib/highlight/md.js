import hljs from 'highlight.js/lib/core';
import langMarkdown from 'highlight.js/lib/languages/markdown';

hljs.registerLanguage('markdown', langMarkdown);

export default hljs;
