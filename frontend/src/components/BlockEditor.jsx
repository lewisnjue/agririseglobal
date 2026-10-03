import { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import ListTool from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import ImageTool from '@editorjs/image';
import Embed from '@editorjs/embed';
import Quote from '@editorjs/quote';
import TableTool from '@editorjs/table';
import CodeTool from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Warning from '@editorjs/warning';
import Checklist from '@editorjs/checklist';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import { uploadApi } from '../services/api';
import ImageLayoutTune from './ImageLayoutTune';

const EMPTY_DOCUMENT = { time: Date.now(), blocks: [], version: '2.31.0' };

function parseDocument(content) {
  if (!content) return EMPTY_DOCUMENT;
  if (typeof content === 'object' && Array.isArray(content.blocks)) return content;

  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.blocks)) return parsed;
  } catch {
    return {
      time: Date.now(),
      blocks: [{ type: 'raw', data: { html: content } }],
      version: '2.31.0',
    };
  }

  return EMPTY_DOCUMENT;
}

const imageUploader = {
  async uploadByFile(file) {
    try {
      const { url } = await uploadApi.image(file);
      return { success: 1, file: { url } };
    } catch (error) {
      return { success: 0, message: error.error || 'Image upload failed' };
    }
  },
  async uploadByUrl(url) {
    return { success: 1, file: { url } };
  },
};

export default function BlockEditor({ content, onChange, placeholder = 'Start writing your story...' }) {
  const holderRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const changeVersionRef = useRef(0);
  onChangeRef.current = onChange;

  useEffect(() => {
    const editor = new EditorJS({
      holder: holderRef.current,
      data: parseDocument(content),
      placeholder,
      autofocus: false,
      inlineToolbar: ['bold', 'italic', 'link', 'marker', 'inlineCode'],
      tools: {
        paragraph: { class: Paragraph, inlineToolbar: true, config: { preserveBlank: true } },
        header: {
          class: Header,
          inlineToolbar: true,
          config: { levels: [2, 3, 4], defaultLevel: 2 },
        },
        list: { class: ListTool, inlineToolbar: true },
        checklist: { class: Checklist, inlineToolbar: true },
        quote: { class: Quote, inlineToolbar: true },
        warning: Warning,
        delimiter: Delimiter,
        table: { class: TableTool, inlineToolbar: true },
        code: CodeTool,
        marker: Marker,
        inlineCode: InlineCode,
        embed: {
          class: Embed,
          config: { services: { youtube: true, vimeo: true, twitter: true, instagram: true } },
        },
        image: {
          class: ImageTool,
          tunes: ['imageLayout'],
          config: {
            uploader: imageUploader,
            captionPlaceholder: 'Add a caption or photo credit',
            buttonContent: 'Choose an image',
            features: {
              border: true,
              background: true,
              stretch: true,
            },
          },
        },
        imageLayout: ImageLayoutTune,
      },
      onChange: async () => {
        const changeVersion = ++changeVersionRef.current;
        const saved = await editor.save();
        if (changeVersion === changeVersionRef.current) onChangeRef.current?.(saved);
      },
    });

    editorRef.current = editor;
    return () => {
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
    // Editor.js owns this DOM node and is intentionally mounted once per form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="editorjs-shell">
      <div ref={holderRef} className="editorjs-holder" />
    </div>
  );
}
