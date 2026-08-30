export function sanitizeUsername(input: string): string {
  // Allow only a-z, 0-9, and underscore
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9_]/g, "") // remove everything else
    .substring(0, 20); // max 20 chars
}

export function generateSuggestedUsername(name: string): string {
  const sanitized = sanitizeUsername(name);
  if (!sanitized) return "";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString(); // 4 random digits
  return `${sanitized}_${randomSuffix}`.substring(0, 20);
}
