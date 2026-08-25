import "next-auth";

declare module "next-auth" {
  interface Session {
    identitySubject?: string;
    mfaVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    identitySubject?: string;
    mfaVerified?: boolean;
  }
}
