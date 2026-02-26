import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { type SuggestionOptions } from '@tiptap/suggestion'
import { MentionList, type MentionItem, type MentionListRef } from './mention-list'
import { createClient } from '@/utils/supabase/client'

/**
 * Creates a Tiptap Mention suggestion config for @mentions.
 * Fetches project members from Supabase, filtered by the query string.
 */
export function createMentionSuggestion(
  projectId: string
): Omit<SuggestionOptions<MentionItem>, 'editor'> {
  return {
    items: async ({ query }) => {
      const supabase = createClient()

      // Get the project's org_id, then fetch org members
      const { data: project } = await supabase
        .from('projects')
        .select('org_id')
        .eq('id', projectId)
        .single()

      if (!project) return []

      const { data: orgMembers } = await supabase
        .from('org_members')
        .select('user_id, profiles(id, full_name, avatar_url, email)')
        .eq('org_id', project.org_id)

      if (!orgMembers) return []

      const profiles = orgMembers
        .map((m) => m.profiles as unknown as MentionItem)
        .filter(Boolean)

      if (!query) return profiles.slice(0, 10)

      const lowerQuery = query.toLowerCase()
      return profiles
        .filter(
          (p) =>
            p.full_name.toLowerCase().includes(lowerQuery) ||
            p.email.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 10)
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null
      let popup: TippyInstance[] | null = null

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () =>
              document.querySelector('[data-slot="sheet-content"]') ?? document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate: (props) => {
          component?.updateProps(props)

          if (!props.clientRect) return

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit: () => {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
  }
}
