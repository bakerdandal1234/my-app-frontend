import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-3xl font-bold text-slate-800">404</h1>
        <p className="mt-2 text-slate-600">This page doesn&apos;t exist.</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
