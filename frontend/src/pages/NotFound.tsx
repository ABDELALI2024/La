import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="container-x py-16 text-center max-w-xl">
      <p className="text-6xl font-extrabold">404</p>
      <h1 className="text-2xl font-extrabold mt-2">Safi — this page doesn't exist.</h1>
      <p className="text-stone-600 mt-1 text-sm">The link may be old, or you typed it wrong. Try lessons, the AI tutor, or home.</p>
      <div className="mt-5 flex justify-center gap-2"><Link to="/" className="btn-primary text-sm">Home</Link><Link to="/lessons" className="btn-ghost text-sm">Lessons</Link></div>
    </div>
  );
}
