'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface MentionItem {
  id: string
  full_name: string
  avatar_url: string | null
  email: string
}

interface MentionListProps {
  items: MentionItem[]
  command: (item: { id: string; label: string }) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) =>
            prev <= 0 ? items.length - 1 : prev - 1
          )
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) =>
            prev >= items.length - 1 ? 0 : prev + 1
          )
          return true
        }

        if (event.key === 'Enter') {
          const item = items[selectedIndex]
          if (item) {
            command({ id: item.id, label: item.full_name })
          }
          return true
        }

        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="bg-popover text-popover-foreground rounded-md border p-2 shadow-md">
          <span className="text-sm text-muted-foreground">No results</span>
        </div>
      )
    }

    return (
      <div className="bg-popover text-popover-foreground max-h-48 overflow-y-auto rounded-md border shadow-md">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm ${
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => command({ id: item.id, label: item.full_name })}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Avatar size="sm">
              {item.avatar_url && (
                <AvatarImage src={item.avatar_url} alt={item.full_name} />
              )}
              <AvatarFallback>{getInitials(item.full_name)}</AvatarFallback>
            </Avatar>
            <span>{item.full_name}</span>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
