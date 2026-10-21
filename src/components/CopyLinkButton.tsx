import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/content";
import { useLanguage } from "@/i18n/LanguageProvider";
import { copyText } from "@/lib/utils";
import { Button } from "./ui/button";
import { Icon } from "./ui/Icon";

export function CopyLinkButton({
  path,
  label = "Copy link",
  iconOnly = false,
}: {
  path: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const { t } = useLanguage();
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const request = useRef(0);
  const url = new URL(assetUrl(path.replace(/^\//, "")), window.location.origin)
    .href;

  useEffect(() => {
    setState("idle");
    return () => {
      request.current += 1;
    };
  }, [url]);

  async function copyLink() {
    const current = ++request.current;
    try {
      await copyText(url);
      if (current === request.current) setState("copied");
    } catch {
      if (current === request.current) setState("manual");
    }
  }

  return (
    <div className="copy-link-control">
      <Button
        variant="ghost"
        onClick={copyLink}
        aria-label={t(label)}
        title={t(label)}
      >
        {iconOnly ? <Icon name="copy" /> : t(label)}
      </Button>
      <div
        className={`copy-link-details${state !== "idle" ? " is-visible" : ""}`}
      >
        <span className="copy-link-feedback" role="status">
          {state === "copied"
            ? t("Link copied")
            : state === "manual"
              ? t("Select and copy this link")
              : ""}
        </span>
        {state === "manual" && (
          <input
            aria-label={t("Link to copy")}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </div>
    </div>
  );
}
