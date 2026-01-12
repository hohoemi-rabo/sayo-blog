import { Node, mergeAttributes } from '@tiptap/core'

export interface FigureOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      /**
       * Add a figure with image and caption
       */
      setFigure: (options: { src: string; alt?: string; caption?: string }) => ReturnType
      /**
       * Update figure caption
       */
      updateFigureCaption: (caption: string) => ReturnType
    }
  }
}

export const FigureExtension = Node.create<FigureOptions>({
  name: 'figure',

  group: 'block',

  content: 'inline*',

  draggable: true,

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (dom) => {
          const element = dom as HTMLElement
          const img = element.querySelector('img')
          return {
            src: img?.getAttribute('src'),
            alt: img?.getAttribute('alt') || '',
          }
        },
        contentElement: 'figcaption',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, { class: 'editor-figure' }),
      [
        'img',
        mergeAttributes(HTMLAttributes, {
          src: node.attrs.src,
          alt: node.attrs.alt,
          class: 'editor-figure-image',
        }),
      ],
      ['figcaption', { class: 'editor-figure-caption' }, 0],
    ]
  },

  addCommands() {
    return {
      setFigure:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt || '',
            },
            content: options.caption
              ? [{ type: 'text', text: options.caption }]
              : [],
          })
        },
      updateFigureCaption:
        (caption) =>
        ({ commands, state }) => {
          const { selection } = state
          const node = selection.$anchor.parent
          if (node.type.name !== this.name) return false
          return commands.insertContent(caption)
        },
    }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('figure')
      dom.classList.add('editor-figure')

      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.classList.add('editor-figure-image')

      const figcaption = document.createElement('figcaption')
      figcaption.classList.add('editor-figure-caption')
      figcaption.setAttribute('data-placeholder', 'キャプションを入力...')

      dom.appendChild(img)
      dom.appendChild(figcaption)

      return {
        dom,
        contentDOM: figcaption,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false
          img.src = updatedNode.attrs.src
          img.alt = updatedNode.attrs.alt || ''
          return true
        },
      }
    }
  },
})
