import { promptSchema } from "./schema";
export * from "./issues";
export const promptLoadErrors: Array<{ file: string; error: string }> = [];
export const prompts = Object.entries(
  import.meta.glob("./prompts/*.json", { eager: true, import: "default" }),
)
  .flatMap(([file, data]) => {
    try {
      return [promptSchema.parse(data)];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      promptLoadErrors.push({ file, error: message });
      console.warn(`Skipping invalid prompt ${file}: ${message}`);
      return [];
    }
  })
  .sort((a, b) => a.studyNumber - b.studyNumber);
