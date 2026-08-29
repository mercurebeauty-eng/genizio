"""
Audit de prose anti-IA — Version rigoureuse.
Détecte 7 catégories de marqueurs statistiques et stylistiques
caractéristiques des textes générés par LLM (GPT-4, Claude, Gemini).

Catégories :
  1. Lexique-béquille : expressions surutilisées par les LLMs
  2. Connecteurs prévisibles : chaînes logiques trop lisses
  3. Structures mécaniques : patterns syntaxiques répétitifs
  4. Ouvertures clichées : débuts de paragraphe/phrase stéréotypés
  5. Emphase artificielle : adjectifs/adverbes de remplissage
  6. Uniformité rythmique : variance de longueur trop basse
  7. Patterns structurels : titres, FAQ, listes au format identique
"""

import glob
import json
import math
import os
import re
import sys
from collections import Counter
from pathlib import Path

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

# ──────────────────────────────────────────────
# 1. LEXIQUE-BÉQUILLE (expressions IA typiques)
# ──────────────────────────────────────────────
LEXICAL_CLICHES = {
    # Formules d'ouverture pompeuses
    "dans un monde (où|en)": "Ouverture pompeuse IA",
    "en constante évolution": "Cliché évolutif",
    "à l'ère (de|du|des|numérique)": "Ouverture temporelle IA",
    "dans (le|ce) paysage (actuel|contemporain|éducatif)": "Métaphore paysage",
    # Amplificateurs creux
    "pierre angulaire": "Amplificateur creux",
    "véritable (catalyseur|levier|tremplin|atout|enjeu|pilier|mine d'or)": "Amplificateur « véritable X »",
    "un (vrai|véritable) game.?changer": "Anglicisme IA",
    "non négligeable": "Litote IA",
    "de taille": "Amplificateur faible",
    "à part entière": "Remplissage IA",
    "indéniable(ment)?": "Emphase IA",
    "incontournable": "Amplificateur creux",
    "fondamental(e|ement)?": "Emphase IA (si >2x)",
    # Verbes/tournures impersonnelles
    "il est (crucial|primordial|essentiel|important|fondamental|intéressant) de": "Tournure impersonnelle IA",
    "il convient de": "Bureaucratisme IA",
    "il est à noter": "Bureaucratisme IA",
    "il s'avère que": "Tournure IA",
    "il va sans dire": "Formule IA",
    "force est de constater": "Expression figée IA",
    "il importe de": "Bureaucratisme IA",
    # Transitions mécaniques
    "en d'autres termes": "Transition reformulation IA",
    "autrement dit": "Transition reformulation IA",
    "à cet égard": "Connecteur formel IA",
    "dans cette optique": "Connecteur formel IA",
    "dans cette perspective": "Connecteur formel IA",
    "dans ce contexte": "Connecteur formel IA",
    "à ce titre": "Connecteur formel IA",
    "en ce sens": "Connecteur formel IA",
    "qui plus est": "Connecteur formel IA",
    # Conclusions
    "en conclusion": "Transition conclusion IA",
    "en somme": "Transition conclusion IA",
    "pour récapituler": "Transition conclusion IA",
    "en définitive": "Transition conclusion IA",
    "au final": "Transition conclusion IA (familier)",
    "in fine": "Latinisme IA",
    "au terme de": "Transition conclusion IA",
    # Métaphores mortes
    "plonger (au cœur|dans)": "Métaphore morte IA",
    "réside dans": "Métaphore morte IA",
    "au cœur (de|du|des)": "Métaphore morte IA (si >2x)",
    "clé de voûte": "Métaphore morte IA",
    "fer de lance": "Métaphore morte IA",
    "force motrice": "Métaphore morte IA",
    "ouvrir (la voie|des perspectives)": "Métaphore morte IA",
    "jeter les bases": "Métaphore morte IA",
    "franchir (un|le) cap": "Métaphore morte IA",
    "témoigne de": "Verbe-béquille IA",
    "incarne": "Verbe-béquille IA (si >2x)",
    # Hedging / prudence excessive
    "il est (toutefois|cependant|néanmoins) (important|essentiel)": "Hedging IA",
    "bien que .{5,30}, il (est|reste|demeure)": "Structure concessive IA",
    # Remplissage
    "par excellence": "Remplissage IA",
    "à proprement parler": "Remplissage IA",
    "en tant que tel": "Remplissage IA",
    "ni plus ni moins": "Remplissage IA",
    "loin s'en faut": "Remplissage IA",
}

