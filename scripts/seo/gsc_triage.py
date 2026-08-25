#!/usr/bin/env python3
"""
GSC Pre-Flight Triage & Anti-Cannibalization Analyzer (Step 1 of SEO Loop).

Analyzes target queries/topics against:
1. Google Search Console data (if connected)
2. Existing local routes (src/routes/guides.*.tsx)
3. Existing public sitemap (public/sitemap.xml)

Outputs a clear architectural decision:
- CREATE (new distinct intent)
- IMPROVE EXISTING (enrich or update existing ranking page)
- REJECT (duplicate intent / cannibalization hazard)
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from urllib.parse import urlparse

# Force UTF-8 on stdout/stderr for Windows console
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

# Roots and paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ROUTES_DIR = PROJECT_ROOT / "src" / "routes"
SITEMAP_FILE = PROJECT_ROOT / "public" / "sitemap.xml"


def tokenize(text: str) -> set:
    """Nettoie et segmente un texte ou slug en mots-clés normalisés."""
    text = text.lower()
    # Suppression des accents simples et caractères spéciaux
    text = re.sub(r"[éèêë]", "e", text)
    text = re.sub(r"[àâä]", "a", text)
    text = re.sub(r"[îï]", "i", text)
    text = re.sub(r"[ôö]", "o", text)
    text = re.sub(r"[ùûü]", "u", text)
    text = re.sub(r"[ç]", "c", text)
    tokens = set(re.findall(r"\b[a-z0-9]{3,}\b", text))
    stopwords = {
        "pour", "dans", "avec", "sans", "les", "des", "une", "que", "qui", "par",
        "sur", "tout", "tous", "votre", "comment", "faire", "plus", "bien", "guides",
        "enfant", "enfants", "genizio", "page", "route", "html", "tsx"
    }
    return tokens - stopwords


def scan_local_guides() -> List[Dict]:
    """Scanne tous les guides locaux dans src/routes/ et extrait titres, paths et tokens."""
    guides = []
    if not ROUTES_DIR.exists():
        return guides

    for path in ROUTES_DIR.glob("guides.*.tsx"):
        if path.name in ("guides.index.tsx", "guides.tsx"):
            continue
        try:
            content = path.read_text(encoding="utf-8")
            slug = path.stem.replace("guides.", "")
            
            # Extraction du titre
            title_match = re.search(r'title:\s*["\']([^"\']+)["\']', content)
            title = title_match.group(1) if title_match else slug.replace("-", " ")

            # Extraction de la description
            desc_match = re.search(r'description:\s*["\']([^"\']+)["\']', content)
            description = desc_match.group(1) if desc_match else ""

            # Extraction des H1 / H2
            h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.DOTALL)
            h1 = re.sub(r"<[^>]+>", "", h1_match.group(1)).strip() if h1_match else ""

            all_tokens = tokenize(slug) | tokenize(title) | tokenize(description) | tokenize(h1)

            guides.append({
                "file": path.name,
                "path": f"/guides/{slug}",
                "slug": slug,
                "title": title,
                "description": description,
                "tokens": all_tokens,
            })
        except Exception:
            continue
    return guides


def scan_sitemap_urls() -> List[str]:
    """Extrait la liste des URLs du sitemap XML."""
    urls = []
    if not SITEMAP_FILE.exists():
        return urls
    try:
        content = SITEMAP_FILE.read_text(encoding="utf-8")
        matches = re.findall(r"<loc>(https?://[^<]+)</loc>", content)
        for loc in matches:
            parsed = urlparse(loc)
            urls.append(parsed.path.rstrip("/"))
    except Exception:
        pass
    return urls


def query_gsc_performance(keyword: str) -> List[Dict]:
    """Interroge GSC pour voir les URLs actuellement positionnées si configuré."""
    runtime_script = Path.home() / ".gemini" / "config" / "plugins" / "claude-seo" / "scripts" / "runtime.py"
    if not runtime_script.exists():
        return []

    try:
        cmd = [
            sys.executable,
            str(runtime_script),
            "run",
            "gsc_query.py",
            "--dimensions", "query,page",
            "--json"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            rows = data.get("rows", [])
            matches = []
            kw_tokens = tokenize(keyword)
            for r in rows:
                q = r.get("query", "").lower()
                q_tokens = tokenize(q)
                if kw_tokens & q_tokens:
                    matches.append({
                        "query": r.get("query"),
                        "page": r.get("page"),
                        "clicks": r.get("clicks", 0),
                        "impressions": r.get("impressions", 0),
                        "ctr": r.get("ctr", 0),
                        "position": r.get("position", 0),
                    })
            return matches
    except Exception:
        pass
    return []


def calculate_overlap(query_tokens: set, guide_tokens: set) -> float:
    """Calcule le coefficient de Jaccard / inclusion entre la requête et le guide."""
    if not query_tokens or not guide_tokens:
        return 0.0
    intersection = len(query_tokens & guide_tokens)
    union = len(query_tokens | guide_tokens)
    # Pondération forte sur l'inclusion de la requête dans la page existante
    query_inclusion = intersection / len(query_tokens)
    jaccard = intersection / union
    return round((0.7 * query_inclusion + 0.3 * jaccard) * 100, 1)


def triage_decision(keyword: str, angle: str = "") -> Dict:
    """Exécute l'analyse et renvoie la décision (CREATE, IMPROVE, REJECT)."""
    full_text = f"{keyword} {angle}".strip()
    query_tokens = tokenize(full_text)
    
    local_guides = scan_local_guides()
    sitemap_paths = scan_sitemap_urls()
    gsc_ranking = query_gsc_performance(keyword)

    comparisons = []
    for guide in local_guides:
        overlap = calculate_overlap(query_tokens, guide["tokens"])
        in_sitemap = guide["path"].rstrip("/") in sitemap_paths
        
        # Trouver les données GSC associées à cette page
        page_gsc = [r for r in gsc_ranking if guide["path"] in r["page"]]
        
        comparisons.append({
            "path": guide["path"],
            "file": guide["file"],
            "title": guide["title"],
            "overlap_pct": overlap,
            "in_sitemap": in_sitemap,
            "gsc_metrics": page_gsc[0] if page_gsc else None,
        })

    # Trier par score de chevauchement décroissant
    comparisons.sort(key=lambda x: x["overlap_pct"], reverse=True)
    top_match = comparisons[0] if comparisons else None

    decision = "CREATE"
    reason = "Aucun conflit détecté avec le contenu existant. Intention nouvelle."
    action_plan = []

    if top_match:
        overlap = top_match["overlap_pct"]
        if overlap >= 75.0:
            decision = "REJECT"
            reason = f"Cannibalisation sévère ({overlap}% de chevauchement). L'intention est déjà intégralement couverte par {top_match['path']}."
            action_plan = [
                f"Ne pas créer de nouvelle page pour '{keyword}'.",
                f"Améliorer ou enrichir le guide existant : {top_match['file']}.",
                "Si un nouvel angle est nécessaire, le différencier drastiquement (ex: tranche d'âge très précise, cas pratique)."
            ]
        elif overlap >= 40.0:
            decision = "IMPROVE EXISTING"
            reason = f"Proximité sémantique élevée ({overlap}%). Une page existante ({top_match['path']}) est déjà légitime sur ce cluster."
            action_plan = [
                f"Priorité : Enrichir le guide existant ({top_match['file']}) avec une nouvelle section H2 dédiée à '{keyword}'.",
                "Ajouter des questions FAQ spécifiques dans le guide existant.",
                "Si création autonome absolument requise : changer l'angle (ex: pédagogie inversée, intelligences multiples)."
            ]
        else:
            decision = "CREATE"
            reason = f"Intention suffisamment distincte (chevauchement max {overlap}% avec {top_match['path']})."
            action_plan = [
                f"Créer une nouvelle route : src/routes/guides.<slug>.tsx",
                f"Intégrer obligatoirement un maillage interne bidirectionnel avec '{top_match['path']}'.",
                "Ajouter l'URL dans public/sitemap.xml après validation."
            ]

    return {
        "keyword": keyword,
        "angle": angle,
        "decision": decision,
        "reason": reason,
        "top_match": top_match,
        "action_plan": action_plan,
        "all_comparisons": comparisons[:5],
        "gsc_live_hits": len(gsc_ranking) > 0,
    }


