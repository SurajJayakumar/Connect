'use client';

import { useState, useEffect } from 'react';
import { Video, LogOut, User, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { collection, getDocs, DocumentData } from 'firebase/firestore';

interface UserData extends DocumentData {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  isOnline?: boolean;
}

export default function Dashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const usersList = userSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserData[];
        setAllUsers(usersList);
        setFilteredUsers(usersList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle search and filter
  useEffect(() => {
    if (!allUsers.length) return;
    
    let result = [...allUsers];
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(user => 
        (user.displayName?.toLowerCase().includes(term) || false) || 
        (user.email?.toLowerCase().includes(term) || false)
      );
    }
    
    // Apply online status filter
    if (filterStatus !== 'all') {
      const isOnline = filterStatus === 'online';
      result = result.filter(user => user.isOnline === isOnline);
    }
    
    setFilteredUsers(result);
  }, [searchTerm, filterStatus, allUsers]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Redirect will be handled by AuthProvider
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get initials from name
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
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
      <div className={`flex-1 flex flex-col items-center p-4 ${isMobile ? 'mt-12' : 'mt-16'}`}>
        <div className="max-w-4xl w-full px-4 py-8">
          {/* Start Video Call Section */}
          <div className="text-center p-8 bg-purple-900/10 border border-purple-900/30 rounded-xl w-full mb-10">
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
          
          {/* All Users Section */}
          <div className="p-8 bg-purple-900/10 border border-purple-900/30 rounded-xl w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div className="flex items-center mb-4 md:mb-0">
                <Users className="h-6 w-6 text-purple-400 mr-3" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
                  Community
                </h2>
              </div>
              
              {/* Search and filter */}
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="py-2 px-4 pr-10 bg-purple-900/20 border border-purple-800/50 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full"
                  />
                  <svg className="w-5 h-5 text-purple-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <select 
                  className="py-2 px-4 bg-purple-900/20 border border-purple-800/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-12 w-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4"></div>
                <p className="text-purple-300">Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((userData) => (
                    <div 
                      key={userData.id}
                      className="group relative p-5 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-800/30 transition-all cursor-pointer backdrop-blur-sm overflow-hidden"
                    >
                      {/* Background glow effect */}
                      <div className={`absolute -inset-1 opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-full blur-md bg-gradient-to-r ${userData.isOnline ? 'from-green-400 to-purple-500' : 'from-purple-400 to-slate-500'}`}></div>
                      
                      <div className="flex items-start space-x-4">
                        {/* Avatar with status indicator */}
                        <div className="relative">
                          {userData.photoURL ? (
                            <div className="h-14 w-14 rounded-full bg-cover bg-center border-2 border-purple-800/50" style={{backgroundImage: `url(${userData.photoURL})`}} />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-700 to-fuchsia-800 flex items-center justify-center text-white font-medium text-lg border-2 border-purple-800/50">
                              {getInitials(userData.displayName || userData.email || '?')}
                            </div>
                          )}
                          <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#0c0118] ${userData.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        </div>
                        
                        {/* User info */}
                        <div className="flex-1 pt-1">
                          <h3 className="font-medium text-white text-lg">
                            {userData.displayName || 'Anonymous User'}
                          </h3>
                          <p className="text-sm text-purple-300/80 mb-2">
                            {userData.email || 'No email provided'}
                          </p>
                          
                          {/* Last activity */}
                          <p className="text-xs text-purple-400/60">
                            {userData.isOnline ? 'Currently online' : 'Last seen recently'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredUsers.length > 9 && (
                  <div className="flex justify-center mt-8">
                    <nav className="flex items-center space-x-2">
                      <button className="w-8 h-8 flex items-center justify-center rounded-md bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-md bg-purple-700/50 text-white">1</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-md bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 hover:text-white transition-colors">2</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-md bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 hover:text-white transition-colors">3</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-md bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-purple-400/50" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No users found</h3>
                <p className="text-sm text-purple-300/60 max-w-md">
                  {searchTerm ? `No results for "${searchTerm}"` : 'There are no users in the system matching your criteria.'}
                </p>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="mt-4 px-4 py-2 bg-purple-900/30 hover:bg-purple-800/40 rounded-lg text-purple-300 hover:text-white text-sm transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}