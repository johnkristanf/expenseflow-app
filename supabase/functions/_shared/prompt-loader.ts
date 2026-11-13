// @ts-nocheck — Deno Edge Function: runtime globals (Deno) provided by Deno runtime.
const promptCache = new Map<string, string>();

/**
 * Loads a markdown prompt file relative to the `prompts/` directory.
 * Caches loaded templates in-memory for subsequent invocations within the same worker.
 */
export async function loadPrompt(fileName: string): Promise<string> {
  const cleanName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;

  if (promptCache.has(cleanName)) {
    return promptCache.get(cleanName)!;
  }

  try {
    const fileUrl = new URL(`./prompts/${cleanName}`, import.meta.url);
    const content = await Deno.readTextFile(fileUrl);
    promptCache.set(cleanName, content);
    return content;
  } catch (err) {
    console.error(`Failed to load markdown prompt "${cleanName}":`, err);
    throw new Error(`Could not load prompt markdown file: ${cleanName}`);
  }
}

/**
 * Replaces `{{variable}}` template placeholders in a markdown string.
 */
export function renderPrompt(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}
