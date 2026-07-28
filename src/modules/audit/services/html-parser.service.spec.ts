import { HtmlParserService } from './html-parser.service';

describe('HtmlParserService', () => {
  const service = new HtmlParserService();

  it('extracts title, description, content length, and HTTPS metadata', () => {
    const html =
      '<html><title>Page title</title><meta name="description" content="Summary"></html>';

    expect(service.parse(html, 'https://example.com')).toEqual({
      title: 'Page title',
      description: 'Summary',
      contentLength: html.length,
      https: true,
    });
  });

  it('returns safe metadata for empty HTML', () => {
    expect(service.parse('', 'http://example.com')).toEqual({
      title: null,
      description: null,
      contentLength: 0,
      https: false,
    });
  });
});
