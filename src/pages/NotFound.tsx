import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-500">That track or lab doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to tracks
      </Link>
    </div>
  );
}
