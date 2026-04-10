import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { Tool } from '../agent/index';

dotenv.config();

// Since this is a sample/prototype backend, we'll try to initialize firebase-admin.
// If FIREBASE_SERVICE_ACCOUNT is provided in .env, we use it.
// If not, we'll mock the database functions for testing purposes so it doesn't crash.

let db: FirebaseFirestore.Firestore | null = null;

try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson && getApps().length === 0) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const app = initializeApp({
            credential: cert(serviceAccount)
        });
        db = getFirestore(app);
        console.log("Firebase Admin initialized successfully.");
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT not found in environment. Mocking Firebase storage for tools.");
    }
} catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    console.warn("Mocking Firebase storage for tools.");
}

// In-memory mock storage if Firebase fails to init
const mockToolsDB = new Map<string, Tool>();

/**
 * Saves a newly generated tool to Firebase Firestore (or mock DB).
 *
 * @param tool The Tool object containing name, description, and code.
 */
export async function saveToolToDatabase(tool: Tool): Promise<void> {
    if (db) {
        try {
            await db.collection('agent_tools').doc(tool.name).set({
                name: tool.name,
                description: tool.description,
                code: tool.code,
                createdAt: new Date().toISOString()
            });
            console.log(`[Database] Tool '${tool.name}' saved to Firestore.`);
        } catch (error) {
            console.error(`[Database Error] Failed to save tool '${tool.name}':`, error);
        }
    } else {
        // Use Mock DB
        mockToolsDB.set(tool.name, tool);
        console.log(`[Mock DB] Tool '${tool.name}' saved locally.`);
    }
}

/**
 * Loads a tool from Firebase Firestore (or mock DB) by name.
 *
 * @param toolName The name of the tool to retrieve.
 * @returns The Tool object, or null if not found.
 */
export async function getToolFromDatabase(toolName: string): Promise<Tool | null> {
    if (db) {
        try {
            const doc = await db.collection('agent_tools').doc(toolName).get();
            if (doc.exists) {
                return doc.data() as Tool;
            }
            return null;
        } catch (error) {
            console.error(`[Database Error] Failed to fetch tool '${toolName}':`, error);
            return null;
        }
    } else {
        // Use Mock DB
        const tool = mockToolsDB.get(toolName);
        return tool || null;
    }
}

/**
 * Loads all tools from Firebase Firestore (or mock DB).
 *
 * @returns Array of Tool objects.
 */
export async function getAllToolsFromDatabase(): Promise<Tool[]> {
    if (db) {
        try {
            const snapshot = await db.collection('agent_tools').get();
            const tools: Tool[] = [];
            snapshot.forEach(doc => {
                tools.push(doc.data() as Tool);
            });
            return tools;
        } catch (error) {
            console.error(`[Database Error] Failed to fetch all tools:`, error);
            return [];
        }
    } else {
        // Use Mock DB
        return Array.from(mockToolsDB.values());
    }
}
