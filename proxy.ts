import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  // 1. Get license_key and license_role from cookies
  const licenseKey = req.cookies.get('license_key')?.value;
  const licenseRole = req.cookies.get('license_role')?.value;

  // Paths that do not require a valid license key or are handled differently
  const publicPaths = ['/login', '/api/auth/set-license-cookie'];

  // If no license key or role, and trying to access a protected path, redirect to login
  if (!licenseKey || !licenseRole) {
    if (!publicPaths.includes(req.nextUrl.pathname)) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
    return res; // Allow access to public paths without a key
  }

  // Initialize Supabase client for database query
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({ name, value })
          res.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          req.cookies.delete(name)
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  );

  // 2. Validate License Key against the 'licenses' table
  const { data: license, error } = await supabase
    .from('licenses')
    .select('status, role, expires_at')
    .eq('key', licenseKey)
    .single();

  // If key is invalid, inactive, or expired, clear cookies and redirect to login
  if (error || !license || !license.status || (license.expires_at && new Date(license.expires_at) < new Date())) {
    req.cookies.delete('license_key');
    req.cookies.delete('license_role');
    res.cookies.delete('license_key');
    res.cookies.delete('license_role');

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Role-Based Authorization
  // Prevent 'user' role from accessing '/admin'
  if (license.role === 'user' && req.nextUrl.pathname.startsWith('/admin')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/'; // Redirect to home or another appropriate page
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  // - api (API routes)
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
