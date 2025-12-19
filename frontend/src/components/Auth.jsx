import React, { useState, useEffect } from 'react';
import { Bot, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles, Chrome } from 'lucide-react';

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual Google Client ID

export function LoginPage({ onLogin, onSwitchToSignup, theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize Google Sign-In
  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setError('');

    // Check if Google Identity Services is loaded
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.prompt();
    } else {
      // Fallback: Simulate Google sign-in for demo
      setTimeout(() => {
        const mockGoogleUser = {
          email: 'user@gmail.com',
          name: 'Google User',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
          provider: 'google'
        };
        localStorage.setItem('user', JSON.stringify(mockGoogleUser));
        onLogin(mockGoogleUser);
        setIsGoogleLoading(false);
      }, 1500);
    }
  };

  const handleGoogleCallback = (response) => {
    try {
      // Decode the JWT token from Google
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const googleUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        provider: 'google'
      };
      localStorage.setItem('user', JSON.stringify(googleUser));
      onLogin(googleUser);
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    }
    setIsGoogleLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login - replace with actual API call
    setTimeout(() => {
      if (email && password) {
        localStorage.setItem('user', JSON.stringify({ email, name: email.split('@')[0] }));
        onLogin({ email, name: email.split('@')[0] });
      } else {
        setError('Please fill in all fields');
      }
      setIsLoading(false);
    }, 1000);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark 
        ? 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900' 
        : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'
    }`}>
      <div className={`w-full max-w-md ${
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-gray-200'
      } border rounded-2xl p-8 shadow-xl`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-zinc-600 to-zinc-800 border-zinc-500/30' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400/30'
          } border flex items-center justify-center mb-4`}>
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Welcome Back
          </h1>
          <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            Sign in to your AI Assistant
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-zinc-500' : 'focus:ring-blue-500'}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-zinc-500' : 'focus:ring-blue-500'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600 text-white'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>or</span>
          <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-3 transition-all border ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          } disabled:opacity-50`}
        >
          {isGoogleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-4" />

        {/* Sign Up Link */}
        <p className={`text-center ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          Don't have an account?{' '}
          <button
            onClick={onSwitchToSignup}
            className={`font-medium ${isDark ? 'text-zinc-200 hover:text-white' : 'text-blue-600 hover:text-blue-700'}`}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export function SignupPage({ onSignup, onSwitchToLogin, theme }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize Google Sign-In
  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleSignUp = () => {
    setIsGoogleLoading(true);
    setError('');

    // Check if Google Identity Services is loaded
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.prompt();
    } else {
      // Fallback: Simulate Google sign-up for demo
      setTimeout(() => {
        const mockGoogleUser = {
          email: 'user@gmail.com',
          name: 'Google User',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
          provider: 'google'
        };
        localStorage.setItem('user', JSON.stringify(mockGoogleUser));
        onSignup(mockGoogleUser);
        setIsGoogleLoading(false);
      }, 1500);
    }
  };

  const handleGoogleCallback = (response) => {
    try {
      // Decode the JWT token from Google
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const googleUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        provider: 'google'
      };
      localStorage.setItem('user', JSON.stringify(googleUser));
      onSignup(googleUser);
    } catch (err) {
      setError('Google sign-up failed. Please try again.');
    }
    setIsGoogleLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    // Simulate signup - replace with actual API call
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({ email, name }));
      onSignup({ email, name });
      setIsLoading(false);
    }, 1000);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark 
        ? 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900' 
        : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'
    }`}>
      <div className={`w-full max-w-md ${
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-gray-200'
      } border rounded-2xl p-8 shadow-xl`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-zinc-600 to-zinc-800 border-zinc-500/30' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400/30'
          } border flex items-center justify-center mb-4`}>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create Account
          </h1>
          <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            Get started with AI Assistant
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Name
            </label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-zinc-500' : 'focus:ring-blue-500'}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-zinc-500' : 'focus:ring-blue-500'}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-zinc-500' : 'focus:ring-blue-500'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              Confirm Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-zinc-500' : 'focus:ring-blue-500'}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600 text-white'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>or</span>
          <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
        </div>

        {/* Google Sign Up Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading}
          className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-3 transition-all border ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          } disabled:opacity-50`}
        >
          {isGoogleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-4" />

        {/* Login Link */}
        <p className={`text-center ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className={`font-medium ${isDark ? 'text-zinc-200 hover:text-white' : 'text-blue-600 hover:text-blue-700'}`}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