# ──────────────────────────────────────────────
# 2. CONNECTEURS PRÉVISIBLES (chaînes trop lisses)
# ──────────────────────────────────────────────
OVERUSED_CONNECTORS = [
    "en effet",
    "par ailleurs",
    "de plus",
    "en outre",
    "ainsi",
    "de fait",
    "notamment",
    "d'une part",
    "d'autre part",
    "de surcroît",
    "cependant",
    "néanmoins",
    "toutefois",
    "en revanche",
    "concrètement",
    "plus précisément",
    "autrement dit",
]

# ──────────────────────────────────────────────
# 3. OUVERTURES DE PHRASE STÉRÉOTYPÉES
# ──────────────────────────────────────────────
STEREOTYPED_OPENERS = [
    r"^Découvrez\b",
    r"^Voici (comment|pourquoi|les|nos|ce que|un)\b",
    r"^C'est (là|ici|pourquoi|précisément) que\b",
    r"^(L'|La|Le|Les) (vrai|véritable|bonne) (question|enjeu|défi)\b",
    r"^Mais alors[, ]",
    r"^Résultat\s*:",
    r"^Spoiler\s*:",
    r"^Bonne nouvelle\s*:",
    r"^Et (si|pour cause)\b",
    r"^Vous l'aurez compris\b",
    r"^Ce n'est (pas|plus) un (hasard|secret|mystère)\b",
    r"^(Le|La|Un|Une) (constat|réalité|vérité) est (simple|clair|net|sans appel)\b",
]

# ──────────────────────────────────────────────
# 4. EMPHASE ARTIFICIELLE (adjectifs/adverbes creux)
# ──────────────────────────────────────────────
EMPTY_AMPLIFIERS = [
    "absolument",
    "littéralement",
    "véritablement",
    "réellement",
    "profondément",
    "considérablement",
    "significativement",
    "remarquablement",
    "drastiquement",
    "radicalement",
    "indéniablement",
    "incontestablement",
    "assurément",
]


