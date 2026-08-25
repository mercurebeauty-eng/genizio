#!/usr/bin/env python3
"""
SEO Pre-Flight Quality Gate (Step 3 of SEO Loop - Blocking Gate).

Automated pre-deployment validation for Génizio guides and SEO routes.
Verifies all 10 critical SEO & pedagogical criteria before code commit/merge.

Usage:
    python scripts/seo/preflight_gate.py src/routes/guides.mon-guide.tsx
    python scripts/seo/preflight_gate.py --all
    python scripts/seo/preflight_gate.py --staged
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from xml.etree import ElementTree as ET

# Force UTF-8 on stdout/stderr for Windows console
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SITEMAP_FILE = PROJECT_ROOT / "public" / "sitemap.xml"


class PreflightChecker:
    def __init__(self, target_file: Path):
        self.file_path = target_file
        self.filename = target_file.name
        self.content = ""
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.passed: List[str] = []
        self.metadata: Dict = {}

    def load(self) -> bool:
        if not self.file_path.exists():
            self.errors.append(f"Fichier introuvable : {self.file_path}")
            return False
        try:
            self.content = self.file_path.read_text(encoding="utf-8")
            return True
        except Exception as e:
            self.errors.append(f"Impossible de lire le fichier : {e}")
            return False

    def check_title(self):
        """Vérifie la balise title (30 à 65 caractères, non générique)."""
        match = re.search(r'title:\s*(?:"([^"]+)"|\'([^\']+)\')', self.content)
        if not match:
            self.errors.append("Balise 'title' manquante dans head() / pageMeta.")
            return

        title = (match.group(1) or match.group(2)).strip()
        self.metadata["title"] = title
        length = len(title)

        if length < 30:
            self.warnings.append(f"Titre trop court ({length} car.) : '{title}' (recommandé: 45-60 car.)")
        elif length > 65:
            self.warnings.append(f"Titre trop long ({length} car., risque de troncature Google) : '{title}' (max 65 car.)")
        else:
            self.passed.append(f"Titre optimal ({length} car.) : '{title}'")

    def check_description(self):
        """Vérifie la meta description (110 à 165 caractères)."""
        match = re.search(r'description:\s*(?:"([^"]+)"|\'([^\']+)\')', self.content, re.DOTALL)
        if not match:
            self.errors.append("Meta 'description' manquante dans head() / pageMeta.")
            return

        desc = (match.group(1) or match.group(2)).strip()
        # Nettoyer les sauts de ligne internes éventuels
        desc = re.sub(r'\s+', ' ', desc)
        self.metadata["description"] = desc
        length = len(desc)

        if length < 110:
            self.warnings.append(f"Meta description trop courte ({length} car., recommandé: 120-160 car.)")
        elif length > 165:
            self.warnings.append(f"Meta description trop longue ({length} car., risque de troncature) (max 165 car.)")
        else:
            self.passed.append(f"Meta description optimale ({length} car.)")

    def check_canonical_and_path(self):
        """Vérifie le PATH et la balise canonique."""
        path_match = re.search(r'const\s+PATH\s*=\s*["\']([^"\']+)["\']', self.content)
        if path_match:
            path_val = path_match.group(1)
            self.metadata["path"] = path_val
            if not path_val.startswith("/guides/"):
                self.warnings.append(f"PATH '{path_val}' ne suit pas la convention '/guides/<slug>'")
            else:
                self.passed.append(f"PATH conforme : '{path_val}'")
        else:
            self.warnings.append("Constante 'PATH' non déclarée explicitement.")

    def check_headings_hierarchy(self):
        """Vérifie la hiérarchie H1, H2, H3."""
        h1_matches = re.findall(r'<h1[^>]*>|title=["\']([^"\']+)["\']', self.content)
        guide_layout_title = re.search(r'<GuideLayout[^>]*title=["\']([^"\']+)["\']', self.content)
        
        if not guide_layout_title and not h1_matches:
            self.errors.append("Aucun titre principal H1 ou GuideLayout title détecté.")
        else:
            self.passed.append("Titre principal H1 unique présent.")

        # Vérifier la présence de H2 / questions
        h2_count = len(re.findall(r'<h2[^>]*>|<h2\s', self.content)) + len(re.findall(r'className=["\'][^"\']*text-(?:2xl|xl)[^"\']*font-bold', self.content))
        if h2_count < 2:
            self.warnings.append("Moins de 2 sous-titres (H2) détectés. Structure sémantique potentiellement faible.")
        else:
            self.passed.append(f"Structure sémantique valide ({h2_count} sections H2 détectées).")

    def check_json_ld_schemas(self):
        """Vérifie les schémas Schema.org JSON-LD (Article, FAQPage, BreadcrumbList)."""
        has_article = "articleJsonLd" in self.content or '"@type": "Article"' in self.content or '"@type": "BlogPosting"' in self.content
        has_faq = "faqPageJsonLd" in self.content or '"@type": "FAQPage"' in self.content
        has_breadcrumbs = "breadcrumbJsonLd" in self.content or '"@type": "BreadcrumbList"' in self.content

        if not has_article:
            self.errors.append("Schema JSON-LD 'Article' manquant (essentiel pour GEO & Google Discover).")
        else:
            self.passed.append("Schema 'Article' / 'BlogPosting' présent.")

        if not has_faq:
            self.warnings.append("Schema JSON-LD 'FAQPage' absent (recommandé pour AEO et People Also Ask).")
        else:
            self.passed.append("Schema 'FAQPage' présent.")

        if not has_breadcrumbs:
            self.warnings.append("Schema JSON-LD 'BreadcrumbList' absent.")
        else:
            self.passed.append("Schema 'BreadcrumbList' présent.")

    def check_sitemap_inclusion(self):
        """Vérifie si l'URL est bien inscrite dans public/sitemap.xml."""
        if not SITEMAP_FILE.exists():
            self.warnings.append("Fichier public/sitemap.xml introuvable.")
            return

        slug = self.filename.replace("guides.", "").replace(".tsx", "")
        expected_url_part = f"/guides/{slug}"

        try:
            sitemap_content = SITEMAP_FILE.read_text(encoding="utf-8")
            if expected_url_part in sitemap_content:
                self.passed.append(f"Inclusion confirmée dans public/sitemap.xml ({expected_url_part})")
            else:
                self.errors.append(f"URL non inscrite dans public/sitemap.xml ! Ajouter : <url><loc>https://www.genizio.com{expected_url_part}</loc>...</url>")
        except Exception as e:
            self.warnings.append(f"Erreur lors de la lecture du sitemap : {e}")

    def check_internal_links_and_social(self):
        """Vérifie les liens internes et la barre de partage WhatsApp."""
        link_matches = re.findall(r'href=["\'](/[^"\']+)["\']|<Link\s+to=["\'](/[^"\']+)["\']', self.content)
        total_links = len(link_matches)

        if total_links < 2:
            self.warnings.append(f"Maillage interne faible ({total_links} liens internes détectés). Recommandé : minimum 2-4 liens contextuels.")
        else:
            self.passed.append(f"Maillage interne satisfaisant ({total_links} liens internes détectés).")

        if "SocialShareBar" in self.content or "whatsapp" in self.content.lower():
            self.passed.append("Partage social / WhatsApp intégré.")

    def check_content_depth(self):
        """Vérifie la consistance textuelle globale."""
        words = len(re.findall(r"\b\w+\b", self.content))
        if words < 300:
            self.errors.append(f"Contenu trop mince ({words} mots). Risque élevé de pénalité Thin Content.")
        elif words < 700:
            self.warnings.append(f"Longueur modeste ({words} mots). Viser 800 à 1500 mots pour une autorité maximale.")
        else:
            self.passed.append(f"Densité textuelle suffisante (~{words} mots).")

    def run_all_checks(self) -> Dict:
        if not self.load():
            return {
                "file": str(self.file_path),
                "status": "BLOCKED",
                "errors": self.errors,
                "warnings": self.warnings,
                "passed": self.passed,
            }

        self.check_title()
        self.check_description()
        self.check_canonical_and_path()
        self.check_headings_hierarchy()
        self.check_json_ld_schemas()
        self.check_sitemap_inclusion()
        self.check_internal_links_and_social()
        self.check_content_depth()

        status = "PASSED" if not self.errors else "BLOCKED"
        return {
            "file": str(self.file_path),
            "filename": self.filename,
            "status": status,
            "errors": self.errors,
            "warnings": self.warnings,
            "passed": self.passed,
            "metadata": self.metadata,
        }


