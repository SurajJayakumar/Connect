'use client';

import { useState} from 'react';
import Link from 'next/link';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../components/AuthProvider';

export default function LoginPage() {
  
  const {loading: authLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // AuthProvider will handle redirection if already logged in
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      // The AuthProvider will handle the redirect
    } catch (err: unknown) {
      // Type guard to check if the error has code property
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string };
        // map common Firebase errors to friendly messages
        switch (firebaseError.code) {
          case 'auth/user-not-found':
            setError('No account found with that email.');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password.');
            break;
          case 'auth/invalid-email':
            setError('Invalid email format.');
            break;
          case 'auth/too-many-requests':
            setError('Too many attempts. Please try again later.');
            break;
          default:
            setError(firebaseError.message);
        }
      } else {
        // Handle the case where it's not a FirebaseError
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <h2 className="text-3xl font-bold text-center">Welcome back to Connect</h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-[#1a032e] p-6 rounded-xl shadow-lg"
        >
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            />
          </div>

          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 hover:bg-purple-800 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>

          <p className="text-sm text-center text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-purple-400 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}