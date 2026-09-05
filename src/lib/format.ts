// Format monétaire FCFA (audit UI V3.1) — module PUR séparé d'
// admin-os.functions.ts (serveur) pour usage client sans tirer le module.
export function formatXOF(amount: number | null | undefined): string {
  if (
    amount === null ||
    amount === undefined ||
    typeof amount !== "number" ||
    Number.isNaN(amount)
  ) {
    return "0 FCFA";
  }
  const formatted = new Intl.NumberFormat("fr-FR").format(amount);
  return `${formatted} FCFA`;
}
