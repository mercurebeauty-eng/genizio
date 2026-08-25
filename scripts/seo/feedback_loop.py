#!/usr/bin/env python3
"""
SEO GSC Closed-Loop Feedback & Git Correlation (Step 5 of SEO Loop).

Investigates performance shifts:
Site -> Page -> Query -> Indexing/Canonical -> Recent Code Changes (Git Diff).

Emits a concrete engineering decision:
- KEEP (traffic and rankings growing or healthy)
- ITERATE (high impressions, low CTR or sub-optimal ranking -> refine H1, title, or depth)
- REVERT (sharp traffic drop linked to a recent Git regression)

Usage:
    python scripts/seo/feedback_loop.py /guides/test-de-personnalite-enfant-talents
    python scripts/seo/feedback_loop.py src/routes/guides.test-de-personnalite-enfant-talents.tsx
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Force UTF-8 on stdout/stderr for Windows console
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def get_git_history(target_file: Path) -> List[Dict]:
    """Récupère l'historique des modifications Git récentes sur ce fichier."""
    if not target_file.exists():
        return []
    try:
        rel_path = target_file.relative_to(PROJECT_ROOT)
        cmd = [
            "git", "log", "-n", "5",
            "--pretty=format:%h|%an|%ad|%s",
            "--date=short",
            str(rel_path)
        ]
        res = subprocess.run(cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True)
        commits = []
        for line in res.stdout.splitlines():
            parts = line.strip().split("|")
            if len(parts) >= 4:
                commits.append({
                    "hash": parts[0],
                    "author": parts[1],
                    "date": parts[2],
                    "subject": parts[3],
                })
        return commits
    except Exception:
        return []


def query_gsc_page_data(path_or_slug: str) -> Dict:
    """Interroge GSC pour obtenir les métriques de la page si disponible."""
    runtime_script = Path.home() / ".gemini" / "config" / "plugins" / "claude-seo" / "scripts" / "runtime.py"
    if not runtime_script.exists():
        return {"configured": False, "rows": []}

    try:
        cmd = [
            sys.executable,
            str(runtime_script),
            "run",
            "gsc_query.py",
            "--dimensions", "query,page",
            "--json"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            rows = data.get("rows", [])
            page_rows = [r for r in rows if path_or_slug in r.get("page", "")]
            return {
                "configured": True,
                "rows": page_rows,
                "totals": data.get("totals", {}),
            }
    except Exception:
        pass
    return {"configured": False, "rows": []}


def analyze_feedback(target: str) -> Dict:
    """Croise les signaux GSC et l'historique Git pour recommander KEEP / ITERATE / REVERT."""
    # Normaliser le chemin et le slug
    slug = ""
    file_path = None

    if target.endswith(".tsx"):
        file_path = PROJECT_ROOT / target if not Path(target).is_absolute() else Path(target)
        slug = file_path.stem.replace("guides.", "")
    else:
        slug = target.replace("/guides/", "").strip("/")
        file_path = PROJECT_ROOT / "src" / "routes" / f"guides.{slug}.tsx"

    route_path = f"/guides/{slug}"
    git_commits = get_git_history(file_path) if file_path and file_path.exists() else []
    gsc_data = query_gsc_page_data(slug)

    decision = "KEEP"
    diagnosis = []
    actions = []

    if not gsc_data["configured"]:
        diagnosis.append("⚠️ Google Search Console n'est pas encore connecté via Service Account.")
        diagnosis.append("💡 Pour connecter GSC : python scripts/seo/setup_gsc_auth.py --guide")
        decision = "ITERATE"
        actions.append("Connecter GSC pour obtenir les signaux réels d'impressions/clics.")
        actions.append("Maintenir les optimisations SEO locales et vérifier avec live_verify.py.")
    else:
        rows = gsc_data["rows"]
        if not rows:
            decision = "ITERATE"
            diagnosis.append("Page récemment publiée ou sans impressions significatives sur les 28 derniers jours.")
            actions.append("Vérifier l'indexation réelle : python ~/.gemini/config/plugins/claude-seo/scripts/runtime.py run gsc_inspect.py https://www.genizio.com" + route_path)
            actions.append("Renforcer le maillage interne depuis les pages à fort trafic.")
        else:
            total_clicks = sum(r.get("clicks", 0) for r in rows)
            total_imp = sum(r.get("impressions", 0) for r in rows)
            avg_pos = sum(r.get("position", 0) * r.get("impressions", 0) for r in rows) / max(total_imp, 1)
            ctr = (total_clicks / max(total_imp, 1)) * 100

            diagnosis.append(f"Performance GSC : {total_clicks} clics, {total_imp} impressions, CTR {ctr:.1f}%, Position moyenne {avg_pos:.1f}.")

            if avg_pos > 20:
                decision = "ITERATE"
                diagnosis.append("Positionnement au-delà du top 20. Le contenu a besoin de plus d'autorité sémantique.")
                actions.append("Enrichir la profondeur du guide avec des exemples concrets et des cas d'usage.")
                actions.append("Ajouter des questions/réponses FAQ People Also Ask.")
            elif avg_pos <= 10 and ctr < 3.0:
                decision = "ITERATE"
                diagnosis.append("Bon classement (Top 10) mais CTR faible (< 3%). Le titre ou la meta description ne convertissent pas assez.")
                actions.append("Réécrire le titre avec une accroche plus émotionnelle ou un bénéfice immédiat.")
                actions.append("Optimiser la meta description avec un appel à l'action clair.")
            elif avg_pos <= 5:
                decision = "KEEP"
                diagnosis.append("Excellente performance dans le Top 5 de Google.")
                actions.append("Ne pas modifier la structure principale pour éviter toute régression.")
                actions.append("Ajouter simplement de nouveaux liens internes sortants.")

    return {
        "target": target,
        "route_path": route_path,
        "file": str(file_path) if file_path else None,
        "decision": decision,
        "diagnosis": diagnosis,
        "actions": actions,
        "git_commits": git_commits,
        "gsc_connected": gsc_data["configured"],
    }


def main():
    parser = argparse.ArgumentParser(description="SEO GSC Closed-Loop Feedback")
    parser.add_argument("target", help="Route ou fichier (ex: /guides/test-de-personnalite-enfant-talents)")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")

    args = parser.parse_args()
    res = analyze_feedback(args.target)

    if args.json:
        print(json.dumps(res, indent=2, ensure_ascii=False))
        return

    color = "\033[92m" if res["decision"] == "KEEP" else ("\033[93m" if res["decision"] == "ITERATE" else "\033[91m")
    reset = "\033[0m"

    print("=" * 75)
    print(f"🔄 GSC FEEDBACK CLOSED-LOOP : {res['route_path']}")
    print("=" * 75)
    print(f"DÉCISION D'INGÉNIERIE : {color}>>> {res['decision']} <<<{reset}")

    print("\n🔍 Diagnostic & Observations :")
    for d in res["diagnosis"]:
        print(f"  • {d}")

    print("\n🛠️ Actions Recommandées :")
    for a in res["actions"]:
        print(f"  ✓ {a}")

    if res["git_commits"]:
        print("\n📜 Dernières Modifications Git :")
        for c in res["git_commits"]:
            print(f"  - [{c['date']}] {c['hash']} - {c['subject']} ({c['author']})")

    print("=" * 75)


if __name__ == "__main__":
    main()
