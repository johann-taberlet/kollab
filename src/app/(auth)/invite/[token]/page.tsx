import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AcceptInviteButton } from '@/components/org/accept-invite-button'

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch the invitation by token
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, organizations(name, slug)')
    .eq('token', token)
    .single()

  // Invalid token
  if (!invitation) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <CardTitle>Invalid invitation</CardTitle>
          <CardDescription>
            This invitation link is not valid. It may have been revoked or the
            link is incorrect.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/login">Go to login</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Already accepted
  if (invitation.accepted_at) {
    const orgData = invitation.organizations as { name: string; slug: string } | null
    if (orgData?.slug) {
      redirect(`/${orgData.slug}`)
    }
    redirect('/')
  }

  // Expired
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-orange-100">
            <Clock className="size-6 text-orange-600" />
          </div>
          <CardTitle>Invitation expired</CardTitle>
          <CardDescription>
            This invitation has expired. Please ask the organization admin to
            send a new one.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/login">Go to login</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const orgData = invitation.organizations as { name: string; slug: string } | null

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-6 text-primary" />
          </div>
          <CardTitle>You&apos;re invited!</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{' '}
            <span className="font-medium text-foreground">
              {orgData?.name ?? 'an organization'}
            </span>{' '}
            as a <span className="font-medium text-foreground">{invitation.role}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Sign up or log in to accept this invitation.</p>
          <p className="mt-1">
            Invitation sent to:{' '}
            <span className="font-medium text-foreground">{invitation.email}</span>
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/login?redirect=/invite/${token}`}>Sign in</Link>
          </Button>
          <Button asChild>
            <Link href={`/signup?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}>
              Sign up
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // User is logged in, check email match
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  const emailMatches =
    profile?.email.toLowerCase() === invitation.email.toLowerCase()

  if (!emailMatches) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="size-6 text-orange-600" />
          </div>
          <CardTitle>Email mismatch</CardTitle>
          <CardDescription>
            This invitation was sent to{' '}
            <span className="font-medium text-foreground">{invitation.email}</span>.
            You&apos;re currently logged in as{' '}
            <span className="font-medium text-foreground">{profile?.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            Please log in with the correct email address to accept this
            invitation.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href={`/login?redirect=/invite/${token}`}>
              Sign in with a different account
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Email matches - show accept button
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-6 text-green-600" />
        </div>
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join{' '}
          <span className="font-medium text-foreground">
            {orgData?.name ?? 'an organization'}
          </span>{' '}
          as a <span className="font-medium text-foreground">{invitation.role}</span>.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <AcceptInviteButton token={token} />
      </CardFooter>
    </Card>
  )
}
