#!/usr/bin/env python3
"""
Assistant de configuration et de vérification Google Search Console & Google APIs.

Permet de :
1. Vérifier l'état de l'authentification Google (Tier 0, 1, 2).
2. Guider pas à pas pour créer un Service Account Google Cloud.
3. Configurer automatiquement le fichier ~/.config/claude-seo/google-api.json.
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Force UTF-8 on stdout/stderr for Windows console
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")

CONFIG_DIR = Path.home() / ".config" / "claude-seo"
CONFIG_FILE = CONFIG_DIR / "google-api.json"


def check_status() -> dict:
    """Vérifie l'état actuel de la configuration Google API."""
    result = {
        "config_exists": CONFIG_FILE.exists(),
        "config_path": str(CONFIG_FILE),
        "service_account_configured": False,
        "service_account_file_exists": False,
        "api_key_configured": False,
        "default_property": None,
        "client_email": None,
    }

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            sa_path = data.get("service_account_path")
            if sa_path:
                result["service_account_configured"] = True
                sa_file = Path(sa_path)
                if sa_file.exists():
                    result["service_account_file_exists"] = True
                    try:
                        with open(sa_file, "r", encoding="utf-8") as sf:
                            sa_data = json.load(sf)
                        result["client_email"] = sa_data.get("client_email")
                    except Exception:
                        pass
            if data.get("api_key"):
                result["api_key_configured"] = True
            result["default_property"] = data.get("default_property")
        except Exception as e:
            result["error"] = str(e)

    return result


def setup_service_account(sa_path: str, property_name: str = "sc-domain:genizio.com", api_key: str = None) -> bool:
    """Enregistre le chemin du service account dans le fichier de configuration."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    sa_file = Path(sa_path).resolve()

    if not sa_file.exists():
        print(f"❌ Erreur : Le fichier {sa_file} est introuvable.", file=sys.stderr)
        return False

    try:
        with open(sa_file, "r", encoding="utf-8") as f:
            sa_data = json.load(f)
        client_email = sa_data.get("client_email")
        if not client_email:
            print("⚠️ Attention : Aucun champ 'client_email' trouvé dans le JSON du Service Account.", file=sys.stderr)
    except Exception as e:
        print(f"❌ Erreur de lecture du Service Account : {e}", file=sys.stderr)
        return False

    existing_config = {}
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                existing_config = json.load(f)
        except Exception:
            existing_config = {}

    existing_config["service_account_path"] = str(sa_file)
    existing_config["default_property"] = property_name
    if api_key:
        existing_config["api_key"] = api_key

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_config, f, indent=2, ensure_ascii=False)

    print("=================================================================")
    print("✅ Configuration Google Search Console enregistrée avec succès !")
    print(f"📁 Fichier de configuration : {CONFIG_FILE}")
    print(f"🔑 Service Account : {sa_file}")
    if client_email:
        print(f"📧 Email du compte de service : {client_email}")
    print(f"🌐 Propriété GSC par défaut : {property_name}")
    print("=================================================================")
    print("👉 ÉTAPE FINALE OBLIGATOIRE :")
    print(f"1. Ouvrez Google Search Console : https://search.google.com/search-console")
    print(f"2. Sélectionnez la propriété '{property_name}'.")
    print("3. Allez dans 'Paramètres' > 'Utilisateurs et autorisations' > 'Ajouter un utilisateur'.")
    if client_email:
        print(f"4. Saisissez l'adresse : {client_email}")
    print("5. Accordez le rôle 'Lecteur' (ou 'Propriétaire' pour l'API d'indexation).")
    print("=================================================================")
    return True


def print_instructions():
    """Affiche le tutoriel pas à pas pour créer un Service Account Google Cloud."""
    print("""
===============================================================================
📘 GUIDE PAS À PAS : OBTENIR UN SERVICE ACCOUNT GOOGLE SEARCH CONSOLE (GSC)
===============================================================================

