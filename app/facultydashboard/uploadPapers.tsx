import { Bell, Home, FileText, Clock, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'vet'>('dashboard');

  

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-900 to-purple-900 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-xs text-gray-400">EXAM MODERATOR AI</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-100 text-purple-600 mb-2">
            <Home className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </button>

          <div className="mt-6">
            <div className="text-xs text-gray-400 px-4 mb-3">GENERAL</div>
            <button 
              onClick={() => setCurrentView('vet')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-50 mb-2"
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm">VET</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-50">
              <Clock className="w-5 h-5" />
              <span className="text-sm">HISTORY</span>
            </button>
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-50 mb-2">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-50">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-900 to-purple-900 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-xs text-gray-400">EXAM MODERATOR AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">2</span>
            </button>
            <button>
              <div className="w-9 h-9 rounded-full bg-gray-300"></div>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-100 p-8 overflow-auto flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl text-[#1e3a5f] mb-6">Dashboard</h1>
            <p className="text-gray-600 mb-8">Welcome to Exam Moderator AI</p>
            <button 
              onClick={() => setCurrentView('vet')}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Start VET Process
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}