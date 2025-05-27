import React, { useState } from 'react';
import { auth } from '../services/supabase';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await auth.signIn({ email, password });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await auth.signUp({ email, password });
      setError('Please check your email for verification link');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await auth.signInWithGoogle();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
      <div className="card p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-emerald-400">Sign In</h2>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-6">
            {error}
          </div>
        )}

        {!showEmailForm ? (
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded transition-colors"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-5 h-5"
              />
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#30363D]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0D1117] text-[#8B949E]">Or</span>
              </div>
            </div>

            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] font-semibold py-3 px-4 rounded transition-colors"
            >
              <span className="material-icons text-xl">email</span>
              Continue with Email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 rounded bg-[#21262D] border border-[#30363D] text-[#C9D1D9]"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 rounded bg-[#21262D] border border-[#30363D] text-[#C9D1D9]"
                required
              />
            </div>
            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={handleEmailSignUp}
                disabled={loading}
                className="w-full btn btn-secondary py-2"
              >
                Create Account
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="w-full text-[#8B949E] text-sm hover:text-[#C9D1D9]"
            >
              ← Back to all sign in options
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
