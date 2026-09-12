import { NextResponse } from 'next/server'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  if (supabase) await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', siteUrl()), { status: 303 })
}
