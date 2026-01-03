import { Node, mergeAttributes } from '@tiptap/core'

export interface BoxOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    box: {
      /**
       * Set a box node
       */
      setBox: () => ReturnType
      /**
       * Toggle a box node
       */
      toggleBox: () => ReturnType
      /**
       * Unset a box node
       */
      unsetBox: () => ReturnType
    }
  }
}

export const BoxExtension = Node.create<BoxOptions>({
  name: 'box',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  content: 'block+',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="box"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'box',
        class: 'editor-box',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setBox:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name)
        },
      toggleBox:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name)
        },
      unsetBox:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },
    }
  },
})
