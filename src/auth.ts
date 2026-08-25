import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { optionalSecret } from "@/server/config/secrets";

function oidcProvider(): Provider {
  return {
    id: "corporate-oidc",
    name: "SSO Công ty",
    type: "oidc",
    issuer: process.env.AUTH_OIDC_ISSUER,
    clientId: process.env.AUTH_OIDC_CLIENT_ID,
    clientSecret: optionalSecret("AUTH_OIDC_CLIENT_SECRET"),
    authorization: { params: { scope: "openid profile email" } },
    checks: ["pkce", "state"],
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: optionalSecret("AUTH_SECRET"),
  providers: [oidcProvider()],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.sub) token.identitySubject = profile.sub;
      const amr = (profile as { amr?: unknown } | undefined)?.amr;
      if (Array.isArray(amr)) token.mfaVerified = amr.some((item) => item === "mfa" || item === "otp");
      return token;
    },
    session({ session, token }) {
      session.identitySubject = typeof token.identitySubject === "string" ? token.identitySubject : token.sub;
      session.mfaVerified = token.mfaVerified === true;
      return session;
    },
  },
});
