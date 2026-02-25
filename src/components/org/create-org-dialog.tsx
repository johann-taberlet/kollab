'use client'

import { useState, type ReactNode } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganization } from '@/app/(app)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface CreateOrgDialogProps {
  trigger?: ReactNode
}

export function CreateOrgDialog({ trigger }: CreateOrgDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  const [state, formAction, pending] = useActionState(
    async (_prevState: { error?: string } | null, formData: FormData) => {
      const result = await createOrganization(formData)
      if ('slug' in result) {
        setOpen(false)
        router.push(`/${result.slug}`)
        router.refresh()
        return null
      }
      return result
    },
    null
  )

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true)
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      // Reset form state when dialog closes
      setName('')
      setSlug('')
      setSlugEdited(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Plus className="size-4" />
            Create organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Set up a new workspace for your team to collaborate on projects.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dialog-org-name">Organization name</Label>
            <Input
              id="dialog-org-name"
              name="name"
              placeholder="Acme Inc."
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialog-org-slug">URL slug</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>kollab.app/</span>
              <Input
                id="dialog-org-slug"
                name="slug"
                placeholder="acme-inc"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                className="flex-1"
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Create organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
