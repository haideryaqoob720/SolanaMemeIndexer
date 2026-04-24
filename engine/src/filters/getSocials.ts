export async function getSocials(uri?: string): Promise<string[]> {
  let socials: string[] = [];
  if (uri) {
    const response = await fetch(uri);
    if (response.ok) {
      const data = await response.json();
      socials = filterObjectKeys(data);
    }
  }
  return socials;
}
function filterObjectKeys(obj: Record<string, any>): string[] {
  const socialkeys = ["twitter", "telegram", "x", "website"];
  return Object.entries(obj)
    .filter(([key]) => socialkeys.includes(key))
    .map(([, value]) => value as string)
    .filter((value) => typeof value === "string");
}
