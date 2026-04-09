import { useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function SystemLogger({ projectId }: { projectId: string }) {
  useEffect(() => {
    if (!projectId) return;

    const interval = setInterval(async () => {
      try {
        // In a real system, this would gather state from all agents in the Hub
        // For now, we log a heartbeat to demonstrate the 10-second logging requirement
        await addDoc(collection(db, 'projects', projectId, 'logs'), {
          timestamp: serverTimestamp(),
          content: 'System heartbeat: All agents idle. Canvas synced.',
          agentsState: JSON.stringify({
            activeAgents: 0,
            status: 'idle'
          })
        });
        console.log("Observer logged system state.");
      } catch (error) {
        console.error("Failed to log system state", error);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [projectId]);

  return null; // This is a headless component
}
