'use client'

import { useState, useEffect, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { upsertCustomFieldValue } from '@/lib/actions/custom-field'
import { createClient } from '@/utils/supabase/client'
import type { CustomField } from '@/lib/types'

interface FieldValue {
  field_id: string
  value: string | null
}

interface TaskCustomFieldsProps {
  taskId: string
  projectId: string
}

export function TaskCustomFields({ taskId, projectId }: TaskCustomFieldsProps) {
  const [fields, setFields] = useState<CustomField[]>([])
  const [values, setValues] = useState<Record<string, string | null>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()

    async function fetchFieldsAndValues() {
      const [fieldsRes, valuesRes] = await Promise.all([
        supabase
          .from('custom_fields')
          .select('*')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('custom_field_values')
          .select('field_id, value')
          .eq('task_id', taskId),
      ])

      if (fieldsRes.data) setFields(fieldsRes.data)
      if (valuesRes.data) {
        const valueMap: Record<string, string | null> = {}
        for (const v of valuesRes.data as FieldValue[]) {
          valueMap[v.field_id] = v.value
        }
        setValues(valueMap)
      }
    }

    fetchFieldsAndValues()
  }, [taskId, projectId])

  const handleSave = (fieldId: string, value: string | null) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    startTransition(async () => {
      await upsertCustomFieldValue(taskId, fieldId, value)
    })
  }

  if (fields.length === 0) return null

  return (
    <>
      {fields.map((field) => (
        <div key={field.id} className="flex min-h-8 items-center">
          <span className="w-28 shrink-0 text-xs text-muted-foreground">
            {field.name}
          </span>
          {field.type === 'text' ? (
            <TextFieldInput
              value={values[field.id] ?? ''}
              onSave={(val) => handleSave(field.id, val || null)}
            />
          ) : field.type === 'select' ? (
            <SelectFieldInput
              value={values[field.id] ?? ''}
              options={
                Array.isArray(field.options)
                  ? (field.options as string[])
                  : []
              }
              onSave={(val) => handleSave(field.id, val || null)}
            />
          ) : null}
        </div>
      ))}
    </>
  )
}

function TextFieldInput({
  value,
  onSave,
}: {
  value: string
  onSave: (val: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) onSave(localValue)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      className="h-7 text-xs"
    />
  )
}

function SelectFieldInput({
  value,
  options,
  onSave,
}: {
  value: string
  options: string[]
  onSave: (val: string) => void
}) {
  return (
    <Select value={value} onValueChange={onSave}>
      <SelectTrigger size="sm" className="h-7 text-xs">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
