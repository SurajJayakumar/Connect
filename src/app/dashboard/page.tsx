'use client';

import { useState, useEffect } from 'react';
import { Video, LogOut, User, Settings } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../components/AuthProvider';

export default function Dashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Check on initial load
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Redirect will be handled by AuthProvider
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-[#1a032e] to-black text-white">
      {/* Header with Profile */}
      <div className="fixed top-0 left-0 right-0 bg-[#0c0118]/80 backdrop-blur-sm border-b border-purple-900/30 z-10">
        <div className="flex items-center justify-between p-4 max-w-6xl mx-auto">
          <h1 className="font-bold text-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
            Video Connect
          </h1>
          
          <div className="relative">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-purple-900/20 transition-all"
            >
              {user?.photoURL ? (
                <div className="h-8 w-8 rounded-full bg-cover bg-center" style={{backgroundImage: `url(${user.photoURL})`}} />
              ) : (
                <div className="h-8 w-8 rounded-full bg-purple-800 flex items-center justify-center text-white font-medium text-sm">
                  {getInitials(user?.displayName || user?.email || '?')}
                </div>
              )}
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0c0118] border border-purple-900/30 rounded-lg shadow-xl z-20">
                <div className="py-1">
                  <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-purple-900/20 hover:text-white">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  <Link href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-purple-900/20 hover:text-white">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col items-center justify-center p-4 ${isMobile ? 'mt-12' : 'mt-16'}`}>
        <div className="text-center p-8 bg-purple-900/10 border border-purple-900/30 rounded-xl max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
            Start Video Call
          </h2>
          
          <p className="text-gray-300 mb-10">
            Ready to start a new video conversation?
          </p>
          
          <Link href="/VideoCall">
            <button className={`w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all ${isMobile ? 'text-base' : 'text-lg'} font-medium`}>
              <Video className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Start a Call
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}