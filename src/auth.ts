import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { optionalSecret, requiredSecret, requiredSetting } from "@/server/config/secrets";

function oidcProvider(): Provider {
  return {
    id: "corporate-oidc",
    name: "SSO Công ty",
    type: "oidc",
    issuer: requiredSetting("AUTH_OIDC_ISSUER"),
    clientId: requiredSetting("AUTH_OIDC_CLIENT_ID"),
    clientSecret: requiredSecret("AUTH_OIDC_CLIENT_SECRET"),
    authorization: { params: { scope: "openid profile email" } },
    checks: ["pkce", "state"],
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const devAuthEnabled = process.env.NODE_ENV !== "production"
    && (process.env.DEV_AUTH_ENABLED === "true" || process.env.TCMS_DEV_AUTH_ENABLED === "true");

  return {
    secret: devAuthEnabled ? optionalSecret("AUTH_SECRET") : requiredSecret("AUTH_SECRET"),
    providers: devAuthEnabled ? [] : [oidcProvider()],
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
  };
});
