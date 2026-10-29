import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';

const SuperAdminHeader = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-sm font-medium text-neutral-500">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="hidden sm:block">
            <p className="font-medium leading-none">{user?.full_name ?? 'Admin'}</p>
            <p className="text-xs text-neutral-400">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
};

export default SuperAdminHeader;