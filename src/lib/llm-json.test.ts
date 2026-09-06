import { describe, it, expect } from "vitest";
import {
  extractJsonFromLLMResponse,
  safeJsonParse,
  ChallengeSchema,
  unpackChallengeItem,
  unpackChallengeList,
} from "@/lib/challenges.functions";

// Couvre les cas trouvés empiriquement par la campagne de stress-test M2
// (challenger_m2_1.test.ts, Item 3) sur les anciennes regex ad-hoc de
// hypotheses.functions.ts / challenges.functions.ts : texte conversationnel
// autour du bloc balisé, bloc balisé tronqué (sans fermeture), et plusieurs
// blocs balisés dans la même réponse. extractJsonFromLLMResponse() remplace
// ces regex dispersées par une seule implémentation qui gère les quatre cas.
describe("extractJsonFromLLMResponse", () => {
  it("laisse un JSON déjà propre inchangé", () => {
    const input = `{"hypotheses":[{"cause":"READY_FOR_MORE","prior_probability":0.7}]}`;
    expect(extractJsonFromLLMResponse(input)).toBe(input);
    expect(() => JSON.parse(extractJsonFromLLMResponse(input))).not.toThrow();
  });

  it("extrait un bloc ```json ... ``` standard", () => {
    const input = '```json\n{"hypotheses":[]}\n```';
    expect(extractJsonFromLLMResponse(input)).toBe('{"hypotheses":[]}');
  });

  it("gère la casse et les espaces superflus du marqueur", () => {
    const input = '  ```JSON \n {"hypotheses":[]} \n ```  ';
    expect(extractJsonFromLLMResponse(input)).toBe('{"hypotheses":[]}');
  });

  it("ignore le texte conversationnel avant/après le bloc balisé", () => {
    const input = `Voici le diagnostic en format JSON :\n\`\`\`json\n{"hypotheses":[]}\n\`\`\`\nJ'espère que cela vous aide !`;
    const cleaned = extractJsonFromLLMResponse(input);
    expect(cleaned).toBe('{"hypotheses":[]}');
    expect(() => JSON.parse(cleaned)).not.toThrow();
  });

  it("récupère un bloc balisé sans fermeture (réponse tronquée)", () => {
    const input = '```json\n{"hypotheses":[]}';
    const cleaned = extractJsonFromLLMResponse(input);
    expect(cleaned).toBe('{"hypotheses":[]}');
    expect(() => JSON.parse(cleaned)).not.toThrow();
  });

  it("choisit le bloc tagué json parmi plusieurs blocs balisés", () => {
    const input = 'Explication:\n```text\nUn bloc de texte\n```\n```json\n{"hypotheses":[]}\n```';
    const cleaned = extractJsonFromLLMResponse(input);
    expect(cleaned).toBe('{"hypotheses":[]}');
    expect(() => JSON.parse(cleaned)).not.toThrow();
  });

  it("extrait le span JSON même sans aucune balise", () => {
    const input = `Voici le résultat : {"title":"Défi"} — voilà !`;
    expect(extractJsonFromLLMResponse(input)).toBe('{"title":"Défi"}');
  });

  it("renvoie la chaîne vide telle quelle", () => {
    expect(extractJsonFromLLMResponse("")).toBe("");
  });

  it("retire le bloc <think> avant extraction", () => {
    const input = `<think>
I need to output a JSON object. For example, { "foo": "bar" }.
</think>
{"hypotheses":[]}`;
    const cleaned = extractJsonFromLLMResponse(input);
    expect(cleaned).toBe('{"hypotheses":[]}');
    expect(() => JSON.parse(cleaned)).not.toThrow();
  });
});

describe("safeJsonParse & unwrapping", () => {
  it("décode un JSON simple standard", () => {
    const raw = '{"domain":"Sciences","title":"Fusée"}';
    const parsed = safeJsonParse(raw);
    expect(parsed).toEqual({ domain: "Sciences", title: "Fusée" });
  });

  it("dépaquète un JSON doublement sérialisé (stringified string)", () => {
    const inner = JSON.stringify({ domain: "Arts", title: "Sculpture" });
    const doubleEncoded = JSON.stringify(inner);
    const parsed = safeJsonParse(doubleEncoded);
    expect(parsed).toEqual({ domain: "Arts", title: "Sculpture" });
  });

  it("dépaquète un bloc markdown ```json contenant une chaîne encodée", () => {
    const inner = JSON.stringify({ domain: "Logique", title: "Enigme" });
    const input = `\`\`\`json\n${JSON.stringify(inner)}\n\`\`\``;
    const parsed = safeJsonParse(input);
    expect(parsed).toEqual({ domain: "Logique", title: "Enigme" });
  });
});

