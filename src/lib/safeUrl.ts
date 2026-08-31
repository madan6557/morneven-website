export function safeNavigationUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  const hasControlCharacter = candidate
    ? Array.from(candidate).some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      })
    : false;
  if (!candidate || candidate.startsWith("//") || candidate.includes("\\") || hasControlCharacter) {
    return null;
  }

  if (candidate.startsWith("/")) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
