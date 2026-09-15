import { MongoClient } from "mongodb";
import { config } from "../config.js";

// Next.js dev mode hot-reloads modules, so we use a global singleton to
// prevent exhausting MongoDB connection pool across HMR refreshes.
const globalKey = "_mongoClient";

let client = global[globalKey] ?? null;
let db = null;
let isConnected = false;

export function isDBConnected() {
    return isConnected && Boolean(db);
}

export async function connectDB() {
    if (!config.mongodbUri) {
        console.warn(
            "[MongoDB] MONGODB_URI is not configured. Skipping database persistence.",
        );
        return null;
    }

    if (isConnected && db) {
        return db;
    }

    try {
        console.log("\n[MongoDB] Connecting to database...");

        if (!client) {
            client = new MongoClient(config.mongodbUri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000,
                tls: true,
                tlsAllowInvalidCertificates: true,
            });
            // Persist across hot-reloads in dev
            if (process.env.NODE_ENV !== "production") {
                global[globalKey] = client;
            }
        }

        await client.connect();
        db = client.db(config.mongodbDbName);
        isConnected = true;

        console.log(`[MongoDB] Connected to database: "${db.databaseName}"`);

        await initializeIndexes();
        return db;
    } catch (error) {
        console.error("[MongoDB] Connection failed:", error.message || error);
        isConnected = false;
        db = null;
        return null;
    }
}

async function initializeIndexes() {
    if (!db) return;
    try {
        await db.collection("assets").createIndex({ tags: 1, type: 1 });
        await db
            .collection("assets")
            .createIndex({ sourceId: 1 }, { unique: true, sparse: true });
        await db.collection("jobs").createIndex({ jobId: 1 }, { unique: true });
        await db.collection("jobs").createIndex({ status: 1, updatedAt: -1 });
        await db.collection("videos").createIndex({ createdAt: -1 });
        await db.collection("videos").createIndex({ userId: 1, createdAt: -1 });
        await db
            .collection("users")
            .createIndex({ email: 1 }, { unique: true });
        await db.collection("users").createIndex({ role: 1, status: 1 });
        console.log("[MongoDB] Database indexes verified.");
    } catch (indexError) {
        console.warn("[MongoDB] Index init warning:", indexError.message);
    }
}

export function getDB() {
    return db;
}

export function getCollection(name) {
    if (!isDBConnected()) return null;
    return db.collection(name);
}

export async function closeDB() {
    if (client) {
        await client.close();
        isConnected = false;
        db = null;
        console.log("[MongoDB] Connection closed.");
    }
}
