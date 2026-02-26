'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, Trash2, FileIcon } from 'lucide-react'
import { createAttachment, deleteAttachment } from '@/lib/actions/attachment'
import { createClient } from '@/utils/supabase/client'
import type { Attachment } from '@/lib/types'

interface TaskAttachmentsProps {
  taskId: string
  projectId: string
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function TaskAttachments({ taskId, projectId }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<Attachment | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchAttachments() {
      const { data } = await supabase
        .from('attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (data) setAttachments(data)
    }

    fetchAttachments()
  }, [taskId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const supabase = createClient()

    for (const file of Array.from(files)) {
      const filePath = `${projectId}/${taskId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      const result = await createAttachment(
        taskId,
        file.name,
        filePath,
        file.size,
        file.type
      )

      if (result.attachmentId) {
        setAttachments((prev) => [
          {
            id: result.attachmentId!,
            task_id: taskId,
            comment_id: null,
            uploaded_by: '',
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirmDelete = () => {
    if (!deleting) return
    const attachment = deleting
    setDeleting(null)
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))

    startTransition(async () => {
      await deleteAttachment(attachment.id, attachment.file_path)
    })
  }

  const handleOpen = async (attachment: Attachment) => {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.file_path, 300)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Attachments{attachments.length > 0 && ` (${attachments.length})`}
        </span>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="ghost"
            size="xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="size-3" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-col gap-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <button
                className="flex min-w-0 flex-1 cursor-pointer flex-col text-left"
                onClick={() => handleOpen(attachment)}
              >
                <span className="truncate text-sm hover:underline">
                  {attachment.file_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setDeleting(attachment)}
              >
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete attachment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleting?.file_name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
