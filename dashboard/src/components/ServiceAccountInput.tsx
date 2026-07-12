import { useRef } from 'react'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export interface ParsedServiceAccount {
  ok: boolean
  /** Parsed JSON object when ok */
  data?: Record<string, unknown>
  /** project_id detected in the JSON */
  projectId?: string
  /** Human-readable validation error when not ok */
  error?: string
}

/**
 * Validates raw service-account JSON text. Empty input returns { ok: false }
 * with no error (nothing to validate yet).
 */
export function parseServiceAccount(raw: string): ParsedServiceAccount {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false }

  let obj: unknown
  try {
    obj = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: 'Not valid JSON. Paste the full contents of the downloaded key file.' }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { ok: false, error: 'Expected a JSON object with service-account fields.' }
  }

  const data = obj as Record<string, unknown>
  const missing = ['client_email', 'private_key', 'project_id'].filter(
    (k) => typeof data[k] !== 'string' || !(data[k] as string).trim(),
  )
  if (missing.length > 0) {
    return { ok: false, error: `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. This does not look like a service-account key.` }
  }

  return { ok: true, data, projectId: data.project_id as string }
}

interface ServiceAccountInputProps {
  value: string
  onChange: (raw: string) => void
  id?: string
  disabled?: boolean
  className?: string
}

/**
 * File upload + paste input for a Firebase service-account JSON key.
 * Shows the detected project_id when the JSON is valid, or a validation error.
 */
export function ServiceAccountInput({ value, onChange, id = 'fcm_service_account', disabled, className }: ServiceAccountInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const parsed = parseServiceAccount(value)
  const hasInput = value.trim().length > 0

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsText(file)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload service account JSON
        </Button>
        <span className="text-xs text-muted-foreground">or paste it below</span>
      </div>

      <Textarea
        id={id}
        rows={6}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder='{ "type": "service_account", "project_id": "...", "client_email": "...", "private_key": "..." }'
        className="font-mono text-xs"
      />

      {hasInput && parsed.ok && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Valid key detected for project <span className="font-mono font-medium">{parsed.projectId}</span>
        </p>
      )}
      {hasInput && !parsed.ok && parsed.error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {parsed.error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Firebase Console → Project settings → Service accounts → Generate new private key. Stored encrypted server-side; everything else is derived automatically.
      </p>
    </div>
  )
}
