import type { CommandParameter } from "@/lib/promptFormatter";

export function CommandParameters({
  parameters,
  enabled,
  onChange,
  hint,
  isOptionalPreset = false,
}: {
  parameters: readonly CommandParameter[];
  enabled: readonly string[];
  onChange: (keys: string[]) => void;
  hint?: string;
  isOptionalPreset?: boolean;
}) {
  if (!parameters.length) return null;
  return (
    <fieldset
      className={`command-parameters${isOptionalPreset ? " is-optional-preset" : ""}`}
    >
      <legend>
        {isOptionalPreset
          ? "Optional command flags"
          : "Recorded command parameters"}
      </legend>
      <p>
        {hint ||
          "Recorded in the study. Uncheck flags to omit them when copying a command."}
      </p>
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
