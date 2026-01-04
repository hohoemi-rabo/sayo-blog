'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/react'
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react-dom'

interface CustomFloatingMenuProps {
  editor: Editor
  children: React.ReactNode
}

export function CustomFloatingMenu({ editor, children }: CustomFloatingMenuProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { refs, floatingStyles } = useFloating({
    placement: 'left-start',
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  })

  // Check if cursor is on an empty line or at the start of a block
  const updateMenu = useCallback(() => {
    if (!editor) return

    const { selection } = editor.state
    const { $anchor, empty } = selection

    // Only show when selection is empty (just cursor, no selection)
    if (!empty) {
      setIsVisible(false)
      return
    }

    // Check if current block is empty
    const isEmptyBlock = $anchor.parent.content.size === 0

    // Check if cursor is at the start of the block
    const isAtStart = $anchor.parentOffset === 0

    // Show menu only on empty blocks or at start of block
    if (!isEmptyBlock && !isAtStart) {
      setIsVisible(false)
      return
    }

    // Get cursor position
    const coords = editor.view.coordsAtPos(selection.from)

    const virtualEl = {
      getBoundingClientRect() {
        return {
          x: coords.left,
          y: coords.top,
          top: coords.top,
          left: coords.left,
          bottom: coords.bottom,
          right: coords.left,
          width: 0,
          height: coords.bottom - coords.top,
        }
      },
    }

    refs.setReference(virtualEl)
    setIsVisible(true)
  }, [editor, refs])

  useEffect(() => {
    if (!editor) return

    editor.on('selectionUpdate', updateMenu)
    editor.on('transaction', updateMenu)

    return () => {
      editor.off('selectionUpdate', updateMenu)
      editor.off('transaction', updateMenu)
    }
  }, [editor, updateMenu])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isVisible) return null

  return createPortal(
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 9999,
        backgroundColor: 'white',
      }}
      className="flex items-center gap-0.5 p-1 rounded-lg shadow-lg border border-border-decorative"
    >
      {children}
    </div>,
    document.body
  )
}
