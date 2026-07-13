import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/api/client'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input, Label, FieldError } from '@/components/ui/Input'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthShell } from './AuthShell'

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
})
type FormValues = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuth((s) => s.setAuth)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => authApi.register(v.name, v.email, v.password),
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      toast.success('Account created')
      navigate('/', { replace: true })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Registration failed')),
  })

  const googleMutation = useMutation({
    mutationFn: (credential: string) => authApi.google(credential),
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      toast.success('Signed in with Google')
      navigate('/', { replace: true })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Google sign-in failed')),
  })

  return (
    <AuthShell title="Create your account" subtitle="Start sending push notifications in minutes.">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Jane Doe" autoComplete="name" {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" autoComplete="new-password" {...register('password')} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Create account
        </Button>
      </form>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-4">
        <GoogleButton
          text="continue_with"
          disabled={mutation.isPending || googleMutation.isPending}
          onCredential={(credential) => googleMutation.mutate(credential)}
        />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
