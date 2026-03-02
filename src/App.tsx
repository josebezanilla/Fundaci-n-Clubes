import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import { motion } from 'motion/react';
import { LogIn, FileText } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from './lib/firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("La función de login no está configurada aún.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-[32px] shadow-xl border border-slate-200 max-w-md w-full text-center"
        >
          <h1 className="text-2xl font-ubuntu font-light text-brand-primary tracking-widest mb-8">
            Fundación Clubes
          </h1>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Bienvenido al Asistente Técnico</h2>
          <p className="text-slate-500 mb-10 text-sm leading-relaxed">
            Ingresa con tu cuenta de Google para comenzar a gestionar tu club con inteligencia artificial.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-6 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Ingresar con Google
          </button>
          <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Exclusivo para Dirigentes Sociales
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-ubuntu font-light text-brand-primary tracking-widest">
              Fundación Clubes
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-700">{user.displayName}</span>
                  <span className="text-[10px] text-slate-400">{user.email}</span>
                </div>
                <img src={user.photoURL || ''} className="w-9 h-9 rounded-full border border-slate-200" alt="User" />
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Cerrar sesión"
                >
                  <LogIn className="w-5 h-5 rotate-180" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-all shadow-sm active:scale-95"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 brightness-0 invert" alt="Google" />
                Ingresar con Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar - Left or Top on mobile */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1 lg:w-72 flex-shrink-0 sticky lg:top-24"
        >
          <Sidebar />
        </motion.div>

        {/* Chat Interface - Main area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1 order-1 lg:order-2 w-full min-w-0"
        >
          <ChatInterface user={user} />
        </motion.div>
      </main>
    </div>
  );
}
