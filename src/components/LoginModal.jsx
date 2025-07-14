import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const LoginModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-[#8B949E] hover:text-emerald-400 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <img src="/vite.svg" alt="App Logo" className="w-14 h-14 mb-4" />
        <h2 className="text-2xl font-bold text-emerald-400 mb-2">Sign in or Sign up</h2>
        <p className="text-[#C9D1D9] mb-6 text-center">Access your OptionTrackr account securely. Use your Google account to log in or create a new account instantly.</p>
        <button
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg shadow transition disabled:opacity-50 w-full"
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.98h5.27c-.23 1.24-1.39 3.64-5.27 3.64-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.72 1.43l2.54-2.47C16.13 4.7 14.36 3.8 12.18 3.8c-4.6 0-8.33 3.73-8.33 8.33s3.73 8.33 8.33 8.33c4.81 0 8-3.38 8-8.13 0-.54-.06-1.07-.15-1.53z"/></svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div className="mt-6 text-xs text-[#8B949E] text-center">
          By signing in, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
