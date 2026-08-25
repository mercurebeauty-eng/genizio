#!/usr/bin/env python3
"""
SEO Post-Deployment Production Verifier (Step 4 of SEO Loop).

Audits the actual LIVE production HTML to verify that what Google crawlers see
matches the source code expectations (SSR, hydration, meta tags, schemas, canonicals).

Usage:
    python scripts/seo/live_verify.py https://www.genizio.com/guides/test-de-personnalite-enfant-talents
    python scripts/seo/live_verify.py /guides/test-de-personnalite-enfant-talents --domain https://www.genizio.com
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse
import urllib.request
import urllib.error

# Force UTF-8 on stdout/stderr for Windows console
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")


def fetch_live_page(url: str, timeout: int = 15) -> Dict:
    """Effectue une requête HTTP live en simulant un crawler / navigateur standard."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 AntigravitySEO/2.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    
    start_time = time.time()
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            latency_ms = round((time.time() - start_time) * 1000)
            status_code = response.getcode()
            headers_dict = dict(response.info())
            raw_html = response.read().decode("utf-8", errors="replace")
            final_url = response.geturl()
            return {
                "success": True,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "final_url": final_url,
                "headers": headers_dict,
                "html": raw_html,
            }
    except urllib.error.HTTPError as e:
        latency_ms = round((time.time() - start_time) * 1000)
        return {
            "success": False,
            "status_code": e.code,
            "latency_ms": latency_ms,
            "error": f"HTTP Error {e.code}: {e.reason}",
            "html": e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else "",
        }
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000)
        return {
            "success": False,
            "status_code": 0,
            "latency_ms": latency_ms,
            "error": str(e),
            "html": "",
        }


def parse_rendered_seo_elements(html: str, target_url: str) -> Dict:
    """Extrait toutes les balises SEO du HTML de production."""
    elements = {
        "title": None,
        "meta_description": None,
        "canonical": None,
        "meta_robots": None,
        "h1": [],
        "og_title": None,
        "og_description": None,
        "og_image": None,
        "json_ld_schemas": [],
        "json_ld_raw": [],
        "has_ssr_content": len(html) > 1500,
    }

    if not html:
        return elements

    # Title
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match:
        elements["title"] = title_match.group(1).strip()

    # Meta Description
    desc_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if not desc_match:
        desc_match = re.search(r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']description["\']', html, re.IGNORECASE)
    if desc_match:
        elements["meta_description"] = desc_match.group(1).strip()

    # Canonical
    canon_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if not canon_match:
        canon_match = re.search(r'<link[^>]+href=["\']([^"\']*)["\'][^>]+rel=["\']canonical["\']', html, re.IGNORECASE)
    if canon_match:
        elements["canonical"] = canon_match.group(1).strip()

    # Robots
    robots_match = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if robots_match:
        elements["meta_robots"] = robots_match.group(1).strip()

    # H1
    h1_matches = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    for h in h1_matches:
        cleaned = re.sub(r"<[^>]+>", "", h).strip()
        if cleaned:
            elements["h1"].append(cleaned)

    # OpenGraph
    og_t = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if og_t:
        elements["og_title"] = og_t.group(1).strip()
    og_d = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if og_d:
        elements["og_description"] = og_d.group(1).strip()
    og_i = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if og_i:
        elements["og_image"] = og_i.group(1).strip()

    # JSON-LD Schemas
    json_ld_matches = re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.IGNORECASE | re.DOTALL)
    for block in json_ld_matches:
        try:
            data = json.loads(block.strip())
            elements["json_ld_raw"].append(data)
            t = data.get("@type")
            if t:
                elements["json_ld_schemas"].append(t)
        except Exception:
            pass

    return elements


