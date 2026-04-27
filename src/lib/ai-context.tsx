import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UniversalAI } from './UniversalAI';
import { AI_MODELS, getProviderForModel } from '../services/aiModels';

interface AIContextType {
  ai: UniversalAI;
  universalApiKey: string | null;
  observerApiKey: string | null;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children, userId, projectId }: { children: React.ReactNode, userId: string, projectId: string | null }) {
  const [universalApiKey, setUniversalApiKey] = useState<string | null>(null);
  const [universalModel, setUniversalModel] = useState<string | null>(null);
  const [observerApiKey, setObserverApiKey] = useState<string | null>(null);
  const [observerModel, setObserverModel] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUniversalApiKey(data.universalApiKey || null);
        setUniversalModel(data.universalModel || null);
      } else {
        setUniversalApiKey(null);
        setUniversalModel(null);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!projectId) {
      setObserverApiKey(null);
      setObserverModel(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'projects', projectId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setObserverApiKey(data.observerApiKey || null);
        setObserverModel(data.observerModel || null);
      } else {
        setObserverApiKey(null);
        setObserverModel(null);
      }
    });
    return () => unsubscribe();
  }, [projectId]);

  const activeModel = observerModel || universalModel || AI_MODELS[0].id;
  
  let fallbackKey = process.env.GEMINI_API_KEY;
  if (getProviderForModel(activeModel) === 'openrouter') {
     fallbackKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  }
  
  const activeApiKey = observerApiKey || universalApiKey || fallbackKey;
  const ai = new UniversalAI(activeApiKey, activeModel);

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
    const defaultModel = AI_MODELS[0].id;
    let fallbackKey = process.env.GEMINI_API_KEY;
    if (getProviderForModel(defaultModel) === 'openrouter') {
       fallbackKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    }
    return { ai: new UniversalAI(fallbackKey, defaultModel), universalApiKey: null, observerApiKey: null };
  }
  return context;
}
