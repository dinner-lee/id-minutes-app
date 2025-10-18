export const runtime = "nodejs";
import NextAuth from "next-auth";
import Email from "next-auth/providers/email"; // or Google later

const handler = NextAuth({
  providers: [
    // Start simple with email-less dev; you can add Google in a minute.
    // For now, we'll stub credentials-free session via NEXTAUTH_SECRET only.
  ],
  // Minimal config so the app runs; we’ll wire DB sessions later if you want.
  secret: process.env.NEXTAUTH_SECRET,
});
export { handler as GET, handler as POST };
