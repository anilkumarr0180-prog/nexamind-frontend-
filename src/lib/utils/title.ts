/**
 * Deterministically generates a clean, concise conversation title from the first user message.
 * Does not make any external or LLM requests.
 */
export function generateConversationTitle(message: string): string {
  if (!message || typeof message !== "string") {
    return "New Chat";
  }

  // 1. Remove code blocks and inline code markers
  let text = message
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1");

  // 2. Remove markdown headings, blockquotes, bullets, and numbering
  text = text
    .replace(/^[\s#*>-]+/gm, " ")
    .replace(/^\s*\d+\.\s+/gm, " ")
    .replace(/[*_~]/g, "");

  // 3. Collapse multiple whitespace and newlines into a single space
  text = text.replace(/\s+/g, " ").trim();

  if (!text) {
    return "New Chat";
  }

  // 4. If query has a question mark or sentence boundary within reasonable length, capture that
  const sentenceBoundary = text.search(/[.?!](\s|$)/);
  if (sentenceBoundary > 8 && sentenceBoundary <= 60) {
    text = text.slice(0, sentenceBoundary + (text[sentenceBoundary] === "?" ? 1 : 0));
  } else if (text.length > 55) {
    // Truncate at whole word boundary within 55 characters
    const slice = text.slice(0, 55);
    const lastSpace = slice.lastIndexOf(" ");
    text = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  }

  // Clean trailing punctuation
  text = text.replace(/[,:;\s-]+$/, "").trim();

  if (!text) {
    return "New Chat";
  }

  // Capitalize first character
  return text.charAt(0).toUpperCase() + text.slice(1);
}
