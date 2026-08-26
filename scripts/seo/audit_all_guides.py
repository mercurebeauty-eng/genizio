#!/usr/bin/env python3
"""
Audit complet et cartographie des opportunités SEO pour tous les guides Génizio.
Croise :
1. Données réelles GSC (requêtes, impressions, clics, positions)
2. Diagnostics On-Page (Title, Description, Maillage interne, Longueur, Schémas)
3. Priorités stratégiques & potentiel de trafic.
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List

# Force UTF-8 on Windows
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ROUTES_DIR = PROJECT_ROOT / "src" / "routes"


def get_gsc_data() -> Dict[str, List[Dict]]:
    """Récupère les requêtes GSC groupées par slug de guide."""
    runtime_script = Path.home() / ".gemini" / "config" / "plugins" / "claude-seo" / "scripts" / "runtime.py"
    if not runtime_script.exists():
        return {}

    import subprocess
    cmd = [
        sys.executable,
        str(runtime_script),
        "run",
        "gsc_query.py",
        "--property", "sc-domain:genizio.com",
        "--days", "90",
        "--dimensions", "query,page",
        "--limit", "500",
        "--json"
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if res.returncode == 0:
            data = json.loads(res.stdout)
            page_map = {}
            for r in data.get("rows", []):
                page_url = r.get("page", "")
                query = r.get("query", "")
                for p in ROUTES_DIR.glob("guides.*.tsx"):
                    slug = p.stem.replace("guides.", "")
                    if f"/guides/{slug}" in page_url:
                        if slug not in page_map:
                            page_map[slug] = []
                        page_map[slug].append({
                            "query": query,
                            "clicks": r.get("clicks", 0),
                            "impressions": r.get("impressions", 0),
                            "position": r.get("position", 0),
                            "ctr": r.get("ctr", 0)
                        })
            return page_map
    except Exception:
        pass
    return {}


def audit_all() -> List[Dict]:
    gsc_map = get_gsc_data()
    guides = []

    for path in sorted(ROUTES_DIR.glob("guides.*.tsx")):
        if path.name in ("guides.index.tsx", "guides.tsx"):
            continue

        slug = path.stem.replace("guides.", "")
        content = path.read_text(encoding="utf-8")

        # Title
        tm = re.search(r'title:\s*(?:"([^"]+)"|\'([^\']+)\')', content)
        title = (tm.group(1) or tm.group(2)).strip() if tm else ""

        # Description
        dm = re.search(r'description:\s*(?:"([^"]+)"|\'([^\']+)\')', content, re.DOTALL)
        desc = (dm.group(1) or dm.group(2)).strip() if dm else ""
        desc = re.sub(r'\s+', ' ', desc)

        # H2 count
        h2_count = len(re.findall(r'<h2[^>]*>|<h2\s', content))

        # Internal links in body
        internal_links = re.findall(r'href=["\'](/guides/[^"\']+)["\']', content)
        link_count = len(internal_links)

        # Word count
        words = len(re.findall(r'\b\w+\b', content))

        # GSC queries for this guide
        gsc_queries = gsc_map.get(slug, [])
        total_impressions = sum(q["impressions"] for q in gsc_queries)
        best_position = min([q["position"] for q in gsc_queries], default=999)

        # Calcul du score d'opportunité / priorité
        priority = "NORMALE"
        opportunity_reason = []

        if gsc_queries:
            if best_position <= 30:
                priority = "🔥 TRÈS ÉLEVÉE (Quick-Win GSC)"
                opportunity_reason.append(f"Position {best_position:.1f} sur requêtes réelles ({total_impressions} imp)")
            else:
                priority = "⚡ ÉLEVÉE (Signaux GSC)"
                opportunity_reason.append(f"Impressions actives ({total_impressions} imp, pos {best_position:.1f})")

        # Problèmes techniques
        issues = []
        if len(title) < 40 or len(title) > 65:
            issues.append(f"Title à optimiser ({len(title)} car.)")
        if len(desc) < 120 or len(desc) > 165:
            issues.append(f"Meta desc à calibrer ({len(desc)} car.)")
        if link_count < 2:
            issues.append(f"Maillage interne faible ({link_count} liens)")
        if words < 1200:
            issues.append(f"Densité perfectible ({words} mots)")

        if not gsc_queries and link_count < 2:
            priority = "📈 PRIORITAIRE (Potentiel Non Exploité)"
            opportunity_reason.append("Zéro maillage interne détecté, fort potentiel de requêtes parentales")

        guides.append({
            "slug": slug,
            "filename": path.name,
            "title": title,
            "title_len": len(title),
            "desc_len": len(desc),
            "h2_count": h2_count,
            "internal_links": link_count,
            "words": words,
            "gsc_queries": gsc_queries,
            "total_impressions": total_impressions,
            "best_position": best_position if best_position < 999 else None,
            "priority": priority,
            "issues": issues,
            "opportunity_reason": opportunity_reason
        })

    # Trier par priorité
    priority_order = {
        "🔥 TRÈS ÉLEVÉE (Quick-Win GSC)": 1,
        "⚡ ÉLEVÉE (Signaux GSC)": 2,
        "📈 PRIORITAIRE (Potentiel Non Exploité)": 3,
        "NORMALE": 4
    }
    guides.sort(key=lambda x: (priority_order.get(x["priority"], 99), -(x["total_impressions"] or 0)))
    return guides


def main():
    guides = audit_all()
    print("=" * 80)
    print(f"📊 CARTOGRAPHIE DES OPPORTUNITÉS SEO : {len(guides)} GUIDES ANALYSÉS")
    print("=" * 80)

    for i, g in enumerate(guides, 1):
        print(f"\n{i}. [{g['priority']}] /guides/{g['slug']}")
        print(f"   📌 Titre actuel : \"{g['title']}\" ({g['title_len']} car.)")
        print(f"   📝 Métriques : {g['words']} mots | {g['h2_count']} sections H2 | {g['internal_links']} liens internes")

        if g["gsc_queries"]:
            print("   🔍 Requêtes GSC actives :")
            for q in g["gsc_queries"]:
                print(f"      • \"{q['query']}\" -> Pos {q['position']:.1f} | {q['impressions']} imp | {q['clicks']} clics")

        if g["issues"]:
            print(f"   ⚠️ À corriger : {', '.join(g['issues'])}")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
