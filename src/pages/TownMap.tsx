import { Link, useParams } from "react-router-dom";
import { LANDS, SHOPS } from "../data/catalog";
import { TOWNS } from "../data/towns";

export function TownPicker() {
  return (
    <div>
      <p className="kicker">Towns</p>
      <h1>Click a town, then a door</h1>
      <p>Each land is a little street of shops. The signs are blank until you hover them.</p>
      <div className="grid-2">
        {TOWNS.map((town) => (
          <Link key={town.slug} to={`/lands/${town.slug}/town`} className={`card land-tile land-${town.slug === "harborlight" ? "harbor" : town.slug === "mossglen" ? "moss" : town.slug === "cinderreach" ? "cinder" : "shoal"}`}>
            <strong>{town.name}</strong>
            <span>{LANDS.find((land) => land.slug === town.slug)?.tagline}</span>
            <p className="muted">{town.spots.length} doors</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function TownMap() {
  const { slug = "" } = useParams();
  const town = TOWNS.find((item) => item.slug === slug);
  const land = LANDS.find((item) => item.slug === slug);
  if (!town || !land) return <div className="card"><h1>That town is not on the ferry map</h1></div>;
  return (
    <div className="stack">
      <div>
        <p className="kicker">{land.tagline}</p>
        <h1>{land.name}</h1>
        <p>Hover a building to read its sign. On a small screen, use the list under the map.</p>
        {slug === "cinderreach" && <p><Link to="/ring">The Ember Ring is up the cliff path.</Link></p>}
      </div>
      <div className="town-map">
        <img src={`${import.meta.env.BASE_URL}art/towns/${town.slug}.jpg`} alt={`${land.name} town, with shop buildings and blank signs`} />
        {town.spots.map((spot) => {
          const shop = SHOPS.find((item) => item.slug === spot.shopSlug);
          return (
            <Link
              key={spot.shopSlug}
              className="hotspot"
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.w}%`, height: `${spot.h}%` }}
              to={`/shops/${spot.shopSlug}`}
              aria-label={`${shop?.name ?? spot.label}. ${spot.hint}`}
            >
              <span className="sign">{shop?.name ?? spot.label}</span>
              <span className="tip">{spot.hint}</span>
            </Link>
          );
        })}
      </div>
      <div className="town-fallback">
        {town.spots.map((spot) => {
          const shop = SHOPS.find((item) => item.slug === spot.shopSlug);
          return (
            <Link key={spot.shopSlug} className="btn secondary" to={`/shops/${spot.shopSlug}`}>
              {shop?.name ?? spot.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