1. CRÉER UN PROJET GOOGLE CLOUD (100% Gratuit)
   - Rendez-vous sur : https://console.cloud.google.com/
   - Créez un nouveau projet (ex: "Genizio-SEO").

2. ACTIVER LES APIS NÉCESSAIRES
   - Dans le menu 'APIs & Services' > 'Bibliothèque' (Library), activez :
     • "Google Search Console API" (webmasters)
     • "Indexing API" (optionnel, pour l'indexation rapide)
     • "PageSpeed Insights API" (optionnel, avec API key)

3. CRÉER LE COMPTE DE SERVICE (SERVICE ACCOUNT)
   - Allez dans 'IAM & Admin' > 'Comptes de service' (Service Accounts).
   - Cliquez sur '+ CRÉER UN COMPTE DE SERVICE'.
   - Nom : "antigravity-seo-agent" -> Cliquez sur 'Créer et continuer' -> 'Terminer'.

4. TÉLÉCHARGER LA CLÉ JSON
   - Cliquez sur le compte de service créé dans la liste.
   - Allez dans l'onglet 'CLÉS' (Keys) > 'Ajouter une clé' > 'Créer une nouvelle clé'.
   - Choisissez le format 'JSON' et téléchargez le fichier.

5. ENREGISTRER DANS ANTIGRAVITY
   - Exécutez la commande :
     python scripts/seo/setup_gsc_auth.py --register "chemin/vers/votre_cle_service_account.json"

6. DONNER L'ACCÈS DANS GOOGLE SEARCH CONSOLE
   - Ouvrez https://search.google.com/search-console
   - 'Paramètres' > 'Utilisateurs et autorisations' > 'Ajouter un utilisateur'.
   - Collez l'adresse email du compte de service (ex: antigravity-seo-agent@...).
   - Rôle : 'Lecteur' ou 'Propriétaire'.
===============================================================================
""")


def main():
    parser = argparse.ArgumentParser(description="Configuration Google Search Console")
    parser.add_argument("--check", action="store_true", help="Vérifier la configuration actuelle")
    parser.add_argument("--guide", action="store_true", help="Afficher le guide de création du Service Account")
    parser.add_argument("--register", type=str, help="Chemin vers le fichier service_account.json téléchargé")
    parser.add_argument("--property", type=str, default="sc-domain:genizio.com", help="Propriété GSC (ex: sc-domain:genizio.com ou https://www.genizio.com)")
    parser.add_argument("--api-key", type=str, help="Clé API Google (optionnel, pour PageSpeed / CrUX)")
    parser.add_argument("--json", action="store_true", help="Sortie au format JSON")

    args = parser.parse_args()

    if args.register:
        success = setup_service_account(args.register, args.property, args.api_key)
        sys.exit(0 if success else 1)

    if args.guide:
        print_instructions()
        return

    status = check_status()
    if args.json:
        print(json.dumps(status, indent=2))
    else:
        print("=== ÉTAT DE L'AUTHENTIFICATION GOOGLE SEARCH CONSOLE ===")
        print(f"Fichier de configuration : {status['config_path']} ({'Présent' if status['config_exists'] else 'Absent'})")
        print(f"Service Account configuré : {'Oui' if status['service_account_configured'] else 'Non'}")
        print(f"Fichier Service Account valide : {'Oui' if status['service_account_file_exists'] else 'Non'}")
        if status.get("client_email"):
            print(f"Email Client : {status['client_email']}")
        print(f"Propriété par défaut : {status.get('default_property', 'Non configurée')}")
        print(f"Clé API configurée : {'Oui' if status['api_key_configured'] else 'Non'}")

        if not status["service_account_file_exists"]:
            print("\n💡 Pour configurer votre accès GSC, exécutez :")
            print("   python scripts/seo/setup_gsc_auth.py --guide")


if __name__ == "__main__":
    main()
