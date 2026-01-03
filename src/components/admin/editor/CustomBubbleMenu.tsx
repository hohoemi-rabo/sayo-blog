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

interface CustomBubbleMenuProps {
  editor: Editor
  children: React.ReactNode
}

export function CustomBubbleMenu({ editor, children }: CustomBubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Virtual element for selection position
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  })

  // Update visibility and position based on selection
  const updateMenu = useCallback(() => {
    if (!editor) return

    const { selection } = editor.state
    const { empty } = selection

    // Hide if no selection or selection is empty
    if (empty) {
      setIsVisible(false)
      return
    }

    // Get selection coordinates
    const { from, to } = selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)

    // Create virtual reference element based on selection
    const virtualEl = {
      getBoundingClientRect() {
        return {
          x: start.left,
          y: start.top,
          top: start.top,
          left: start.left,
          bottom: end.bottom,
          right: end.right,
          width: end.right - start.left,
          height: end.bottom - start.top,
        }
      },
    }

    refs.setReference(virtualEl)
    setIsVisible(true)
  }, [editor, refs])

  // Listen to editor selection changes
  useEffect(() => {
    if (!editor) return

    editor.on('selectionUpdate', updateMenu)
    editor.on('transaction', updateMenu)

    return () => {
      editor.off('selectionUpdate', updateMenu)
      editor.off('transaction', updateMenu)
    }
  }, [editor, updateMenu])

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isVisible) return null

  // Render via Portal to escape stacking context
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
