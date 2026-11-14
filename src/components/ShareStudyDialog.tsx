import { IconText } from "@/components/ui/IconText";
import { useRef, useState } from "react";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { ModalContent, ModalTitle } from "./ui/dialog";
import { copyText } from "@/lib/utils";
import { responsiveImageProps } from "@/lib/responsiveImages";
export function ShareStudyDialog({
  prompt,
  onClose,
}: {
  prompt: Prompt;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null),
    [portrait, setPortrait] = useState(false),
    [feedback, setFeedback] = useState("");
  const url = new URL(
    `${import.meta.env.BASE_URL}prompts/${prompt.id}`,
    window.location.origin,
  ).href;
  return (
    <ModalContent
      isOpen
      onClose={onClose}
      overlayClassName="library-dialog-overlay"
      className="share-study-dialog"
      initialFocus={close}
    >
      <header>
        <div>
          <p className="eyebrow">Share a study</p>
          <ModalTitle>{prompt.title}</ModalTitle>
        </div>
        <button ref={close} onClick={onClose}>
          Close ×
        </button>
      </header>
      <div className="share-layout-tabs">
        <button aria-pressed={!portrait} onClick={() => setPortrait(false)}>
          Link preview
        </button>
        <button aria-pressed={portrait} onClick={() => setPortrait(true)}>
          Portrait / Pinterest
        </button>
      </div>
      {portrait ? (
        <div className="share-portrait-card">
          <img
            {...responsiveImageProps(prompt.referenceImage, "detail")}
            alt={prompt.title}
          />
          <h3>{prompt.title}</h3>
          <p>
            The Portrait Edit / Study{" "}
            {String(prompt.studyNumber).padStart(3, "0")}
          </p>
        </div>
      ) : (
        <img
          className="share-landscape"
          src={assetUrl(`social/studies/${prompt.id}.jpg`)}
          alt={`${prompt.title} portrait and publication sharing card`}
          width="1200"
          height="630"
        />
      )}
      <p className="share-design-note">
        {portrait
          ? "A portrait format reference for image-led sharing. Platforms choose how to display a link."
          : "Each study has its own 1200 × 630 sharing card. Platforms may crop images or retain an earlier preview."}
      </p>
      <label>
        Public study link
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="share-dialog-actions">
        <button
          onClick={async () => {
            try {
              await copyText(url);
              setFeedback("Study link copied.");
            } catch {
              setFeedback("Select the link above to copy.");
            }
          }}
        >
          Copy study link
        </button>
        <a
          href={assetUrl(`social/studies/${prompt.id}.jpg`)}
          download={`portrait-edit-${prompt.id}.jpg`}
        >
          <IconText>Download sharing card ↓</IconText>
        </a>
      </div>
      <p role="status">{feedback}</p>
    </ModalContent>
  );
}
