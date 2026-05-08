import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

type LinkRenderer = NonNullable<typeof markdown.renderer.rules.link_open>;

const defaultLinkRenderer: LinkRenderer =
  markdown.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = ((tokens, index, options, env, self) => {
  const token = tokens[index];
  token.attrSet('target', '_blank');
  token.attrSet('rel', 'noopener noreferrer');
  return defaultLinkRenderer(tokens, index, options, env, self);
}) as LinkRenderer;

export function renderMarkdown(source: string): string {
  return markdown.render(source);
}
