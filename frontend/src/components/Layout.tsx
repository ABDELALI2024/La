import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const pubLinks = [
  { to: '/lessons', label: 'Lessons' },
  { to: '/vocabulary', label: 'Vocabulary' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="container-x flex items-center gap-3 h-16">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-xl" aria-label="Langzio home">
            <span className="inline-flex w-9 h-9 rounded-xl bg-brand-600 text-white items-center justify-center text-lg" aria-hidden>ل</span>
            Langzio
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Primary">
            {pubLinks.map(l => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold ${isActive ? 'bg-stone-100' : 'hover:bg-stone-100'}`}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link to="/dashboard" className="btn-ghost text-sm hidden sm:inline-flex">Dashboard</Link>
                <Link to="/ai-tutor" className="btn-primary text-sm">AI Tutor</Link>
                <button className="text-sm font-semibold px-2 py-2" onClick={async () => { await logout(); nav('/'); }} aria-label="Log out">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold px-3 py-2">Log in</Link>
                <Link to="/register" className="btn-primary text-sm">Start free</Link>
              </>
            )}
          </div>
        </div>
        <nav className="md:hidden border-t border-stone-100 overflow-x-auto" aria-label="Mobile">
          <div className="container-x flex gap-1 py-2">
            {pubLinks.map(l => <NavLink key={l.to} to={l.to} className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap rounded-lg hover:bg-stone-100">{l.label}</NavLink>)}
            {user && <NavLink to="/dashboard" className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap rounded-lg hover:bg-stone-100">Dashboard</NavLink>}
          </div>
        </nav>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-stone-200 bg-white">
        <div className="container-x py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="font-extrabold text-base mb-2">Langzio</p>
            <p className="text-stone-600">Real Moroccan Darija for tourists, residents, students, diaspora and professionals.</p>
            <p className="mt-3 text-stone-500">Practical levels A0–B2 (our own learning stages, not an official CEFR certification).</p>
          </div>
          <nav aria-label="Learn">
            <p className="font-bold mb-2">Learn</p>
            <ul className="space-y-1.5">
              <li><Link className="hover:underline" to="/lessons">All lessons</Link></li>
              <li><Link className="hover:underline" to="/vocabulary">Vocabulary trainer</Link></li>
              <li><Link className="hover:underline" to="/ai-tutor">AI tutor</Link></li>
              <li><Link className="hover:underline" to="/progress">Progress</Link></li>
              <li><Link className="hover:underline" to="/pricing">Pricing</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <p className="font-bold mb-2">Company</p>
            <ul className="space-y-1.5">
              <li><Link className="hover:underline" to="/about">About</Link></li>
              <li><Link className="hover:underline" to="/contact">Contact</Link></li>
              <li><Link className="hover:underline" to="/faq">FAQ</Link></li>
              <li><Link className="hover:underline" to="/how-it-works">How it works</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <p className="font-bold mb-2">Legal</p>
            <ul className="space-y-1.5">
              <li><Link className="hover:underline" to="/privacy">Privacy</Link></li>
              <li><Link className="hover:underline" to="/terms">Terms</Link></li>
              <li><Link className="hover:underline" to="/cookies">Cookies</Link></li>
              <li><Link className="hover:underline" to="/delete-account">Delete account</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-stone-100">
          <div className="container-x py-4 flex flex-wrap gap-2 items-center text-xs text-stone-500">
            <span>© {new Date().getFullYear()} Langzio · langzio.com</span>
            <span aria-hidden>·</span><Link className="hover:underline" to="/privacy">Privacy</Link>
            <span aria-hidden>·</span><Link className="hover:underline" to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PageHero({ eyebrow, title, lede, children }: { eyebrow?: string; title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <div className="container-x pt-10 pb-6">
      {eyebrow && <p className="text-xs font-extrabold tracking-widest uppercase text-brand-700">{eyebrow}</p>}
      <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 max-w-3xl">{title}</h1>
      {lede && <p className="mt-3 text-lg text-stone-600 max-w-3xl">{lede}</p>}
      {children}
      <nav aria-label="Breadcrumb" className="mt-4 text-xs text-stone-500">
        <Link to="/" className="hover:underline">Home</Link> <span aria-hidden> / </span> <span aria-current="page">{title}</span>
      </nav>
    </div>
  );
}

export function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{msg}</p>;
}
