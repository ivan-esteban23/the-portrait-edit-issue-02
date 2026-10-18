import type { Prompt } from "./schema";
export * from "./issues";
export const promptLoadErrors: Array<{ file: string; error: string }> = [];
export const prompts = Object.entries(
  import.meta.glob("./prompts/*.json", { eager: true, import: "default" }),
)
  .flatMap(([file, data]) => {
    try {
      if (
        typeof data !== "object" ||
        data === null ||
        !("id" in data) ||
        typeof data.id !== "string" ||
        !data.id.trim() ||
        !("prompt" in data) ||
        typeof data.prompt !== "string" ||
        !data.prompt.trim()
      ) {
        throw new Error("Expected a study with nonempty id and prompt fields");
      }
      return [data as Prompt];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      promptLoadErrors.push({ file, error: message });
      console.warn(`Skipping invalid prompt ${file}: ${message}`);
      return [];
    }
  })
  .sort((a, b) => a.studyNumber - b.studyNumber);
