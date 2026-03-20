import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseAuthConfig } from '@/lib/supabase/config';

function normalizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/';
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const config = getSupabaseAuthConfig();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));

  if (!config) {
    return NextResponse.redirect(
      new URL('/login?error=Supabase%20Auth%20未配置', request.url),
    );
  }

  let response = NextResponse.redirect(new URL(nextPath, request.url));

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        response = NextResponse.redirect(new URL(nextPath, request.url));

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL('/login?error=登录回调失败', request.url),
      );
    }
  }

  return response;
}
