import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refreshes the auth session on every request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);

  const slug = segments[0];
  const page = segments[1];

  // Public routes — never redirect these
  const isPublic =
    !page ||                          // root-level pages like /login, /portal
    page === "login" ||
    page === "portal" ||
    page === "accept-invite" ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/api") ||    // API routes must never be blocked
    pathname.startsWith("/not-found") ||
    pathname.startsWith("/suspended") ||
    pathname.startsWith("/expired");

  // Only redirect unauthenticated users away from protected routes.
  // Do NOT redirect logged-in users away from /login — the login page
  // itself handles that, and doing it here causes an infinite loop when
  // the layout's slug/org validation fails and boots the user back to login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = slug ? `/${slug}/login` : "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};