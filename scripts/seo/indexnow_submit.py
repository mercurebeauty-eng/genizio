#!/usr/bin/env python3
"""
IndexNow Submission Utility for Bing & Search Engines.

Permet d'envoyer instantanément les URLs modifiées ou créées aux moteurs de recherche
qui supportent IndexNow (Bing, Yandex, Seznam, Naver...).

Usage:
    # 1. Soumettre une ou plusieurs URLs spécifiques :
    python scripts/seo/indexnow_submit.py https://www.genizio.com/guides/mon-nouvel-article

    # 2. Soumettre tout le sitemap local :
    python scripts/seo/indexnow_submit.py --sitemap public/sitemap.xml

    # 3. Mode simulation (dry-run) :
    python scripts/seo/indexnow_submit.py --sitemap public/sitemap.xml --dry-run
"""

import argparse
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Optional

# Force UTF-8 on stdout/stderr for Windows console
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
DEFAULT_HOST = "www.genizio.com"


def find_indexnow_key() -> tuple[Optional[str], Optional[str]]:
    """
    Recherche automatiquement le fichier clé IndexNow dans public/.
    Retourne (clé, nom_fichier) ou (None, None).
    """
    txt_files = list(PUBLIC_DIR.glob("*.txt"))
    for file_path in txt_files:
        filename = file_path.name
        stem = file_path.stem
        # Une clé IndexNow fait généralement entre 8 et 128 caractères hexadécimaux / alphanumériques
        # et le nom du fichier correspond souvent au contenu (clé.txt)
        if len(stem) >= 8 and re.match(r"^[a-zA-Z0-9_-]+$", stem):
            try:
                content = file_path.read_text(encoding="utf-8").strip()
                if content == stem or (len(content) >= 8 and re.match(r"^[a-zA-Z0-9_-]+$", content)):
                    return content, filename
            except Exception:
                continue
    return None, None


def extract_urls_from_sitemap(sitemap_path: Path) -> List[str]:
    """Extrait la liste des URLs contenues dans un fichier sitemap XML."""
    if not sitemap_path.exists():
        raise FileNotFoundError(f"Fichier sitemap introuvable : {sitemap_path}")

    tree = ET.parse(sitemap_path)
    root = tree.getroot()

    # Gestion des namespaces XML standard de sitemap
    namespaces = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    
    urls = []
    # Recherche avec namespace
    for loc in root.findall(".//ns:loc", namespaces):
        if loc.text:
            urls.append(loc.text.strip())

    # Fallback sans namespace
    if not urls:
        for loc in root.findall(".//loc"):
            if loc.text:
                urls.append(loc.text.strip())

    return urls


def submit_to_indexnow(
    host: str,
    key: str,
    key_location: Optional[str],
    url_list: List[str],
    dry_run: bool = False
) -> bool:
    """Envoie la requête POST à l'API IndexNow."""
    if not url_list:
        print("[!] Aucune URL à soumettre.")
        return False

    payload = {
        "host": host,
        "key": key,
        "urlList": url_list
    }
    if key_location:
        payload["keyLocation"] = key_location

    print(f"\n--- [INDEXNOW] Préparation de la soumission ---")
    print(f"Host         : {host}")
    print(f"Key          : {key}")
    if key_location:
        print(f"Key Location : {key_location}")
    print(f"Nombre URLs  : {len(url_list)}")
    print(f"Exemples     :")
    for u in url_list[:5]:
        print(f"  - {u}")
    if len(url_list) > 5:
        print(f"  ... et {len(url_list) - 5} autre(s)")

    if dry_run:
        print("\n[DRY-RUN] Simulation réussie, aucune requête envoyée.")
        return True

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Genizio-IndexNow-Bot/1.0"
    }

    req = urllib.request.Request(INDEXNOW_ENDPOINT, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            if status in (200, 202):
                print(f"\n[OK] Soumission IndexNow réussie ! (HTTP {status})")
                print("IndexNow a transmis vos URLs aux moteurs (Bing, Yandex, etc.).")
                return True
            else:
                print(f"\n[?] Réponse inattendue (HTTP {status}): {body}")
                return False
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        status = e.code
        print(f"\n[ERREUR] HTTP {status}:")
        if status == 400:
            print(" -> Format de requête invalide.")
        elif status == 403:
            print(" -> Clé non valide ou fichier de clé introuvable à l'adresse indiquée.")
        elif status == 422:
            print(" -> Les URLs ne correspondent pas au domaine hôte.")
        elif status == 429:
            print(" -> Trop de requêtes envoyées (Rate limit).")
        print(f"Détails : {body}")
        return False
    except Exception as e:
        print(f"\n[ERREUR] Impossible de contacter IndexNow : {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Soumet des URLs à IndexNow (Bing / Yandex / Seznam)")
    parser.add_argument("urls", nargs="*", help="URLs spécifiques à soumettre")
    parser.add_argument("--sitemap", help="Chemin vers un fichier sitemap XML local")
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"Nom de domaine hôte (défaut: {DEFAULT_HOST})")
    parser.add_argument("--key", help="Clé IndexNow (si non détectée automatiquement)")
    parser.add_argument("--dry-run", action="store_true", help="Affiche le payload sans envoyer de requête HTTP")

    args = parser.parse_args()

    # Détection de la clé
    key = args.key
    key_filename = None
    if not key:
        detected_key, detected_file = find_indexnow_key()
        if detected_key:
            key = detected_key
            key_filename = detected_file
        else:
            print("[ERREUR] Aucune clé IndexNow trouvée dans public/ (*.txt).")
            print("Veuillez spécifier --key <votre_cle> ou placer le fichier <cle>.txt dans public/.")
            sys.exit(1)

    key_location = f"https://{args.host}/{key_filename}" if key_filename else None

    # Collecte des URLs
    urls_to_submit = []
    if args.sitemap:
        sitemap_p = Path(args.sitemap)
        if not sitemap_p.is_absolute():
            sitemap_p = PROJECT_ROOT / sitemap_p
        urls_to_submit.extend(extract_urls_from_sitemap(sitemap_p))

    if args.urls:
        urls_to_submit.extend(args.urls)

    if not urls_to_submit and not args.sitemap:
        # Par défaut, si rien n'est fourni, proposer d'utiliser public/sitemap.xml
        default_sitemap = PUBLIC_DIR / "sitemap.xml"
        if default_sitemap.exists():
            print(f"[INFO] Aucun argument fourni, chargement automatique de {default_sitemap}")
            urls_to_submit.extend(extract_urls_from_sitemap(default_sitemap))

    if not urls_to_submit:
        print("[!] Aucune URL trouvée. Spécifiez une URL ou un sitemap.")
        sys.exit(1)

    # Dédoublonnage
    urls_to_submit = list(dict.fromkeys(urls_to_submit))

    success = submit_to_indexnow(
        host=args.host,
        key=key,
        key_location=key_location,
        url_list=urls_to_submit,
        dry_run=args.dry_run
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
