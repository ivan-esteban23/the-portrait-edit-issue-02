import { promptSchema } from "./schema";
export * from "./issues";
export const prompts = Object.values(
  import.meta.glob("./prompts/*.json", { eager: true, import: "default" }),
)
  .map((data) => promptSchema.parse(data))
  .sort((a, b) => a.studyNumber - b.studyNumber);