def extract_prose(filepath):
    """Extract paragraphs, FAQ answers, intros from a guide TSX file."""
    content = Path(filepath).read_text(encoding="utf-8")
    paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", content, re.DOTALL)
    faq_answers = re.findall(r'answer:\s*"([^"]+)"', content)
    intros = re.findall(r'intro=\s*"([^"]+)"', content)
    h2s = re.findall(r"<h2[^>]*>(.*?)</h2>", content, re.DOTALL)
    all_text = " ".join(paragraphs + faq_answers + intros)
    clean = re.sub(r"<[^>]+>", "", all_text)
    clean = re.sub(r"\{\" \"\}", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean, h2s, faq_answers, content


def analyze_guide(filepath):
    """Run the full 7-category audit on a single guide."""
    name = Path(filepath).name
    prose, h2s, faq_answers, raw = extract_prose(filepath)

    issues = []

    # ── 1. Lexique-béquille ──
    for pattern, label in LEXICAL_CLICHES.items():
        matches = re.findall(pattern, prose, re.IGNORECASE)
        if matches:
            count = len(matches)
            # Some patterns are only flagged if overused
            if "(si >2x)" in label and count < 3:
                continue
            issues.append(("LEXIQUE", label, count, pattern))

    # ── 2. Connecteurs prévisibles ──
    sentences = [s.strip() for s in re.split(r"[.!?]+", prose) if len(s.strip()) > 10]
    connector_counts = Counter()
    for sent in sentences:
        for conn in OVERUSED_CONNECTORS:
            if re.search(rf"\b{conn}\b", sent, re.IGNORECASE):
                connector_counts[conn] += 1
    # Flag connectors used > 2x
    for conn, count in connector_counts.items():
        if count >= 3:
            issues.append(("CONNECTEUR", f"« {conn} » surutilisé", count, conn))

    total_connector_starts = 0
    for sent in sentences:
        stripped = sent.strip()
        for conn in OVERUSED_CONNECTORS:
            if re.match(rf"^{conn}\b", stripped, re.IGNORECASE):
                total_connector_starts += 1
                break
    if sentences and total_connector_starts / len(sentences) > 0.25:
        issues.append(("CONNECTEUR", "Trop de phrases ouvrant par un connecteur logique", total_connector_starts, f"{total_connector_starts}/{len(sentences)}"))

    # ── 3. Ouvertures stéréotypées ──
    stereotyped_count = 0
    for sent in sentences:
        for pattern in STEREOTYPED_OPENERS:
            if re.search(pattern, sent.strip(), re.IGNORECASE):
                stereotyped_count += 1
                break
    if stereotyped_count >= 3:
        issues.append(("OUVERTURE", "Phrases à ouverture stéréotypée IA", stereotyped_count, "Découvrez/Voici/C'est là que..."))

    # ── 4. Emphase artificielle ──
    for amp in EMPTY_AMPLIFIERS:
        count = len(re.findall(rf"\b{amp}\b", prose, re.IGNORECASE))
        if count >= 2:
            issues.append(("EMPHASE", f"Adverbe creux « {amp} »", count, amp))

    # ── 5. Burstiness / Uniformité rythmique ──
    word_counts = [len(s.split()) for s in sentences if len(s.split()) > 2]
    if word_counts:
        mean_len = sum(word_counts) / len(word_counts)
        variance = sum((x - mean_len) ** 2 for x in word_counts) / len(word_counts)
        std_dev = math.sqrt(variance)
        cv = std_dev / mean_len if mean_len > 0 else 0
    else:
        mean_len, std_dev, cv = 0, 0, 0

    if cv < 0.35:
        issues.append(("RYTHME", "Burstiness FAIBLE — phrases trop uniformes (signature IA forte)", round(cv, 2), f"CV={round(cv, 2)} < 0.35"))
    elif cv < 0.45:
        issues.append(("RYTHME", "Burstiness MOYEN — légèrement monotone", round(cv, 2), f"CV={round(cv, 2)} < 0.45"))

    # Consecutive sentences with similar length (±4 words)
    streaks = 0
    max_streak = 0
    for i in range(1, len(word_counts)):
        if abs(word_counts[i] - word_counts[i - 1]) <= 4:
            streaks += 1
            max_streak = max(max_streak, streaks)
        else:
            streaks = 0
    if max_streak >= 4:
        issues.append(("RYTHME", f"Séquence de {max_streak + 1} phrases consécutives de longueur similaire", max_streak + 1, "±4 mots"))

    # ── 6. Patterns structurels ──
    # H2 uniformity (all h2s same structure/length)
    if len(h2s) >= 3:
        h2_clean = [re.sub(r"<[^>]+>", "", h).strip() for h in h2s]
        h2_lengths = [len(h.split()) for h in h2_clean]
        if h2_lengths:
            h2_mean = sum(h2_lengths) / len(h2_lengths)
            h2_var = sum((x - h2_mean) ** 2 for x in h2_lengths) / len(h2_lengths)
            h2_cv = math.sqrt(h2_var) / h2_mean if h2_mean > 0 else 0
            if h2_cv < 0.2:
                issues.append(("STRUCTURE", "Titres H2 tous de longueur quasi-identique (pattern IA)", round(h2_cv, 2), f"CV H2={round(h2_cv, 2)}"))

        # Check if h2s all start with the same pattern
        h2_starters = [h.split()[0].lower() if h.split() else "" for h in h2_clean]
        starter_counts = Counter(h2_starters)
        most_common_starter, most_common_count = starter_counts.most_common(1)[0]
        if most_common_count >= 3 and len(h2s) >= 4:
            issues.append(("STRUCTURE", f"H2 commençant tous par « {most_common_starter} »", most_common_count, "Monotonie des titres"))

    # FAQ answer length uniformity
    if len(faq_answers) >= 3:
        faq_lengths = [len(a.split()) for a in faq_answers]
        faq_mean = sum(faq_lengths) / len(faq_lengths)
        faq_var = sum((x - faq_mean) ** 2 for x in faq_lengths) / len(faq_lengths)
        faq_cv = math.sqrt(faq_var) / faq_mean if faq_mean > 0 else 0
        if faq_cv < 0.15:
            issues.append(("STRUCTURE", "Réponses FAQ toutes de longueur identique (copier-coller IA)", round(faq_cv, 2), f"CV FAQ={round(faq_cv, 2)}"))

    # ── 7. Listes ternaires systématiques ──
    ternary_count = len(re.findall(r"\b\w+,\s*\w+\s+et\s+\w+\b", prose))
    if ternary_count >= 5:
        issues.append(("STRUCTURE", "Listes ternaires « X, Y et Z » récurrentes", ternary_count, "Pattern IA de liste à 3"))

    # ── 8. « Découvrez » dans les meta/intro ──
    decouvrez_count = len(re.findall(r"\bDécouvrez\b", raw, re.IGNORECASE))
    if decouvrez_count >= 2:
        issues.append(("LEXIQUE", "« Découvrez » surutilisé (signature SEO/IA)", decouvrez_count, "Découvrez"))

    # ── Unicode invisible ──
    invisibles = len(re.findall(r"[\u200B-\u200D\uFEFF]", raw))
    if invisibles:
        issues.append(("UNICODE", "Caractères invisibles détectés", invisibles, "watermark potentiel"))

    return {
        "file": name,
        "words": len(prose.split()),
        "sentences": len(sentences),
        "burstiness_cv": round(cv, 2),
        "mean_sentence_len": round(mean_len, 1),
        "issues": issues,
    }


def severity_score(issues):
    """Calculate a penalty score from issues."""
    penalty = 0
    for cat, label, count, _ in issues:
        if cat == "LEXIQUE":
            penalty += count * 4
        elif cat == "CONNECTEUR":
            penalty += count * 2
        elif cat == "OUVERTURE":
            penalty += count * 3
        elif cat == "EMPHASE":
            penalty += count * 3
        elif cat == "RYTHME":
            penalty += 8 if "FAIBLE" in label else 4
        elif cat == "STRUCTURE":
            penalty += count * 3
        elif cat == "UNICODE":
            penalty += 20
    return penalty


if __name__ == "__main__":
    guides = sorted(glob.glob("src/routes/guides.*.tsx"))
    guides = [g for g in guides if not g.endswith(("guides.index.tsx", "guides.tsx"))]

    all_results = []
    for g in guides:
        result = analyze_guide(g)
        result["penalty"] = severity_score(result["issues"])
        result["human_score"] = max(0, min(100, 100 - result["penalty"]))
        all_results.append(result)

    # Sort by score ascending (worst first)
    all_results.sort(key=lambda r: r["human_score"])

    print("=" * 100)
    print("  AUDIT ANTI-IA RIGOUREUX — 7 catégories, 80+ marqueurs")
    print("=" * 100)
    print()

    for r in all_results:
        badge = "🟢" if r["human_score"] >= 85 else "🟡" if r["human_score"] >= 70 else "🔴"
        short_name = r["file"].replace("guides.", "").replace(".tsx", "")
        print(f"{badge} {short_name:<50} Score: {r['human_score']}/100  (CV={r['burstiness_cv']}, moy={r['mean_sentence_len']} mots/phrase)")
        if r["issues"]:
            for cat, label, count, detail in r["issues"]:
                print(f"     [{cat}] {label} (×{count})  — {detail}")
        else:
            print("     ✅ Aucun marqueur IA détecté")
        print()

    avg = sum(r["human_score"] for r in all_results) / len(all_results)
    clean = sum(1 for r in all_results if not r["issues"])
    flagged = len(all_results) - clean
    print("=" * 100)
    print(f"  SCORE MOYEN : {avg:.0f}/100  |  {clean} guides propres  |  {flagged} guides avec marqueurs")
    print("=" * 100)
