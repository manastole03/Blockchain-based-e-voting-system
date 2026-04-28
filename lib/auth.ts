import crypto from "crypto";

const SECRET = process.env.JWT_SECRET ?? "EVOTING_BLOCKCHAIN_SECRET_KEY_2026";

function btoa64(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function atob64(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

export function signToken(payload: Record<string, any>): string {
  const header = btoa64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa64(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 }));
  const signature = btoa64(
    crypto
      .createHmac("sha256", SECRET)
      .update(`${header}.${body}`)
      .digest("hex")
  );
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = btoa64(
      crypto
        .createHmac("sha256", SECRET)
        .update(`${header}.${body}`)
        .digest("hex")
    );

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(atob64(body));
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
