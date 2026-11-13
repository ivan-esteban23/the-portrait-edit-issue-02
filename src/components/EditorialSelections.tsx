import { responsiveImageProps } from "@/lib/responsiveImages";
import { Link } from "react-router-dom";
import { cardImageUrl, prompts } from "@/content";
import { editorialSelections } from "@/content/editorialSelections";

export function EditorialSelections({
  active = "",
  search = "",
}: {
  active?: string;
  search?: string;
}) {
  return (
    <section className="editorial-discovery" aria-label="Editorial selections">
      <div className="section-title">
        <div>
          <p className="eyebrow">01 / Four ways into the collection</p>
          <h2>Follow your curiosity.</h2>
        </div>
      </div>
      <div className="editorial-selection-grid">
        {editorialSelections.map((selection, index) => {
          const hero = prompts.find((p) => p.studyNumber === selection.hero)!;
          const params = new URLSearchParams(search);
          params.set("selection", selection.id);
          return (
            <Link
              key={selection.id}
              className="editorial-selection"
              to={`/prompts?${params}`}
              aria-current={active === selection.id ? "true" : undefined}
            >
              <div className="editorial-selection-image">
                <img
                  src={cardImageUrl(hero.referenceImage)}
                  {...responsiveImageProps(hero.referenceImage, "selection")}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>
                {selection.title}
                <span aria-hidden="true">↗</span>
              </h3>
              <p>{selection.subtitle}</p>
              <span className="selection-count">
                {selection.numbers.length} selected studies
              </span>
            </Link>
          );
        })}
      </div>
      <p className="editorial-selection-note">
        Editorial selections from the existing archive. A study may appear in
        more than one selection.
      </p>
    </section>
  );
}
