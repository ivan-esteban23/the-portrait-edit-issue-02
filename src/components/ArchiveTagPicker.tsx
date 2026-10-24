import { useRef, useState } from "react";
import { ModalContent, ModalTitle } from "./ui/dialog";
import { Button } from "./ui/button";

type Tag = { name: string; count: number };

export function ArchiveTagPicker({
  tags,
  selected,
  onSelect,
  onClose,
}: {
  tags: Tag[];
  selected: string;
  onSelect: (tag: string) => void;
  onClose: () => void;
}) {
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const term = query.trim().replace(/^#/, "").toLocaleLowerCase();
  const matches = tags.filter(({ name }) =>
    name.toLocaleLowerCase().includes(term),
  );
  return (
    <ModalContent
      isOpen
      onClose={onClose}
      overlayClassName="tag-picker-overlay"
      className="tag-picker"
      initialFocus={search}
    >
      <div className="tag-picker-heading">
        <ModalTitle>Browse tags</ModalTitle>
        <Button variant="ghost" onClick={onClose} aria-label="Close tag picker">
          Close ×
        </Button>
      </div>
      <label className="tag-picker-search">
        Find a tag
        <input
          ref={search}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search all tags"
        />
      </label>
      <p role="status" className="tag-picker-count">
        {matches.length} of {tags.length} tags
      </p>
      <div
        id="archive-extra-tags"
        className="tag-picker-list"
        role="group"
        aria-label="All tags"
      >
        {matches.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            className={`tag-pill ${selected === name ? "is-active" : ""}`}
            aria-pressed={selected === name}
            onClick={() => onSelect(selected === name ? "" : name)}
          >
            #{name} <span className="tag-pill-count">({count})</span>
          </button>
        ))}
        {!matches.length && (
          <p>No matching tags. Try another word or clear your search.</p>
        )}
      </div>
      <div className="tag-picker-footer">
        <p>
          {selected
            ? `Selected: #${selected}`
            : "Choose a tag to filter studies."}
        </p>
        <div>
          <Button
            variant="ghost"
            disabled={!selected}
            onClick={() => onSelect("")}
          >
            Clear tag
          </Button>
          <Button variant="default" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </ModalContent>
  );
}
