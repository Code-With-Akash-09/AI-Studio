import { ObjectId } from "mongodb";
import { hashPassword } from "../../utils/jwt.js";
import { getCollection } from "../connection.js";

/**
 * Create a new user document in MongoDB.
 * @param {{ name: string, email: string, password: string, role?: string }} userData
 * @returns {Promise<Object|null>}
 */
export async function createUser(userData) {
    const collection = getCollection("users");
    if (!collection) return null;

    const hashed = await hashPassword(userData.password);
    const now = new Date();

    const doc = {
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        password: hashed,
        role: userData.role || "user",
        status: "active",
        quota: {
            maxVideosPerMonth: userData.role === "admin" ? 9999 : 30,
            videosGeneratedThisMonth: 0,
            lastResetDate: now,
        },
        geminiApiKeys: Array.isArray(userData.geminiApiKeys)
            ? userData.geminiApiKeys
                  .map((k) => String(k).trim())
                  .filter(Boolean)
            : [],
        refreshToken: null,
        createdAt: now,
        updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    return { _id: result.insertedId, ...doc, password: undefined };
}

/**
 * Find a user by email (includes password for login verification).
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function findUserByEmail(email) {
    const collection = getCollection("users");
    if (!collection) return null;

    return collection.findOne({ email: email.toLowerCase().trim() });
}

/**
 * Find a user by their MongoDB ObjectId (excludes password).
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function findUserById(id) {
    if (!id || !ObjectId.isValid(id)) return null;
    const collection = getCollection("users");
    if (!collection) return null;

    return collection.findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } },
    );
}

/**
 * Update a user's fields.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateUser(id, updates) {
    if (!id || !ObjectId.isValid(id)) return;
    const collection = getCollection("users");
    if (!collection) return;

    await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
    );
}

/**
 * Store a hashed refresh token on the user document for rotation/revocation.
 * @param {string} id
 * @param {string|null} token
 */
export async function updateRefreshToken(id, token) {
    await updateUser(id, { refreshToken: token });
}

/**
 * Increment the user's monthly video generation quota counter.
 * Auto-resets counter if it's a new month.
 * @param {string} id
 */
export async function incrementUserQuota(id) {
    if (!id || !ObjectId.isValid(id)) return;
    const collection = getCollection("users");
    if (!collection) return;

    const user = await collection.findOne({ _id: new ObjectId(id) });
    if (!user) return;

    const now = new Date();
    const lastReset = user.quota?.lastResetDate
        ? new Date(user.quota.lastResetDate)
        : now;
    const isNewMonth =
        now.getFullYear() !== lastReset.getFullYear() ||
        now.getMonth() !== lastReset.getMonth();

    if (isNewMonth) {
        await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    "quota.videosGeneratedThisMonth": 1,
                    "quota.lastResetDate": now,
                    updatedAt: now,
                },
            },
        );
    } else {
        await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $inc: { "quota.videosGeneratedThisMonth": 1 },
                $set: { updatedAt: now },
            },
        );
    }
}

/**
 * List all users (Admin only) with pagination.
 * @param {{ page?: number, limit?: number, role?: string, search?: string }} opts
 */
export async function listAllUsers({
    page = 1,
    limit = 20,
    role = "",
    search = "",
} = {}) {
    const collection = getCollection("users");
    if (!collection) return { users: [], total: 0, page, totalPages: 0 };

    const query = {};
    if (role) query.role = role;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [users, total] = await Promise.all([
        collection
            .find(query, { projection: { password: 0, refreshToken: 0 } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        collection.countDocuments(query),
    ]);

    return {
        users,
        total,
        page: Number(page),
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Get Gemini API keys for a user.
 * @param {string} id
 * @returns {Promise<string[]>}
 */
export async function getUserApiKeys(id) {
    if (!id || !ObjectId.isValid(id)) return [];
    const collection = getCollection("users");
    if (!collection) return [];

    const user = await collection.findOne(
        { _id: new ObjectId(id) },
        { projection: { geminiApiKeys: 1 } },
    );
    return Array.isArray(user?.geminiApiKeys) ? user.geminiApiKeys : [];
}

/**
 * Replace / set the full list of Gemini API keys for a user.
 * @param {string} id
 * @param {string[]} keys
 * @returns {Promise<string[]>}
 */
export async function updateUserApiKeys(id, keys) {
    if (!id || !ObjectId.isValid(id)) return [];
    const collection = getCollection("users");
    if (!collection) return [];

    const cleanKeys = Array.isArray(keys)
        ? [...new Set(keys.map((k) => String(k).trim()).filter(Boolean))]
        : [];

    await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                geminiApiKeys: cleanKeys,
                updatedAt: new Date(),
            },
        },
    );

    return cleanKeys;
}

/**
 * Add a single Gemini API key to a user's key list if not already present.
 * @param {string} id
 * @param {string} key
 * @returns {Promise<string[]>}
 */
export async function addGeminiApiKey(id, key) {
    if (!id || !ObjectId.isValid(id)) return [];
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return getUserApiKeys(id);

    const collection = getCollection("users");
    if (!collection) return [];

    await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $addToSet: { geminiApiKeys: cleanKey },
            $set: { updatedAt: new Date() },
        },
    );

    return getUserApiKeys(id);
}

/**
 * Remove a Gemini API key from a user's key list.
 * @param {string} id
 * @param {string} key
 * @returns {Promise<string[]>}
 */
export async function removeGeminiApiKey(id, key) {
    if (!id || !ObjectId.isValid(id)) return [];
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return getUserApiKeys(id);

    const collection = getCollection("users");
    if (!collection) return [];

    await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $pull: { geminiApiKeys: cleanKey },
            $set: { updatedAt: new Date() },
        },
    );

    return getUserApiKeys(id);
}
