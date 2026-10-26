import { Children, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

const arrows: Record<string, IconName> = {
  "↗": "arrow-up-right",
  "→": "arrow-right",
  "←": "arrow-left",
  "↓": "arrow-down",
  "↑": "arrow-up",
};

/** Keep translated labels and their accessible names; draw arrows without fonts. */
export function IconText({ children }: { children: ReactNode }) {
  return Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    return child.split(/([↗→←↓↑])/u).map((part, index) =>
      arrows[part] ? (
        <span className="text-icon" key={index}>
          <span className="sr-only">{part}</span>
          <Icon name={arrows[part]} />
        </span>
      ) : (
        part
      ),
    );
  });
}
