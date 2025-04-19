'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Search, Video, Home, Users, Settings, Clock, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';

// Define types for user data
interface User {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  status: 'online' | 'offline';
}

interface Call {
  id: string;
  userId: string;
  duration: string;
  timestamp: Date;
  missed: boolean;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch users and calls from Firestore
  useEffect(() => {
    // Only fetch data when auth is complete and user is logged in
    if (authLoading || !user) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all users except current user
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        
        const usersData: User[] = [];
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.uid !== user.uid) {
            usersData.push({
              id: doc.id,
              displayName: userData.displayName || 'User',
              email: userData.email,
              photoURL: userData.photoURL,
              status: userData.status || 'offline'
            });
          }
        });
        
        setUsers(usersData);
        
        // Get recent calls
        const callsCollection = collection(db, 'calls');
        const callsQuery = query(
          callsCollection,
          where('participants', 'array-contains', user.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        const callsSnapshot = await getDocs(callsQuery);
        
        const callsData: Call[] = [];
        callsSnapshot.forEach((doc) => {
          const callData = doc.data();
          const otherParticipant = callData.participants.find(
            (id: string) => id !== user.uid
          );
          
          callsData.push({
            id: doc.id,
            userId: otherParticipant || '',
            duration: callData.duration || '0:00',
            timestamp: callData.timestamp?.toDate() || new Date(),
            missed: callData.missed || false
          });
        });
        
        setRecentCalls(callsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, authLoading]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    // Auto-close sidebar on mobile after selection
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Redirect will be handled by AuthProvider
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-black via-[#1a032e] to-black text-white items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Format the date for display
  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
      return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (date >= yesterday) {
      return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'}) + 
             `, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
  };

  // Get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="flex flex-col h-full p-4">
            <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
              Recent Calls
            </h1>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : recentCalls.length > 0 ? (
                <div className="space-y-2">
                  {recentCalls.map((call) => {
                    const user = users.find(u => u.id === call.userId);
                    if (!user) return null;
                    
                    return (
                      <div 
                        key={call.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-purple-900/10 border border-purple-900/30"
                      >
                        <div className="flex items-center">
                          <div className="relative">
                            {user.photoURL ? (
                              <div className="h-12 w-12 rounded-full bg-cover bg-center" style={{backgroundImage: `url(${user.photoURL})`}} />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-purple-800 flex items-center justify-center text-white font-medium text-sm">
                                {getInitials(user.displayName)}
                              </div>
                            )}
                            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${
                              user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                            } border border-[#0c0118]`}></span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium">{user.displayName}</p>
                            <div className="flex items-center text-xs">
                              <Clock className="h-3 w-3 mr-1 text-gray-400" />
                              <span className="text-gray-400">{formatDate(call.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`text-xs mr-3 ${call.missed ? 'text-red-500' : 'text-gray-400'}`}>
                            {call.missed ? 'Missed' : call.duration}
                          </span>
                          <button 
                            className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-all" 
                            onClick={() => handleUserSelect(user)}
                          >
                            <Video className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 mt-10">
                  <p>No recent calls</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'contacts':
        return (
          <div className="h-full p-4 flex flex-col">
            {/* Search Users */}
            <div className="mb-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </span>
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="w-full bg-purple-900/20 border border-purple-900/30 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* User List */}
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-xs uppercase text-gray-500 font-semibold px-2 mb-2">
                Users
              </h3>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-all ${
                        selectedUser && selectedUser.id === user.id 
                          ? 'bg-purple-900/40 text-white' 
                          : 'text-gray-300 hover:bg-purple-900/20 hover:text-white'
                      }`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="relative">
                        {user.photoURL ? (
                          <div className="h-12 w-12 rounded-full bg-cover bg-center" style={{backgroundImage: `url(${user.photoURL})`}} />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-purple-800 flex items-center justify-center text-white font-medium text-sm">
                            {getInitials(user.displayName)}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${
                          user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                        } border border-[#0c0118]`}></span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">{user.displayName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex flex-col h-full p-4">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">Settings</h2>
            <div className="w-full max-w-md bg-purple-900/10 border border-purple-900/30 rounded-xl p-4 mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Dark Theme</span>
                  <div className="w-12 h-6 bg-purple-900/40 rounded-full relative">
                    <div className="absolute w-5 h-5 bg-purple-500 rounded-full left-5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Notifications</span>
                  <div className="w-12 h-6 bg-purple-900/40 rounded-full relative">
                    <div className="absolute w-5 h-5 bg-purple-500 rounded-full left-5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sound</span>
                  <div className="w-12 h-6 bg-purple-900/40 rounded-full relative">
                    <div className="absolute w-5 h-5 bg-gray-600 rounded-full left-1 top-0.5"></div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-purple-900/30">
                  <button 
                    onClick={handleSignOut}
                    className="w-full py-2 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-[#1a032e] to-black text-white">
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <div 
          className={`fixed inset-y-0 left-0 z-30 bg-[#0c0118] transition-all duration-300 ease-in-out shadow-2xl border-r border-purple-900/30 w-64`}
        >
          <div className="flex items-center justify-between h-16 px-4">
            <h2 className="font-bold text-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
              Connect
            </h2>
          </div>
          
          {/* Search Users */}
          <div className="p-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input 
                type="text" 
                placeholder="Search users..." 
                className="w-full bg-purple-900/20 border border-purple-900/30 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Desktop User List */}
          <div className="mt-2 px-2 overflow-y-auto h-[calc(100vh-8rem)]">
            <h3 className="text-xs uppercase text-gray-500 font-semibold px-2 mb-2">
              Users
            </h3>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-all ${
                      selectedUser && selectedUser.id === user.id 
                        ? 'bg-purple-900/40 text-white' 
                        : 'text-gray-300 hover:bg-purple-900/20 hover:text-white'
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="relative">
                      {user.photoURL ? (
                        <div className="h-8 w-8 rounded-full bg-cover bg-center" style={{backgroundImage: `url(${user.photoURL})`}} />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-purple-800 flex items-center justify-center text-white font-medium text-sm">
                          {getInitials(user.displayName)}
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
                        user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                      } border border-[#0c0118]`}></span>
                    </div>
                    <div className="ml-3 truncate">
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Sign Out Button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-900/30">
            <button 
              onClick={handleSignOut}
              className="w-full py-2 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${!isMobile ? 'ml-64' : ''} flex flex-col`}>
        {/* Mobile Header */}
        <div className="sm:hidden flex items-center justify-between p-4 border-b border-purple-900/30 bg-black/80 backdrop-blur-sm z-10">
          <h2 className="font-bold text-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
            Connect
          </h2>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {isMobile ? renderTabContent() : (
            <div className="flex flex-col h-full p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Calls Section */}
                <div className="bg-purple-900/5 border border-purple-900/20 rounded-xl p-4">
                  <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
                    Recent Calls
                  </h2>
                  
                  <div className="overflow-y-auto max-h-80">
                    {loading ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                      </div>
                    ) : recentCalls.length > 0 ? (
                      <div className="space-y-2">
                        {recentCalls.map((call) => {
                          const user = users.find(u => u.id === call.userId);
                          if (!user) return null;
                          
                          return (
                            <div 
                              key={call.id} 
                              className="flex items-center justify-between p-3 rounded-lg bg-purple-900/10 border border-purple-900/30"
                            >
                              <div className="flex items-center">
                                <div className="relative">
                                  {user.photoURL ? (
                                    <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{backgroundImage: `url(${user.photoURL})`}} />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-purple-800 flex items-center justify-center text-white font-medium text-sm">
                                      {getInitials(user.displayName)}
                                    </div>
                                  )}
                                  <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
                                    user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                                  } border border-[#0c0118]`}></span>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium">{user.displayName}</p>
                                  <div className="flex items-center text-xs">
                                    <Clock className="h-3 w-3 mr-1 text-gray-400" />
                                    <span className="text-gray-400">{formatDate(call.timestamp)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <span className={`text-xs mr-3 ${call.missed ? 'text-red-500' : 'text-gray-400'}`}>
                                  {call.missed ? 'Missed' : call.duration}
                                </span>
                                <button 
                                  className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-all" 
                                  onClick={() => handleUserSelect(user)}
                                >
                                  <Video className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <p>No recent calls</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Profile Section */}
                <div>
                  {selectedUser ? (
                    <div className="text-center p-6 bg-purple-900/10 border border-purple-900/30 rounded-xl h-full flex flex-col justify-center">
                      <div className="mb-6">
                        {selectedUser.photoURL ? (
                          <div className="h-20 w-20 rounded-full bg-cover bg-center mx-auto" style={{backgroundImage: `url(${selectedUser.photoURL})`}} />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-purple-800 flex items-center justify-center text-white font-medium text-xl mx-auto">
                            {getInitials(selectedUser.displayName)}
                          </div>
                        )}
                        <h2 className="text-2xl font-bold mt-4">{selectedUser.displayName}</h2>
                        <p className="text-gray-400">{selectedUser.email}</p>
                        <p className={`text-sm mt-2 ${selectedUser.status === 'online' ? 'text-green-500' : 'text-gray-500'}`}>
                          {selectedUser.status === 'online' ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      
                      <p className="text-lg mb-6">Do you want to video call with this user?</p>
                      
                      <div className="flex justify-center gap-4">
                        <button className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all">
                          <Video className="h-5 w-5" />
                          Start Call
                        </button>
                        <button 
                          className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl border border-gray-700 transition-all"
                          onClick={() => setSelectedUser(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-purple-900/10 border border-purple-900/30 rounded-xl h-full flex items-center justify-center">
                      <p className="text-gray-400">Select a user to start a video call</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0c0118] border-t border-purple-900/30 z-10">
            <div className="flex justify-around py-2">
              <button 
                className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-purple-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('home')}
              >
                <Home className="h-6 w-6" />
                <span className="text-xs mt-1">Home</span>
              </button>
              <button 
                className={`flex flex-col items-center p-2 ${activeTab === 'contacts' ? 'text-purple-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('contacts')}
              >
                <Users className="h-6 w-6" />
                <span className="text-xs mt-1">Contacts</span>
              </button>
              <button 
                className={`flex flex-col items-center p-2 ${activeTab === 'settings' ? 'text-purple-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-6 w-6" />
                <span className="text-xs mt-1">Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}