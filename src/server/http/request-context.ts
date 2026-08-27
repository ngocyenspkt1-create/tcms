import "server-only";

import { resolvePrincipal } from "../auth/identity";

export class AuthenticationError extends Error {}

export async function getRequestContext(request: Request) {
  const devAuthEnabled = process.env.DEV_AUTH_ENABLED === "true" || process.env.TCMS_DEV_AUTH_ENABLED === "true";
  const useDevAuth = process.env.NODE_ENV !== "production" && devAuthEnabled;

  let subject: string | undefined;
  let mfaVerified = false;
  if (useDevAuth) {
    subject = process.env.DEV_AUTH_SUBJECT?.trim() || process.env.TCMS_DEV_AUTH_SUBJECT?.trim();
    mfaVerified = process.env.DEV_AUTH_MFA === "true" || process.env.TCMS_DEV_AUTH_MFA === "true";
  } else {
    const { auth } = await import("@/auth");
    const session = await auth();
    subject = session?.identitySubject;
    mfaVerified = session?.mfaVerified === true;
  }
  if (!subject) throw new AuthenticationError("AUTHENTICATION_REQUIRED");

  return {
    principal: await resolvePrincipal({ subject, mfaVerified }),
    correlationId: request.headers.get("x-correlation-id") ?? crypto.randomUUID(),
    sourceIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}
