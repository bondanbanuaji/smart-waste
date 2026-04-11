/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";


export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@smarttrash.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email dan password harus diisi");
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                        select: { id: true, email: true, name: true, password: true, role: true, image: true } as any,
                    });

                    if (!user) {
                        throw new Error("Akun tidak ditemukan");
                    }

                    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                    if (!isPasswordValid) {
                        throw new Error("Password salah");
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role as string,
                        image: user.image ?? null,
                    };
                } catch (error: any) {
                    throw new Error(error.message || "Gagal login, pastikan database berjalan");
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Update token image if session is updated from client
            if (trigger === "update" && session?.image) {
                token.image = session.image;
            } else if (trigger === "update" && session?.name) {
                token.name = session.name;
            }

            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.image = (user as any).image;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                session.user.image = token.image as string | null | undefined;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
        maxAge: 1800, // 30 Menit (dalam detik)
    },
    secret: process.env.NEXTAUTH_SECRET,
};