def get_staged_guide_files() -> List[Path]:
    """Récupère les fichiers de routes modifiés dans le staging Git."""
    try:
        res = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True)
        files = []
        for line in res.stdout.splitlines():
            line = line.strip()
            if line.startswith("src/routes/guides.") and line.endswith(".tsx"):
                files.append(PROJECT_ROOT / line)
        return files
    except Exception:
        return []


def main():
    parser = argparse.ArgumentParser(description="SEO Pre-Flight Quality Gate")
    parser.add_argument("file", nargs="?", help="Fichier de route à auditer (ex: src/routes/guides.mon-guide.tsx)")
    parser.add_argument("--all", action="store_true", help="Auditer tous les guides de src/routes/")
    parser.add_argument("--staged", action="store_true", help="Auditer uniquement les fichiers indexés dans Git")
    parser.add_argument("--json", action="store_true", help="Sortie au format JSON")

    args = parser.parse_args()

    files_to_check: List[Path] = []

    if args.staged:
        files_to_check = get_staged_guide_files()
        if not files_to_check:
            print("ℹ️ Aucun fichier de guide dans le staging Git.")
            sys.exit(0)
    elif args.all:
        routes_dir = PROJECT_ROOT / "src" / "routes"
        files_to_check = [f for f in routes_dir.glob("guides.*.tsx") if f.name not in ("guides.index.tsx", "guides.tsx")]
    elif args.file:
        files_to_check = [Path(args.file).resolve()]
    else:
        parser.print_help()
        sys.exit(1)

    all_results = []
    has_blocking_errors = False

    for target in files_to_check:
        checker = PreflightChecker(target)
        res = checker.run_all_checks()
        all_results.append(res)
        if res["status"] == "BLOCKED":
            has_blocking_errors = True

    if args.json:
        print(json.dumps(all_results, indent=2, ensure_ascii=False))
        sys.exit(1 if has_blocking_errors else 0)

    # Affichage formaté console
    print("=" * 75)
    print("🛡️  PORTE DE QUALITÉ PRÉ-DÉPLOIEMENT (SEO PRE-FLIGHT GATE)")
    print("=" * 75)

    for res in all_results:
        color = "\033[92m" if res["status"] == "PASSED" else "\033[91m"
        reset = "\033[0m"
        print(f"\n📄 Fichier : {res['filename']} -> Statut : {color}{res['status']}{reset}")

        if res["errors"]:
            print("\n  ❌ ERREURS BLOQUANTES (Déploiement interdit) :")
            for err in res["errors"]:
                print(f"     • {err}")

        if res["warnings"]:
            print("\n  ⚠️ AVERTISSEMENTS (À optimiser) :")
            for warn in res["warnings"]:
                print(f"     • {warn}")

        if res["passed"]:
            print("\n  ✅ CONTRÔLES VALIDÉS :")
            for ok in res["passed"]:
                print(f"     ✓ {ok}")

    print("\n" + "=" * 75)
    if has_blocking_errors:
        print("🚫 RÉSULTAT GLOBAL : ÉCHEC. Corrigez les erreurs bloquantes avant de déployer.")
        sys.exit(1)
    else:
        print("🎉 RÉSULTAT GLOBAL : SUCCÈS. Toutes les exigences critiques sont satisfaites.")
        sys.exit(0)


if __name__ == "__main__":
    main()
