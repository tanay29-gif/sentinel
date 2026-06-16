import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host")

  const protocol =
    request.headers.get("x-forwarded-proto") ?? "https"

  const origin = `${protocol}://${host}`

  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  // console.log("NEXT =", next)
  console.log("request.url =", request.url)
  console.log("host =", request.headers.get("host"))
  console.log("x-forwarded-host =", request.headers.get("x-forwarded-host"))
  console.log("x-forwarded-proto =", request.headers.get("x-forwarded-proto"))

  // Handle OAuth errors from GitHub/Supabase
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    const errorParams = new URLSearchParams({
      error: error || 'Authentication failed',
      error_description: errorDescription || 'An error occurred during authentication',
    })
    // Redirect to origin error page after auth fails
    return NextResponse.redirect(`${origin}/auth/auth-error?${errorParams}`)
  }

  if (code) {
    try {
      const supabase = await createClient()

      // This trades the code for a session and stores it in cookies
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      // console.log("EXCHANGE DATA:", data);
      console.log("EXCHANGE ERROR:", exchangeError);
      // console.log("data coNTAins the user ", data.user)
      // console.log("SESSION:", data.session);
      // console.log("PROVIDER TOKEN:", data.session?.provider_token);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        const errorParams = new URLSearchParams({
          error: 'Code exchange failed',
          error_description: exchangeError.message || 'Failed to exchange code for session',
        })
        return NextResponse.redirect(`${origin}/auth/auth-error?${errorParams}`)
      }
      console.log("url", `${origin}${next}`)

      return NextResponse.redirect(`${origin}${next}`)

    } catch (err) {
      console.error('Callback route error:', err)
      const errorParams = new URLSearchParams({
        error: 'Server error',
        error_description: 'An unexpected error occurred during authentication',
      })

      return NextResponse.redirect(`${origin}/auth/auth-error?${errorParams}`)
    }
  }

  // No code provided - this shouldn't happen in normal flow
  console.warn('Callback route accessed without code parameter')
  const errorParams = new URLSearchParams({
    error: 'Missing authentication code',
    error_description: 'No authorization code was provided by GitHub',
  })
  return NextResponse.redirect(`${origin}/auth/auth-error?${errorParams}`)
}
