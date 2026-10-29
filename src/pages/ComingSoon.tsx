import { useLocation, useNavigate } from 'react-router-dom';
import { Construction } from 'lucide-react';

/**
 * Placeholder for sidebar sections that are planned but not built yet, so
 * every nav link lands on a real page instead of bouncing to the catch-all.
 */
const ComingSoon = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const title = (pathname.split('/').filter(Boolean).pop() ?? 'This page').replace(/-/g, ' ');

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
          <Construction size={26} className="text-neutral-500" />
        </div>
        <h1 className="text-xl font-semibold capitalize text-neutral-900">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This section is coming soon. We&apos;re working on it.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Go back
        </button>
      </div>
    </div>
  );
};

export default ComingSoon;
