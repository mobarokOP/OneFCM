/**
 * Loader + minimal typings for Google Identity Services (GIS).
 * Only the surface used by <GoogleButton /> is declared here.
 */

export interface GoogleCredentialResponse {
  credential?: string
}

export interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  width?: number
  logo_alignment?: 'left' | 'center'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
}

export interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId
      }
    }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'

let loader: Promise<GoogleAccountsId> | null = null

/** Injects the GIS script once and resolves with window.google.accounts.id. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (loader) return loader
  loader = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existing = window.google?.accounts?.id
    if (existing) {
      resolve(existing)
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      const id = window.google?.accounts?.id
      if (id) resolve(id)
      else reject(new Error('Google Identity Services loaded but is unavailable'))
    }
    script.onerror = () => {
      loader = null // allow a retry on the next call
      reject(new Error('Failed to load Google Identity Services'))
    }
    document.head.appendChild(script)
  })
  return loader
}