def main():
    parser = argparse.ArgumentParser(description="GSC Pre-Flight Triage & Anti-Cannibalization")
    parser.add_argument("keyword", type=str, help="Mot-clé ou requête cible")
    parser.add_argument("--angle", type=str, default="", help="Angle éditorial ou sous-thématique")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")

    args = parser.parse_args()

    result = triage_decision(args.keyword, args.angle)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    # Affichage formaté
    color = "\033[92m" if result["decision"] == "CREATE" else ("\033[93m" if result["decision"] == "IMPROVE EXISTING" else "\033[91m")
    reset = "\033[0m"

    print("=" * 70)
    print(f"📊 GSC PRE-FLIGHT TRIAGE : '{result['keyword']}'")
    if result["angle"]:
        print(f"🎯 Angle proposé : {result['angle']}")
    print("=" * 70)
    print(f"DÉCISION ARCHITECTURALE : {color}>>> {result['decision']} <<<{reset}")
    print(f"Motif : {result['reason']}")
    print("\n📋 Plan d'Action Recommandé :")
    for step in result["action_plan"]:
        print(f"  • {step}")

    if result["top_match"] and result["top_match"]["overlap_pct"] > 0:
        print("\n🔍 Pages les plus proches identifiées :")
        for comp in result["all_comparisons"]:
            print(f"  - [{comp['overlap_pct']}%] {comp['title']} ({comp['path']})")

    print("=" * 70)


if __name__ == "__main__":
    main()
