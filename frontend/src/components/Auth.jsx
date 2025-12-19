import React, { useState } from 'react';
import { Bot, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

export function LoginPage({ onLogin, onSwitchToSignup, theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
  const [error, setError] = useState('');

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
