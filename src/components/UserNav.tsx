import React, { useState } from 'react';
import { LogIn, LogOut, User as UserIcon, CheckCircle2, Cloud, Sparkles } from 'lucide-react';
import { User, auth, googleProvider, signInWithPopup, signOut, syncUserProfile } from '../firebase.ts';

interface UserNavProps {
  user: User | null;
  isDbConnected: boolean;
}

export const UserNav: React.FC<UserNavProps> = ({ user, isDbConnected }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      console.warn('Sign-in issue:', err);
      setError(err?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.warn('Sign-out issue:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Database Status Indicator */}
      <div
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white/80 backdrop-blur-xs text-slate-600 border-slate-200 shadow-2xs"
        title={isDbConnected ? 'Connected to Firebase Firestore' : 'Checking Firestore connection'}
      >
        <Cloud className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
        <span className="text-[11px] font-semibold text-slate-700">
          {isDbConnected ? 'Firestore Active' : 'Connecting...'}
        </span>
      </div>

      {user ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white/90 border border-purple-200/80 shadow-2xs">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-purple-300"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-slate-700 max-w-[100px] truncate hidden sm:inline">
              {user.displayName?.split(' ')[0] || user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 transition active:scale-95 disabled:opacity-60"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{loading ? 'Signing in...' : 'Google Sign-In'}</span>
        </button>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl shadow-lg max-w-sm">
          {error}
        </div>
      )}
    </div>
  );
};
