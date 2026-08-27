import { describe, expect, it } from "vitest";
import { getCanonicalRedirect } from "@/server";

describe("getCanonicalRedirect", () => {
  it("ne redirige pas en environnement localhost / test", () => {
    const req = new Request("http://localhost:3000/guides/test");
    expect(getCanonicalRedirect(req)).toBeNull();
  });

  it("redirige genizio.com vers https://www.genizio.com en 301 avec le chemin et les query params", () => {
    const req = new Request("https://genizio.com/guides/gardner?ref=social", {
      headers: { host: "genizio.com" },
    });
    const res = getCanonicalRedirect(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(301);
    expect(res?.headers.get("Location")).toBe(
      "https://www.genizio.com/guides/gardner?ref=social",
    );
  });

  it("redirige genizio.vercel.app vers https://www.genizio.com en 301", () => {
    const req = new Request("https://genizio.vercel.app/a-propos", {
      headers: { host: "genizio.vercel.app" },
    });
    const res = getCanonicalRedirect(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(301);
    expect(res?.headers.get("Location")).toBe("https://www.genizio.com/a-propos");
  });

  it("supprime le trailing slash et redirige en 301 vers l'URL propre", () => {
    const req = new Request("https://www.genizio.com/guides/gardner/", {
      headers: { host: "www.genizio.com" },
    });
    const res = getCanonicalRedirect(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(301);
    expect(res?.headers.get("Location")).toBe("https://www.genizio.com/guides/gardner");
  });

  it("ne redirige pas la racine / sur www.genizio.com", () => {
    const req = new Request("https://www.genizio.com/", {
      headers: { host: "www.genizio.com", "x-forwarded-proto": "https" },
    });
    expect(getCanonicalRedirect(req)).toBeNull();
  });
});
