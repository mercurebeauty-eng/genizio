import { describe, it, expect } from "vitest";
import { extractJsonFromLLMResponse } from "@/lib/challenges.functions";

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
