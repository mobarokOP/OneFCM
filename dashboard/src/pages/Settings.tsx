import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun, Monitor } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { initials, cn } from '@/lib/utils'

export default function SettingsPage() {
  const { user, setUser, clear } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me })
  useEffect(() => {
    if (me.data) setUser(me.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data])

  const { register, handleSubmit, reset } = useForm<{ name: string; email: string }>({
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  })
  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email })
  }, [user, reset])

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    clear()
    navigate('/login')
  }

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
  ]

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
                {initials(user?.name)}
              </span>
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <form
              id="profile-form"
              onSubmit={handleSubmit(() => toast.success('Profile preferences saved locally'))}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" {...register('name')} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
            </form>
          </CardContent>
          <CardFooter className="justify-end">
            <Button form="profile-form" type="submit">
              Save changes
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how OpenFCM looks to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors',
                    theme === opt.value ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <opt.icon className="h-4 w-4" /> {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" /> Defaults to your system preference on first visit.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Sign out of the dashboard on this device.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="danger" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
