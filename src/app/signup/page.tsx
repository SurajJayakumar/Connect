'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { useAuth } from '../components/AuthProvider';

// Define the form interface for TypeScript
interface SignupForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

export default function SignupPage() {
  
  const {loading: authLoading } = useAuth();
  const [form, setForm] = useState<SignupForm>({ 
    name: '', 
    email: '', 
    password: '',
    role: '' 
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate role selection
    if (!form.role) {
      setError('Please select a role');
      return;
    }
    
    setError(null);
    setLoading(true);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: form.name
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        displayName: form.name,
        email: form.email,
        photoURL: null,
        status: 'online',
        role: form.role,
        createdAt: new Date()
      });
      
      // Redirect handled by AuthProvider
    } catch (err: unknown) {
      // Type guard to check if the error has code property
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string };
        // Map common Firebase errors
        switch (firebaseError.code) {
          case 'auth/email-already-in-use':
            setError('This email is already registered.');
            break;
          case 'auth/invalid-email':
            setError('Invalid email format.');
            break;
          case 'auth/weak-password':
            setError('Password should be at least 6 characters.');
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
        <h2 className="text-3xl font-bold text-center">Create your Connect account</h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-[#1a032e] p-6 rounded-xl shadow-lg"
        >
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <div>
            <label className="block mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            />
          </div>

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
              minLength={6}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            />
          </div>
          
          {/* Add the role selection dropdown */}
          <div>
            <label className="block mb-1">I am a</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            >
              <option value="">Select your role</option>
              <option value="hearing_impaired">Hearing Impaired User</option>
              <option value="hearing">Hearing User</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 hover:bg-purple-800 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>

          <p className="text-sm text-center text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}