def audit_live_page(url: str) -> Dict:
    """Exécute l'audit complet du rendu de production."""
    fetch_res = fetch_live_page(url)
    if not fetch_res["success"]:
        return {
            "url": url,
            "status": "FAILED",
            "http_status": fetch_res["status_code"],
            "latency_ms": fetch_res["latency_ms"],
            "error": fetch_res.get("error", "Échec de connexion"),
            "checks": {"http_200": False},
        }

    parsed = parse_rendered_seo_elements(fetch_res["html"], url)
    checks = []
    errors = []
    warnings = []

    # 1. HTTP Status
    if fetch_res["status_code"] == 200:
        checks.append(f"HTTP Status 200 OK ({fetch_res['latency_ms']} ms)")
    else:
        errors.append(f"Statut HTTP inattendu : {fetch_res['status_code']}")

    # 2. Title
    if parsed["title"]:
        checks.append(f"Title rendu : '{parsed['title']}' ({len(parsed['title'])} car.)")
    else:
        errors.append("Balise <title> manquante ou vide dans le HTML live.")

    # 3. Meta Description
    if parsed["meta_description"]:
        checks.append(f"Meta description rendue ({len(parsed['meta_description'])} car.)")
    else:
        errors.append("Meta description manquante dans le HTML live.")

    # 4. Canonical
    if parsed["canonical"]:
        checks.append(f"Canonical URL rendue : '{parsed['canonical']}'")
        if not parsed["canonical"].startswith("http"):
            warnings.append("L'URL canonique doit être absolue (avec https://).")
    else:
        errors.append("Balise <link rel='canonical'> manquante dans le HTML live.")

    # 5. Robots
    if parsed["meta_robots"]:
        if "noindex" in parsed["meta_robots"].lower():
            errors.append(f"ATTENTION : Directive 'noindex' détectée dans robots ({parsed['meta_robots']}) !")
        else:
            checks.append(f"Meta robots valide : '{parsed['meta_robots']}'")
    else:
        checks.append("Meta robots absent (par défaut : index, follow).")

    # 6. H1
    if len(parsed["h1"]) == 1:
        checks.append(f"H1 unique confirmé : '{parsed['h1'][0]}'")
    elif len(parsed["h1"]) > 1:
        warnings.append(f"Plusieurs balises H1 détectées ({len(parsed['h1'])}).")
    else:
        warnings.append("Aucune balise <h1> explicite détectée dans le HTML initial.")

    # 7. JSON-LD
    if parsed["json_ld_schemas"]:
        checks.append(f"Données structurées JSON-LD actives : {', '.join(parsed['json_ld_schemas'])}")
    else:
        warnings.append("Aucun bloc Schema JSON-LD trouvé dans le HTML live.")

    status = "PASSED" if not errors else "BLOCKED"

    return {
        "url": url,
        "status": status,
        "http_status": fetch_res["status_code"],
        "latency_ms": fetch_res["latency_ms"],
        "elements": parsed,
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description="SEO Post-Deployment Production Verifier")
    parser.add_argument("url", help="URL complète en production (ex: https://www.genizio.com/guides/...)")
    parser.add_argument("--domain", default="https://www.genizio.com", help="Domaine de base si un chemin relatif est fourni")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")

    args = parser.parse_args()

    target_url = args.url
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = urljoin(args.domain, target_url)

    result = audit_live_page(target_url)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result["status"] == "PASSED" else 1)

    color = "\033[92m" if result["status"] == "PASSED" else "\033[91m"
    reset = "\033[0m"

    print("=" * 75)
    print("🌐 VÉRIFICATION LIVE EN PRODUCTION (SEO POST-DEPLOYMENT)")
    print(f"URL ciblée : {result['url']}")
    print(f"Statut : {color}>>> {result['status']} <<<{reset} (Réponse {result['http_status']} en {result.get('latency_ms', 0)}ms)")
    print("=" * 75)

    if result.get("checks"):
        print("\n✅ ÉLÉMENTS VALIDÉS EN PRODUCTION :")
        for c in result["checks"]:
            print(f"  ✓ {c}")

    if result.get("warnings"):
        print("\n⚠️ AVERTISSEMENTS :")
        for w in result["warnings"]:
            print(f"  • {w}")

    if result.get("errors"):
        print("\n❌ ANOMALIES CRITIQUES :")
        for e in result["errors"]:
            print(f"  • {e}")

    print("\n" + "=" * 75)
    sys.exit(0 if result["status"] == "PASSED" else 1)


if __name__ == "__main__":
    main()
