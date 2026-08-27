#!/usr/bin/env python3
"""
Batch Google Search Console URL Inspector.
Inspects all URLs in public/sitemap.xml using the GSC URL Inspection API.
"""

import json
import re
import subprocess
import sys
import time
from pathlib import Path

# Force UTF-8 encoding for Windows terminal
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

def get_sitemap_urls():
    sitemap_path = Path("public/sitemap.xml")
    if not sitemap_path.exists():
        print("Erreur: public/sitemap.xml introuvable.")
        sys.exit(1)
    
    content = sitemap_path.read_text(encoding="utf-8")
    urls = re.findall(r"<loc>(https://www\.genizio\.com/[^<]*)</loc>", content)
    return urls

def inspect_url(url: str):
    runtime_script = r"C:\Users\USER\.gemini\config\plugins\claude-seo\scripts\runtime.py"
    cmd = [
        "python",
        runtime_script,
        "run",
        "gsc_inspect.py",
        url,
        "--json",
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if res.returncode == 0:
            return json.loads(res.stdout)
        else:
            return {"error": res.stderr.strip() or "Erreur inconnue"}
    except Exception as e:
        return {"error": str(e)}

def main():
    urls = get_sitemap_urls()
    print(f"\n🚀 Démarrage de l'inspection automatique GSC pour {len(urls)} URLs...\n")
    print(f"{'URL':<60} | {'Statut Index':<12} | {'Fils d Ariane':<14} | {'Dernier Crawl'}")
    print("-" * 115)

    for i, url in enumerate(urls, 1):
        data = inspect_url(url)

        if "error" in data and data["error"]:
            print(f"{url:<60} | {'ERREUR':<12} | {'-':<14} | {data['error'][:25]}")
            continue

        verdict = data.get("index_status", {}).get("verdict", "N/A")
        coverage = data.get("index_status", {}).get("coverage_state", "N/A")
        last_crawl = data.get("index_status", {}).get("last_crawl_time", "Non crawlé")
        if last_crawl and "T" in last_crawl:
            last_crawl = last_crawl.split("T")[0]

        rich_results = data.get("rich_results") or {}
        detected_items = rich_results.get("detected_items") or []
        detected = [item.get("type", "") for item in detected_items if isinstance(item, dict)]
        has_breadcrumbs = "OUI (PASS)" if "Breadcrumbs" in detected else "NON"

        status_display = "INDEXÉ" if verdict == "PASS" else coverage[:12]
        print(f"{url:<60} | {status_display:<12} | {has_breadcrumbs:<14} | {last_crawl}")
        time.sleep(0.3)

    print("\n✅ Inspection par lot terminée avec succès.")

if __name__ == "__main__":
    main()
