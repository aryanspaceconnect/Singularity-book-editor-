/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Desk from './components/Desk';
import GlobalSettingsDialog from './components/GlobalSettingsDialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            createdAt: new Date().toISOString()
          });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 dark:text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">Singularity Book Studio</h1>
          <p className="text-zinc-500 dark:text-zinc-400">A multi-agent collaborative workspace for writing books.</p>
          <Button onClick={handleLogin} size="lg" className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-zinc-900 dark:bg-zinc-100" />
            <span className="font-semibold tracking-tight">Singularity</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</span>
            <GlobalSettingsDialog userId={user.uid} />
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Desk userId={user.uid} />
        </main>
      </div>
    </TooltipProvider>
  );
}
