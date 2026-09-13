import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// env.ts čita varijable pri učitavanju modula, pa se modul uvozi iznova u svakom testu.
async function ucitajEnv() {
  vi.resetModules();
  const { env } = await import("../src/lib/env");
  return env;
}

describe("env", () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it("prazne varijable (npr. uvezene iz .env.example) koriste zadane vrijednosti", async () => {
    vi.stubEnv("STAFF_EMAIL", "");
    vi.stubEnv("EMAIL_REPLY_TO", "  ");
    vi.stubEnv("DEPOSIT_PERCENT", "");
    vi.stubEnv("FEATURE_LOYALTY", "");
    vi.stubEnv("FISCAL_BUSINESS_SPACE", "");
    const env = await ucitajEnv();
    expect(env.staffEmail).toBe("kidzonang@gmail.com");
    expect(env.emailReplyTo).toBe("kidzonang@gmail.com");
    expect(env.depositPercent).toBe(30);
    expect(env.featureLoyalty).toBe(true);
    expect(env.fiscalBusinessSpace).toBe("POSL1");
  });

  it("postavljene vrijednosti imaju prednost", async () => {
    vi.stubEnv("STAFF_EMAIL", "osoblje@primjer.hr");
    vi.stubEnv("DEPOSIT_PERCENT", "20");
    vi.stubEnv("FEATURE_LOYALTY", "false");
    const env = await ucitajEnv();
    expect(env.staffEmail).toBe("osoblje@primjer.hr");
    expect(env.depositPercent).toBe(20);
    expect(env.featureLoyalty).toBe(false);
  });

  it("prazan AUTH_SECRET u produkciji odbija rad", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    const env = await ucitajEnv();
    expect(() => env.authSecret).toThrow(/AUTH_SECRET/);
  });
});
