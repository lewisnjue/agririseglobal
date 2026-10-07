export default function EditorJsRenderer({ content, className = '' }) {
  const document = parseDocument(content);
  if (!document.blocks.length) {
    return <p className="text-slate-400 italic">No content yet.</p>;
  }

  return (
    <div className={`editorjs-renderer prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 ${className}`}>
      {document.blocks.map((block, index) => (
        <Block key={block.id || `${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}

function parseDocument(content) {
  if (content && typeof content === 'object' && Array.isArray(content.blocks)) return content;
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.blocks)) return parsed;
    } catch {
      if (content.trim()) return { blocks: [{ type: 'raw', data: { html: content } }] };
    }
  }
  return { blocks: [] };
}

function InlineHtml({ html = '' }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function plainText(html = '') {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent.trim();
}

function List({ items = [], style }) {
  const Tag = style === 'ordered' ? 'ol' : 'ul';
  const checklist = style === 'checklist';

  return (
    <Tag className={checklist ? 'list-none pl-0' : undefined}>
      {items.map((item, index) => (
        <li key={`${index}-${itemText(item)}`} className="editorjs-preserve-whitespace">
          {checklist && (
            <input
              type="checkbox"
              className="mr-2 align-middle"
              checked={Boolean(item?.meta?.checked ?? item?.checked)}
              readOnly
            />
          )}
          <InlineHtml html={itemText(item)} />
          {Array.isArray(item?.items) && item.items.length > 0 && <List items={item.items} style={style} />}
        </li>
      ))}
    </Tag>
  );
}

function Block({ block }) {
  const data = block.data || {};
  switch (block.type) {
    case 'header': {
      const Tag = `h${Math.min(Math.max(Number(data.level) || 2, 2), 4)}`;
      return <Tag className="editorjs-preserve-whitespace"><InlineHtml html={data.text} /></Tag>;
    }
    case 'paragraph': {
      const text = data.text || '';
      const blank = !text.replace(/<br\s*\/?>|&nbsp;|\s/gi, '');
      return <p className="editorjs-preserve-whitespace">{blank ? <br /> : <InlineHtml html={text} />}</p>;
    }
    case 'list':
      return <List items={data.items || []} style={data.style} />;
    case 'checklist':
      return <List items={data.items || []} style="checklist" />;
    case 'quote':
      return (
        <blockquote style={data.alignment ? { textAlign: data.alignment } : undefined}>
          <p className="editorjs-preserve-whitespace"><InlineHtml html={data.text} /></p>
          {data.caption && <cite className="editorjs-preserve-whitespace"><InlineHtml html={data.caption} /></cite>}
        </blockquote>
      );
    case 'warning':
      return <aside className="editorjs-warning"><strong className="editorjs-preserve-whitespace"><InlineHtml html={data.title} /></strong><p className="editorjs-preserve-whitespace"><InlineHtml html={data.message} /></p></aside>;
    case 'delimiter':
      return <hr className="editorjs-delimiter" />;
    case 'code':
      return <pre className="editorjs-preserve-whitespace"><code>{data.code || ''}</code></pre>;
    case 'table':
      return <Table data={data} />;
    case 'image':
      return (
        <figure className={imageClassName(data, block.tunes)}>
          <img src={data.file?.url} alt={plainText(data.caption)} />
          {data.caption && <figcaption><InlineHtml html={data.caption} /></figcaption>}
        </figure>
      );
    case 'embed':
      return data.embed ? <div className="editorjs-embed"><iframe src={data.embed} title={data.caption || 'Embedded media'} allowFullScreen /></div> : null;
    case 'raw':
      return <div dangerouslySetInnerHTML={{ __html: data.html || '' }} />;
    default:
      return null;
  }
}

function imageClassName(data, tunes = {}) {
  const layout = tunes.imageLayout || data.imageLayout || data.tunes?.imageLayout || {};
  const classes = [
    `editorjs-image-align-${layout.alignment || 'center'}`,
    `editorjs-image-size-${layout.width || (data.stretched ? 'full' : 'medium')}`,
  ];

  if (data.withBorder) classes.push('editorjs-image-with-border');
  if (data.withBackground) classes.push('editorjs-image-with-background');
  return classes.join(' ');
}

function itemText(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') return item.content || item.text || '';
  return '';
}

function Table({ data }) {
  const rows = data.content || [];
  const hasHeadings = Boolean(data.withHeadings) && rows.length > 0;
  const bodyRows = hasHeadings ? rows.slice(1) : rows;

  return (
    <div className="editorjs-table-wrap">
      <table>
        {hasHeadings && (
          <thead>
            <tr>
              {rows[0].map((cell, cellIndex) => (
                <th key={`head-${cellIndex}`} className="editorjs-preserve-whitespace"><InlineHtml html={cell} /></th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex} className="editorjs-preserve-whitespace"><InlineHtml html={cell} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
