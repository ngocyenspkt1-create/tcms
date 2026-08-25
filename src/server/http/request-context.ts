import "server-only";

import { auth } from "@/auth";
import { resolvePrincipal } from "../auth/identity";

export class AuthenticationError extends Error {}

export async function getRequestContext(request: Request) {
  const session = await auth();
  let subject = session?.identitySubject;
  let mfaVerified = session?.mfaVerified === true;

  const devAuthEnabled = process.env.DEV_AUTH_ENABLED === "true" || process.env.TCMS_DEV_AUTH_ENABLED === "true";
  if (!subject && process.env.NODE_ENV !== "production" && devAuthEnabled) {
    subject = process.env.DEV_AUTH_SUBJECT?.trim() || process.env.TCMS_DEV_AUTH_SUBJECT?.trim();
    mfaVerified = process.env.DEV_AUTH_MFA === "true" || process.env.TCMS_DEV_AUTH_MFA === "true";
  }
  if (!subject) throw new AuthenticationError("AUTHENTICATION_REQUIRED");

  return {
    principal: await resolvePrincipal({ subject, mfaVerified }),
    correlationId: request.headers.get("x-correlation-id") ?? crypto.randomUUID(),
    sourceIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}
