import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

/**
 * Public routes that do not require authentication.
 * All other routes redirect unauthenticated users to /login.
 */
const publicPaths = ["/login", "/signup", "/invite", "/"];

function isPublicRoute(pathname: string): boolean {
    // Exact match for root
    if (pathname === "/") return true;

    // Check if the pathname starts with any public path (except root which is already handled)
    return publicPaths.some(
        (path) =>
            path !== "/" &&
            (pathname === path || pathname.startsWith(`${path}/`))
    );
}

export async function proxy(request: NextRequest) {
    const { supabase, supabaseResponse } = createClient(request);

    // Refresh the auth session by calling getUser.
    // IMPORTANT: Do not use getSession() — it reads from storage and
    // is not guaranteed to be revalidated. getUser() always hits the
    // Supabase Auth server and guarantees the data is fresh.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Allow public routes and static assets through without auth check
    if (isPublicRoute(pathname)) {
        return supabaseResponse;
    }

    // Redirect unauthenticated users to /login
    if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         * - Public assets (images, svg, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
