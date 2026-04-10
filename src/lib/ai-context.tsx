import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from '@google/genai';

interface AIContextType {
  ai: GoogleGenAI;
  universalApiKey: string | null;
  observerApiKey: string | null;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children, userId, projectId }: { children: React.ReactNode, userId: string, projectId: string | null }) {
  const [universalApiKey, setUniversalApiKey] = useState<string | null>(null);
  const [observerApiKey, setObserverApiKey] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().universalApiKey) {
        setUniversalApiKey(docSnap.data().universalApiKey);
      } else {
        setUniversalApiKey(null);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!projectId) {
      setObserverApiKey(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'projects', projectId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().observerApiKey) {
        setObserverApiKey(docSnap.data().observerApiKey);
      } else {
        setObserverApiKey(null);
      }
    });
    return () => unsubscribe();
  }, [projectId]);

  const activeApiKey = observerApiKey || universalApiKey || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: activeApiKey });

  return (
    <AIContext.Provider value={{ ai, universalApiKey, observerApiKey }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    // Fallback if used outside provider
    return { ai: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), universalApiKey: null, observerApiKey: null };
  }
  return context;
}
