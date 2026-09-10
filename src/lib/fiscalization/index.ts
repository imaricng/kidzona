/**
 * Fiskalizacijski servis — javni ulaz. Po defaultu koristi MOCK koji generira
 * lažni ZKI/JIR za razvoj i demo. U produkciji se ovdje uključuje stvarni
 * ovlašteni provider (vidi README).
 */
import { createHash } from "crypto";
import { env } from "@/lib/env";
import type { FiscalizationService, FiskalniRacunInput, FiskalniRezultat } from "./types";

/**
 * MOCK implementacija — NIJE pravna fiskalizacija. Služi samo da bi sustav imao
 * popunjena JIR/ZKI polja u razvoju. ZKI se ovdje računa kao determinističan hash
 * (stvarni ZKI koristi RSA-SHA1 potpis nad nizom podataka i FINA certifikat).
 */
class MockFiscalizationProvider implements FiscalizationService {
  async fiscalizeInvoice(input: FiskalniRacunInput): Promise<FiskalniRezultat> {
    const osnova = [
      input.oib ?? env.fiscalOib ?? "00000000000",
      input.issuedAt.toISOString(),
      input.number,
      input.businessSpace,
      input.cashRegister,
      String(input.totalCents),
    ].join("|");

    const zki = createHash("md5").update(osnova).digest("hex").slice(0, 32);
    // Lažni JIR u formatu sličnom stvarnom (UUID-like).
    const jirRaw = createHash("sha1").update(osnova).digest("hex");
    const jir = [
      jirRaw.slice(0, 8),
      jirRaw.slice(8, 12),
      jirRaw.slice(12, 16),
      jirRaw.slice(16, 20),
      jirRaw.slice(20, 32),
    ].join("-");

    return { jir, zki, fiscalizedAt: input.issuedAt, provider: "mock" };
  }
}

/**
 * >>> TOČKA PRIKLJUČKA STVARNOG FISKALNOG SERVISA <<<
 * Implementiraj klasu koja zadovoljava `FiscalizationService` (npr.
 * `FinaFiscalizationProvider`) i dodaj granu ispod prema `env.fiscalizationProvider`.
 */
let instanca: FiscalizationService | null = null;

export function getFiscalizationService(): FiscalizationService {
  if (instanca) return instanca;
  switch (env.fiscalizationProvider) {
    // case "fina": instanca = new FinaFiscalizationProvider(); break;
    case "mock":
    default:
      instanca = new MockFiscalizationProvider();
  }
  return instanca;
}

export * from "./types";
