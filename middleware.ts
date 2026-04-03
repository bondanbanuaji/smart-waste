import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAuthPage = req.nextUrl.pathname.startsWith("/login");

        if (isAuthPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
            return null;
        }

        if (!isAuth) {
            let from = req.nextUrl.pathname;
            if (req.nextUrl.search) {
                from += req.nextUrl.search;
            }

            return NextResponse.redirect(
                new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
            );
        }

        // Role-based protection: only ADMIN can access /dashboard/accounts
        if (req.nextUrl.pathname.startsWith("/dashboard/accounts")) {
            const role = token?.role;
            if (role !== "ADMIN") {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }

        return null;
    },
    {
        callbacks: {
            authorized() {
                // Obsoleted by middleware logic above
                return true;
            },
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};
