'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#1a032e] to-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-purple-900/30">
        <h2 className="font-bold text-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
          Connect
        </h2>
        <div className="flex items-center gap-4">
          <Link href="/about" className="text-gray-300 hover:text-white transition-all duration-200">
            About
          </Link>
          <Link href="/contact" className="text-gray-300 hover:text-white transition-all duration-200">
            Contact
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center p-6 md:p-10">
        <div className="max-w-3xl w-full text-center space-y-10 py-16">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
              Connect
            </h1>
            
            <div className="h-1 w-24 bg-gradient-to-r from-purple-500 to-fuchsia-500 mx-auto rounded-full"></div>
            
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed mt-6">
              Real-time video communication between Hearing-impaired and Hearing users.
              Translate sign language and speech into text — instantly.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-full"></div>
            <div className="relative flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/signup">
                <button className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white text-lg font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1">
                  Get Started
                </button>
              </Link>
              <Link href="/login">
                <button className="bg-gray-800/70 hover:bg-gray-900 text-white text-lg font-semibold px-8 py-3 rounded-xl border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 transform hover:-translate-y-1">
                  Log In
                </button>
              </Link>
            </div>
          </div>

          
        </div>
      </main>

      
    </div>
  );
}