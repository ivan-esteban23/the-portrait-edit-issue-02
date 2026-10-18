import type { CommandParameter } from "@/lib/promptFormatter";

export function CommandParameters({
  parameters,
  enabled,
  onChange,
  hint,
}: {
  parameters: readonly CommandParameter[];
  enabled: readonly string[];
  onChange: (keys: string[]) => void;
  hint?: string;
}) {
  if (!parameters.length) return null;
  return (
    <fieldset className="command-parameters">
      <legend>Command parameters</legend>
      <p>{hint || "Choose flags for Discord and Midjourney copies."}</p>
      <div className="command-parameter-options">
        {parameters.map(({ key, value }) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={enabled.includes(key)}
              onChange={() =>
                onChange(
                  enabled.includes(key)
                    ? enabled.filter((item) => item !== key)
                    : [...enabled, key],
                )
              }
            />
            <span>
              --{key}
              {value ? ` ${value}` : ""}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