describe("unpackChallengeItem & ChallengeSchema validation", () => {
  it("gère un objet défi déjà formé", () => {
    const raw = { domain: "Sciences", title: "Défi direct" };
    const item = unpackChallengeItem(raw);
    expect(() => ChallengeSchema.parse(item)).not.toThrow();
    const parsed = ChallengeSchema.parse(item);
    expect(parsed.title).toBe("Défi direct");
  });

  it("gère une chaîne JSON contenant un défi (ex: réponse LLM brute en chaîne)", () => {
    const raw = '{"domain":"Sciences","title":"Vol de nuit"}';
    const item = unpackChallengeItem(raw);
    expect(typeof item).toBe("object");
    expect(() => ChallengeSchema.parse(item)).not.toThrow();
    const parsed = ChallengeSchema.parse(item);
    expect(parsed.title).toBe("Vol de nuit");
  });

  it("gère un tableau d'éléments où le premier élément est une chaîne JSON", () => {
    const raw = ['{"domain":"Nature","title":"Herbier"}'];
    const item = unpackChallengeItem(raw);
    expect(typeof item).toBe("object");
    expect(() => ChallengeSchema.parse(item)).not.toThrow();
    const parsed = ChallengeSchema.parse(item);
    expect(parsed.title).toBe("Herbier");
  });

  it("gère un objet enveloppant avec challenges contenant des chaînes JSON", () => {
    const raw = {
      challenges: [
        '{"domain":"Musique","title":"Rythmes africains"}'
      ]
    };
    const item = unpackChallengeItem(raw);
    expect(typeof item).toBe("object");
    expect(() => ChallengeSchema.parse(item)).not.toThrow();
    const parsed = ChallengeSchema.parse(item);
    expect(parsed.title).toBe("Rythmes africains");
  });

  it("gère un objet enveloppant challenge sous forme de chaîne JSON (modèles alternatifs GLM/Qwen)", () => {
    const raw = {
      challenge: '{"domain":"Ingénierie","title":"Pont en carton"}'
    };
    const item = unpackChallengeItem(raw);
    expect(typeof item).toBe("object");
    expect(() => ChallengeSchema.parse(item)).not.toThrow();
    const parsed = ChallengeSchema.parse(item);
    expect(parsed.title).toBe("Pont en carton");
  });

  it("gère un wrapper générique response sous forme de chaîne JSON", () => {
    const raw = {
      response: '{"domain":"Maths","title":"Compte est bon"}'
    };
    const item = unpackChallengeItem(raw);
    expect(typeof item).toBe("object");
    expect(() => ChallengeSchema.parse(item)).not.toThrow();
    const parsed = ChallengeSchema.parse(item);
    expect(parsed.title).toBe("Compte est bon");
  });

  it("gère unpackChallengeList avec un mélange d'objets et de chaînes JSON", () => {
    const raw = {
      challenges: [
        { domain: "Sciences", title: "Défi 1" },
        '{"domain":"Art","title":"Défi 2"}'
      ]
    };
    const list = unpackChallengeList(raw);
    expect(list).toHaveLength(2);
    expect(() => {
      list.forEach((entry) => ChallengeSchema.parse(entry));
    }).not.toThrow();
  });

  it("gère les wrappers imbriqués comme output.challenge en chaîne JSON", () => {
    const raw = {
      output: {
        challenge: '{"domain":"Corps","title":"Course d\'obstacles"}'
      }
    };
    const item = unpackChallengeItem(raw);
    expect(typeof item).toBe("object");
    expect(() => ChallengeSchema.parse(item)).not.toThrow();
    const parsed = ChallengeSchema.parse(item);
    expect(parsed.title).toBe("Course d'obstacles");
  });

  it("tolère les valeurs nulles, vides ou inattendues sans crasher ChallengeSchema", () => {
    expect(() => ChallengeSchema.parse(unpackChallengeItem(null))).not.toThrow();
    expect(() => ChallengeSchema.parse(unpackChallengeItem(undefined))).not.toThrow();
    expect(() => ChallengeSchema.parse(unpackChallengeItem(""))).not.toThrow();
    expect(() => ChallengeSchema.parse(unpackChallengeItem("texte arbitraire sans json"))).not.toThrow();
  });
});

