import { Link, useParams } from "react-router-dom";
import { GAMES, LANDS, SHOPS, SPECIES, landBySlug } from "../data/catalog";
import { PetPortrait } from "../components/PetPortrait";
import { useTown } from "../state/Town";

const CLASS: Record<string, string> = { harborlight: "harbor", mossglen: "moss", cinderreach: "cinder", silvershoal: "shoal" };

export function Lands() {
  return (
    <div>
      <p className="kicker">World map</p>
      <h1>Four ferry hops</h1>
      <p>No toll in this season. Pick a land and the lamps change color.</p>
      <div className="grid-2">
        {LANDS.map((land) => (
          <Link key={land.slug} to={`/lands/${land.slug}`} className={`card land-tile land-${CLASS[land.slug]}`}>
            <strong>{land.name}</strong>
            <span>{land.tagline}</span>
            <p>{land.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function LandPage() {
  const { slug = "" } = useParams();
  const { profile } = useTown();
  const land = LANDS.find((item) => item.slug === slug);
  if (!land) return <div className="card"><h1>Unknown land</h1></div>;
  const shop = SHOPS.find((item) => item.land === land.slug);
  const residents = SPECIES.filter((species) => species.home === land.slug && (!species.exclusive || profile?.isAdmin));
  const links = attractions(land.slug);
  return (
    <div className="stack">
      <section className={`card land-${CLASS[land.slug]}`}>
        <p className="kicker">{land.tagline}</p>
        <h1>{land.name}</h1>
        <p>{land.blurb}</p>
      </section>
      <div className="nest-grid">
        {residents.map((species) => (
          <article key={species.slug} className="nest-card">
            <div className="pet-frame"><PetPortrait species={species.slug} alt={species.name} /></div>
            <h3>{species.name}</h3>
            <p className="muted">{species.blurb}</p>
          </article>
        ))}
      </div>
      <div className="row-actions">
        <Link className="btn" to={`/lands/${land.slug}/town`}>Walk the town</Link>
        {land.slug === "cinderreach" && <Link className="btn secondary" to="/ring">Ember Ring</Link>}
        {shop && <Link className="btn secondary" to={`/shops/${shop.slug}`}>{shop.name}</Link>}
        {links.map((link) => <Link key={link.to} className="btn secondary" to={link.to}>{link.label}</Link>)}
      </div>
    </div>
  );
}

function attractions(slug: string) {
  if (slug === "harborlight") {
    return [
      { to: "/arcade/lantern-catch", label: "Lantern Catch" },
      { to: "/arcade/parcel-sort", label: "Parcel Sort" },
      { to: "/greenboard", label: "Greenboard" },
      { to: "/boards", label: "Quay Boards" },
      { to: "/dailies", label: "Morning Wick" },
      { to: "/create", label: "Hatchery" },
      { to: "/adopt", label: "Open Nest" },
    ];
  }
  if (slug === "mossglen") return [{ to: "/shops/teacup-porch", label: "Teacup Porch" }, { to: "/boards/companions", label: "A quiet nook on the boards" }];
  if (slug === "cinderreach") return [{ to: "/shops/emberoven", label: "Emberoven" }, { to: "/arcade", label: "Arcade, if the cliffs get loud" }];
  return [{ to: "/dailies", label: "Tide Bowl" }, { to: "/arcade/shoal-pairs", label: "Shoal Pairs" }, { to: "/shops/shell-and-string", label: "Shell & String" }];
}

void landBySlug;
void GAMES;
