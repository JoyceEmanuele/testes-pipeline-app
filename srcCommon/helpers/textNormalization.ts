export function getNormalized (name: string) {
  if (!name) return name;
  // \u0030-\u0039 \u0061-\u007A
  name = name.trim().normalize('NFD').toLowerCase().replace(/[^-a-z0-9]/g, "-");
  name = name.replace(/-+/g, "-");
  name = name.replace(/^-+/, "");
  name = name.replace(/-+$/, "");
  return name;
}
