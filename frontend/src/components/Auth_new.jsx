import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function LoginPage({ onLogin, onSwitchToSignup, theme }) {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password
      });

      // Save token and user data
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token || '');
      localStorage.setItem('user', JSON.stringify(response.data.user));

      onLogin(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark 
        ? 'bg-gradient-to-br from-[#171717] via-[#212121] to-[#171717]' 
        : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'
    }`}>
      <div className={`w-full max-w-md ${
        isDark ? 'bg-[#2f2f2f]/50 border-[#3f3f3f]' : 'bg-white border-gray-200'
      } border rounded-2xl p-8 shadow-xl`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#3f3f3f] to-[#2f2f2f] border-[#4a4a4a]' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400/30'
          } border flex items-center justify-center mb-4`}>
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Welcome Back
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in to your AI Assistant
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 flex gap-2 rounded-lg border ${
            isDark 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-[#171717]/50 border-[#3f3f3f] text-white placeholder-gray-500 focus:border-[#5a5a5a]' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-[#5a5a5a]' : 'focus:ring-blue-500'}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-3 rounded-xl border ${
                  isDark 
                    ? 'bg-[#171717]/50 border-[#3f3f3f] text-white placeholder-gray-500 focus:border-[#5a5a5a]' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isDark ? 'focus:ring-[#5a5a5a]' : 'focus:ring-blue-500'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
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
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-[#3f3f3f] text-white'
                : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-[#3f3f3f]' : 'border-gray-200'} text-center`}>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              className={`font-medium transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'}`}
            >
              Sign up
            </button>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className={`mt-4 p-3 rounded-lg text-xs ${isDark ? 'bg-[#1f1f1f] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
          <strong>Demo:</strong> demo@example.com / password123
        </div>
      </div>
    </div>
  );
}


export function SignupPage({ onLogin, onSwitchToLogin, theme }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/register`, {
        email,
        username,
        password,
        full_name: fullName
      });

      // Save token and user data
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token || '');
      localStorage.setItem('user', JSON.stringify(response.data.user));

      onLogin(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark 
        ? 'bg-gradient-to-br from-[#171717] via-[#212121] to-[#171717]' 
        : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'
    }`}>
      <div className={`w-full max-w-md ${
        isDark ? 'bg-[#2f2f2f]/50 border-[#3f3f3f]' : 'bg-white border-gray-200'
      } border rounded-2xl p-8 shadow-xl`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#3f3f3f] to-[#2f2f2f] border-[#4a4a4a]' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400/30'
          } border flex items-center justify-center mb-4`}>
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create Account
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Join our AI Assistant
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 flex gap-2 rounded-lg border ${
            isDark 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Full Name
            </label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${
                  isDark 
                    ? 'bg-[#171717]/50 border-[#3f3f3f] text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${
                  isDark 
                    ? 'bg-[#171717]/50 border-[#3f3f3f] text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm ${
                isDark 
                  ? 'bg-[#171717]/50 border-[#3f3f3f] text-white placeholder-gray-500' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${
                  isDark 
                    ? 'bg-[#171717]/50 border-[#3f3f3f] text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Confirm Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-2.5 rounded-xl border text-sm ${
                  isDark 
                    ? 'bg-[#171717]/50 border-[#3f3f3f] text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all mt-4 ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-[#3f3f3f] text-white'
                : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-[#3f3f3f]' : 'border-gray-200'} text-center`}>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className={`font-medium transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'}`}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
