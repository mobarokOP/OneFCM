import { useEffect, useRef } from 'react'
import { useTheme } from '@/store/theme'
import { loadGoogleIdentity } from '@/lib/googleIdentity'

interface GoogleButtonProps {
  onCredential: (credential: string) => void
  text?: 'signin_with' | 'continue_with'
  disabled?: boolean
}

/**
 * Renders the official Google Identity Services button.
 * Hidden entirely until VITE_GOOGLE_CLIENT_ID is configured.
 */
export function GoogleButton({ onCredential, text, disabled }: GoogleButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const theme = useTheme((s) => s.theme)
  const containerRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    loadGoogleIdentity()
      .then((id) => {
        const container = containerRef.current
        if (cancelled || !container) return
        id.initialize({
          client_id: clientId,
          callback: (resp) => {
            if (resp.credential) onCredentialRef.current(resp.credential)
          },
        })
        container.innerHTML = ''
        id.renderButton(container, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: text ?? 'continue_with',
          width: container.offsetWidth || 384,
          logo_alignment: 'left',
          shape: 'rectangular',
        })
      })
      .catch(() => {
        // GIS blocked or offline — leave the container empty.
      })
    return () => {
      cancelled = true
    }
  }, [clientId, theme, text])

  if (!clientId) return null

  return <div ref={containerRef} className={disabled ? 'pointer-events-none opacity-50' : undefined} />
}
