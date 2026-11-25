import { Component, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Arcade, GamePage } from "./pages/Arcade";
import { Join, SignIn } from "./pages/Auth";
import { Boards, CirclePage, Circles, NewCircle, ThreadPage } from "./pages/Community";
import { DailiesPage } from "./pages/Dailies";
import { DeskHome, DeskItems, DeskKeepers, DeskLedger, DeskReports } from "./pages/Desk";
import { About, Missing, Privacy, Rules } from "./pages/Info";
import { Home } from "./pages/Home";
import { Adopt, Hatchery, PetPage, Pets } from "./pages/Pets";
import { KeeperPage } from "./pages/Profile";
import { SatchelPage } from "./pages/Satchel";
import { ShopDirectory, ShopPage } from "./pages/Shops";
import { ListingPage, TradeBoard } from "./pages/Trades";
import { LandPage, Lands } from "./pages/World";
import { TownProvider } from "./state/Town";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <div className="boot-error card"><h1>The lamps flickered</h1><p>Refresh the quay and try that path again.</p></div>;
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <Boundary>
      <TownProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="join" element={<Join />} />
            <Route path="sign-in" element={<SignIn />} />
            <Route path="pets" element={<Pets />} />
            <Route path="pets/:id" element={<PetPage />} />
            <Route path="create" element={<Hatchery />} />
            <Route path="adopt" element={<Adopt />} />
            <Route path="satchel" element={<SatchelPage />} />
            <Route path="lands" element={<Lands />} />
            <Route path="lands/:slug" element={<LandPage />} />
            <Route path="shops" element={<ShopDirectory />} />
            <Route path="shops/:slug" element={<ShopPage />} />
            <Route path="greenboard" element={<TradeBoard />} />
            <Route path="greenboard/:id" element={<ListingPage />} />
            <Route path="arcade" element={<Arcade />} />
            <Route path="arcade/:slug" element={<GamePage />} />
            <Route path="dailies" element={<DailiesPage />} />
            <Route path="boards" element={<Boards />} />
            <Route path="boards/:slug" element={<ThreadPage />} />
            <Route path="boards/:slug/:threadId" element={<ThreadPage />} />
            <Route path="circles" element={<Circles />} />
            <Route path="circles/new" element={<NewCircle />} />
            <Route path="circles/:slug" element={<CirclePage />} />
            <Route path="keepers/:username" element={<KeeperPage />} />
            <Route path="desk" element={<DeskHome />} />
            <Route path="desk/keepers" element={<DeskKeepers />} />
            <Route path="desk/items" element={<DeskItems />} />
            <Route path="desk/reports" element={<DeskReports />} />
            <Route path="desk/ledger" element={<DeskLedger />} />
            <Route path="about" element={<About />} />
            <Route path="rules" element={<Rules />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="*" element={<Missing />} />
          </Route>
        </Routes>
      </TownProvider>
    </Boundary>
  );
}
