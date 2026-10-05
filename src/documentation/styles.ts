/** 仅补充文档工具的系统滚动、键盘焦点和长正文样式，不替换 Swagger UI 组件。 */
export const EXPLORER_CSS = `
:root { --docs-scrollbar-thumb: #9aa2ad; --docs-scrollbar-track: #f3f4f6; --docs-scrollbar-hover: #6b7280; --docs-focus: #2563eb; }
html { scrollbar-gutter: stable; }
* { scrollbar-color: var(--docs-scrollbar-thumb) var(--docs-scrollbar-track); }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--docs-scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--docs-scrollbar-thumb); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--docs-scrollbar-hover); }
.swagger-ui :focus-visible { outline: 2px solid var(--docs-focus); outline-offset: 2px; }
.swagger-ui textarea { resize: none; }
.swagger-ui .opblock-summary-path { min-width: 0; overflow-wrap: anywhere; }
@media (forced-colors: active) { * { scrollbar-color: auto; } }
@media (prefers-reduced-motion: reduce) { .swagger-ui * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
`;
