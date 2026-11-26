import { useEffect, useState } from "react";
import { portraitUrl } from "../lib/recolor";

export function speciesSrc(slug: string) {
  return `${import.meta.env.BASE_URL}art/species/${slug}.png`;
}

export function PetPortrait({
  species,
  tint = "natural",
  alt,
  className,
}: {
  species: string;
  tint?: string;
  alt: string;
  className?: string;
}) {
  const src = speciesSrc(species);
  const [url, setUrl] = useState(src);
  useEffect(() => {
    let cancel = false;
    portraitUrl(src, species, tint)
      .then((next) => {
        if (!cancel) setUrl(next);
      })
      .catch(() => {
        if (!cancel) setUrl(src);
      });
    return () => {
      cancel = true;
    };
  }, [src, species, tint]);
  return <img className={className ?? "pet-img"} src={url} alt={alt} loading="lazy" decoding="async" />;
}
