import { createClient } from '@/lib/supabase/server'
import LoginClient from './LoginClient'
import SchoolNotFoundPage from './SchoolNotFoundPage'

interface LoginPageProps {
  params: Promise<{ school_slug: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { school_slug } = await params
  const { error: urlError } = await searchParams

  // Validate slug format — slugs are lowercase alphanumeric + hyphens only
  const validSlug = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/.test(school_slug)
  if (!validSlug) {
    return <SchoolNotFoundPage slug={school_slug} reason="invalid" />
  }

  let school: { id: string; name: string; is_active: boolean } | null = null
  let dbError: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, is_active')
      .eq('slug', school_slug)
      .maybeSingle()  // returns null (not error) when no row found

    if (error) {
      console.error('[LoginPage] Supabase error for slug:', school_slug, error)
      dbError = error.message
    } else {
      school = data
    }
  } catch (err) {
    console.error('[LoginPage] Unexpected error for slug:', school_slug, err)
    dbError = err instanceof Error ? err.message : 'Unable to connect to database'
  }

  // DB connection failed — show a retry page, not 404
  if (dbError) {
    return <SchoolNotFoundPage slug={school_slug} reason="db_error" dbError={dbError} />
  }

  // School slug not found in DB
  if (!school) {
    return <SchoolNotFoundPage slug={school_slug} reason="not_found" />
  }

  // School exists but is suspended
  if (!school.is_active) {
    return <SchoolNotFoundPage slug={school_slug} reason="suspended" schoolName={school.name} />
  }

  return (
    <LoginClient
      schoolSlug={school_slug}
      schoolName={school.name}
      urlError={urlError}
    />
  )
}
