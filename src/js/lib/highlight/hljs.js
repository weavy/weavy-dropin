import hljs from 'highlight.js/lib/core';

/*
 * 10 most popular programming languages from GitHub and StackOverflow combined
 *
 * - Javascript
 * - Java
 * - CSS
 * - Python
 * - SQL
 * - PHP
 * - Ruby
 * - Shell
 * - C#
 * - C++
 * - C
 * - Typescript
 *
 * 
 * Also popular:
 * 
 * - Rust
 * - Kotlin
 * - Go
 * - Swift
 * - Objective-C
 * - R
 *
 * Also relevant:
 * 
 * - XML
 * - HTML
 * - Razor
 * - JSX
 * - Markdown
 */


import langXml from 'highlight.js/lib/languages/xml';
import langC from 'highlight.js/lib/languages/c';
import langCpp from 'highlight.js/lib/languages/cpp';
import langCsharp from 'highlight.js/lib/languages/csharp';
import langCss from 'highlight.js/lib/languages/css';
import langMarkdown from 'highlight.js/lib/languages/markdown';
import langRuby from 'highlight.js/lib/languages/ruby';
import langJava from 'highlight.js/lib/languages/java';
import langJavascript from 'highlight.js/lib/languages/javascript';
import langJson from 'highlight.js/lib/languages/json';
import langPhp from 'highlight.js/lib/languages/php';
import langPlaintext from 'highlight.js/lib/languages/plaintext';
import langPython from 'highlight.js/lib/languages/python';
import langScss from 'highlight.js/lib/languages/scss';
//import langShell from 'highlight.js/lib/languages/shell';
import langSql from 'highlight.js/lib/languages/sql';
import langTypescript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('xml', langXml);
//hljs.registerLanguage('bash', require('./languages/bash'));
hljs.registerLanguage('c', langC);
hljs.registerLanguage('cpp', langCpp);
hljs.registerLanguage('csharp', langCsharp);
hljs.registerLanguage('css', langCss);
hljs.registerLanguage('markdown', langMarkdown);
//hljs.registerLanguage('diff', require('./languages/diff'));
hljs.registerLanguage('ruby', langRuby);
//hljs.registerLanguage('go', require('./languages/go'));
//hljs.registerLanguage('ini', require('./languages/ini'));
hljs.registerLanguage('java', langJava);
hljs.registerLanguage('javascript', langJavascript);
hljs.registerLanguage('json', langJson);
//hljs.registerLanguage('kotlin', require('./languages/kotlin'));
//hljs.registerLanguage('less', require('./languages/less'));
//hljs.registerLanguage('lua', require('./languages/lua'));
//hljs.registerLanguage('makefile', require('./languages/makefile'));
//hljs.registerLanguage('perl', require('./languages/perl'));
//hljs.registerLanguage('objectivec', require('./languages/objectivec'));
hljs.registerLanguage('php', langPhp);
//hljs.registerLanguage('php-template', require('./languages/php-template'));
hljs.registerLanguage('plaintext', langPlaintext);
hljs.registerLanguage('python', langPython);
//hljs.registerLanguage('python-repl', require('./languages/python-repl'));
//hljs.registerLanguage('r', require('./languages/r'));
//hljs.registerLanguage('rust', require('./languages/rust'));
hljs.registerLanguage('scss', langScss);
//hljs.registerLanguage('shell', langShell);
hljs.registerLanguage('sql', langSql);
//hljs.registerLanguage('swift', require('./languages/swift'));
//hljs.registerLanguage('yaml', require('./languages/yaml'));
hljs.registerLanguage('typescript', langTypescript);
//hljs.registerLanguage('vbnet', require('./languages/vbnet'));

export default hljs;
