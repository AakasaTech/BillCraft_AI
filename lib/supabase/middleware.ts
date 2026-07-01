import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin-auth';

export async function updateSession(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthRoute   = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isAdminRoute  = pathname.startsWith('/admin');
  const isPublicRoute =
    pathname === '/'                      ||
    isAuthRoute                           ||
    pathname.startsWith('/auth/')         ||
    pathname === '/suspended'             ||
    pathname.startsWith('/p/')            ||
    pathname.startsWith('/e/')            ||
    pathname.startsWith('/portal/')       ||
    pathname.startsWith('/api/auth/')      ||
    pathname.startsWith('/api/p/')        ||
    pathname.startsWith('/api/e/')        ||
    pathname.startsWith('/api/portal')    ||
    pathname.startsWith('/api/webhooks')  ||
    pathname.startsWith('/privacy')       ||
    pathname.startsWith('/terms');

  // ── Unauthenticated access to protected routes ────────────────────────────
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // ── Admin route guard ─────────────────────────────────────────────────────
  if (isAdminRoute) {
    if (!user || !isAdminEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    // Admins bypass is_active check (they manage it)
    return supabaseResponse;
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // ── Suspended account check ───────────────────────────────────────────────
  if (user && !isPublicRoute) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', user.id)
      .single();

    if (userRecord && userRecord.is_active === false) {
      const url = request.nextUrl.clone();
      url.pathname = '/suspended';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
