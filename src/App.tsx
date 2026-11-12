import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HomePage, HubPage } from './pages/HomePage';
import { SectionPage } from './pages/SectionPage';
import { CoursPage } from './pages/CoursPage';
import { PackPage } from './pages/PackPage';
import { ReviewPage } from './pages/ReviewPage';
import { ProgressPage } from './pages/ProgressPage';
import { SessionPage } from './pages/SessionPage';
import { dueItems, useProgress } from './lib/storage';
import { Icon } from './components/Icons';

type Item = { to: string; label: string; icon: string; end?: boolean; badge?: number };

function Side({ due }: { due: number }) {
  const groups: { title?: string; items: Item[] }[] = [
    { items: [{ to: '/', label: 'Accueil', icon: 'home', end: true }] },
    {
      title: 'Apprendre',
      items: [
        { to: '/grammaire', label: 'Grammaire', icon: 'grammaire' },
        { to: '/verbes', label: 'Verbes', icon: 'verbes' },
        { to: '/vocabulaire', label: 'Vocabulaire', icon: 'vocabulaire' },
      ],
    },
    {
      title: 'Pratiquer',
      items: [
        { to: '/lecture', label: 'Lire', icon: 'lecture' },
        { to: '/ecoute', label: 'Écouter', icon: 'ecoute' },
        { to: '/ecriture', label: 'Écrire', icon: 'ecriture' },
        { to: '/oral', label: 'Parler', icon: 'oral' },
      ],
    },
    {
      title: 'Mon suivi',
      items: [
        { to: '/cours', label: 'Mes cours', icon: 'cours' },
        { to: '/revision', label: 'Révision', icon: 'revision', badge: due },
        { to: '/progres', label: 'Progrès', icon: 'progres' },
      ],
    },
  ];
  return (
    <nav className="side" aria-label="Navigation principale">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          D
        </span>
        <span>Deutsch B1</span>
      </div>
      {groups.map((g, i) => (
        <div key={i} className="side-group">
          {g.title && <p className="side-title">{g.title}</p>}
          <ul>
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <Icon name={it.icon} />
                  <span>{it.label}</span>
                  {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const LEARN_PATHS = ['/apprendre', '/grammaire', '/verbes', '/vocabulaire'];
const SKILL_PATHS = ['/pratiquer', '/lecture', '/ecoute', '/ecriture', '/oral'];

function Bottom({ due }: { due: number }) {
  const { pathname } = useLocation();
  const items: (Item & { match?: string[] })[] = [
    { to: '/', label: 'Accueil', icon: 'home', end: true },
    { to: '/apprendre', label: 'Apprendre', icon: 'apprendre', match: LEARN_PATHS },
    { to: '/pratiquer', label: 'Pratiquer', icon: 'pratiquer', match: SKILL_PATHS },
    { to: '/cours', label: 'Cours', icon: 'cours' },
    { to: '/revision', label: 'Révision', icon: 'revision', badge: due },
  ];
  return (
    <nav className="bottom" aria-label="Navigation">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) => (isActive || it.match?.includes(pathname) ? 'active' : '')}
        >
          <Icon name={it.icon} size={22} />
          <span>{it.label}</span>
          {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function Shell() {
  const due = dueItems(useProgress()).length;
  return (
    <div className="app">
      <ScrollTop />
      <Side due={due} />
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/apprendre" element={<HubPage kind="apprendre" />} />
          <Route path="/pratiquer" element={<HubPage kind="pratiquer" />} />
          <Route path="/seance" element={<SessionPage />} />
          <Route path="/cours" element={<CoursPage />} />
          <Route path="/grammaire" element={<SectionPage section="grammaire" />} />
          <Route path="/verbes" element={<SectionPage section="verbes" />} />
          <Route path="/vocabulaire" element={<SectionPage section="vocabulaire" />} />
          <Route path="/lecture" element={<SectionPage section="lecture" />} />
          <Route path="/ecoute" element={<SectionPage section="ecoute" />} />
          <Route path="/ecriture" element={<SectionPage section="ecriture" />} />
          <Route path="/oral" element={<SectionPage section="oral" />} />
          <Route path="/pack/:id" element={<PackPage />} />
          <Route path="/revision" element={<ReviewPage />} />
          <Route path="/progres" element={<ProgressPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Bottom due={due} />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
