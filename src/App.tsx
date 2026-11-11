import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SectionPage } from './pages/SectionPage';
import { CoursPage } from './pages/CoursPage';
import { PackPage } from './pages/PackPage';
import { ReviewPage } from './pages/ReviewPage';
import { ProgressPage } from './pages/ProgressPage';
import { dueItems, useProgress } from './lib/storage';

function Nav() {
  const due = dueItems(useProgress()).length;
  const items = [
    { to: '/', label: 'Accueil', icon: '🏠', end: true },
    { to: '/cours', label: 'Mes cours', icon: '📚' },
    { to: '/grammaire', label: 'Grammaire', icon: '🧩' },
    { to: '/verbes', label: 'Verbes', icon: '🔁' },
    { to: '/vocabulaire', label: 'Vocabulaire', icon: '🗂️' },
    { to: '/revision', label: 'Révision', icon: '🧠', badge: due },
    { to: '/progres', label: 'Progrès', icon: '📈' },
  ];
  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="brand">
        <span className="flag" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>
          Deutsch <b>B1</b>
        </span>
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon" aria-hidden>
                {it.icon}
              </span>
              <span className="nav-label">{it.label}</span>
              {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Nav />
        <main className="main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cours" element={<CoursPage />} />
            <Route path="/grammaire" element={<SectionPage section="grammaire" />} />
            <Route path="/verbes" element={<SectionPage section="verbes" />} />
            <Route path="/vocabulaire" element={<SectionPage section="vocabulaire" />} />
            <Route path="/pack/:id" element={<PackPage />} />
            <Route path="/revision" element={<ReviewPage />} />
            <Route path="/progres" element={<ProgressPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
