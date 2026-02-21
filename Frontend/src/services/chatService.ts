import { db } from '../../firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    startAfter,
    onSnapshot,
    deleteDoc
} from 'firebase/firestore';
export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: any;
    updatedAt: any;
    model: string;
    backendSessionId?: string;
    type: 'advisor' | 'waste';
}


export interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'model'; // 'model' is legacy, mapping to 'assistant'
    content: string;
    createdAt: any;
}

const USERS_COLLECTION = 'users';
const CHATS_COLLECTION = 'chats';
const MESSAGES_COLLECTION = 'messages';

export const chatService = {
    /**
     * Creates a new chat session for a user
     */
    createChat: async (userId: string, initialTitle: string = "New Chat", backendSessionId?: string, type: 'advisor' | 'waste' = 'advisor'): Promise<string> => {
        try {
            const chatRef = collection(db, USERS_COLLECTION, userId, CHATS_COLLECTION);
            const newChat = await addDoc(chatRef, {
                userId,
                title: initialTitle,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                model: type === 'waste' ? 'waste-to-value-v1' : 'krishi-advisor-v1',
                backendSessionId,
                type
            });
            return newChat.id;
        } catch (error) {

            console.error("Error creating chat:", error);
            throw error;
        }
    },

    /**
     * Updates the title of a chat
     */
    updateChatTitle: async (userId: string, chatId: string, title: string) => {
        try {
            const chatDocRef = doc(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId);
            await updateDoc(chatDocRef, { title });
        } catch (error) {
            console.error("Error updating chat title:", error);
        }
    },

    /**
     * Update the updatedAt timestamp of a chat (e.g. when a new message is sent)
     */
    updateChatTimestamp: async (userId: string, chatId: string) => {
        try {
            const chatDocRef = doc(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId);
            await updateDoc(chatDocRef, { updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("Error updating chat timestamp:", error);
        }
    },

    /**
     * Update the backend session ID for a chat (e.g. when session needs to be reinitialized)
     */
    updateChatBackendSession: async (userId: string, chatId: string, backendSessionId: string) => {
        try {
            const chatDocRef = doc(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId);
            await updateDoc(chatDocRef, { backendSessionId });
        } catch (error) {
            console.error("Error updating chat backend session:", error);
        }
    },

    /**
     * Fetch user's chat history ordered by most recent
     */
    getUserChats: async (userId: string, limitCount: number = 20, type?: 'advisor' | 'waste'): Promise<ChatSession[]> => {
        try {
            const chatsRef = collection(db, USERS_COLLECTION, userId, CHATS_COLLECTION);
            let q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(limitCount));
            if (type) {
                q = query(chatsRef, where('type', '==', type), orderBy('updatedAt', 'desc'), limit(limitCount));
            }
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatSession));
        } catch (error) {
            console.error("Error fetching chats:", error);
            return [];
        }
    },

    /**
     * Real-time listener for user chats
     */
    subscribeToUserChats: (userId: string, callback: (chats: ChatSession[]) => void, type?: 'advisor' | 'waste') => {
        const chatsRef = collection(db, USERS_COLLECTION, userId, CHATS_COLLECTION);
        let q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(50));
        if (type) {
            q = query(chatsRef, where('type', '==', type), orderBy('updatedAt', 'desc'), limit(50));
        }


        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatSession));
            callback(chats);
        });
    },

    /**
     * Save a message to a chat session
     */
    saveMessage: async (userId: string, chatId: string, message: Message) => {
        try {
            const messagesRef = collection(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
            await addDoc(messagesRef, {
                role: message.role,
                content: message.content,
                createdAt: serverTimestamp()
            });

            // Update the chat's updatedAt field
            await chatService.updateChatTimestamp(userId, chatId);
        } catch (error) {
            console.error("Error saving message:", error);
            throw error;
        }
    },

    /**
     * Fetch messages for a specific chat
     */
    getChatMessages: async (userId: string, chatId: string, limitCount: number = 50): Promise<Message[]> => {
        try {
            const messagesRef = collection(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
            // Order by desc to get most recent, then reverse for display
            const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(limitCount));

            const snapshot = await getDocs(q);
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));

            return msgs.reverse();
        } catch (error) {
            console.error("Error fetching messages:", error);
            return [];
        }
    },

    /**
     * Delete a chat session and all its messages
     */
    deleteChat: async (userId: string, chatId: string): Promise<boolean> => {
        try {
            // 1. Delete all messages in subcollection
            const messagesRef = collection(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
            const messagesSnapshot = await getDocs(messagesRef);

            // Delete all messages in batches for better performance
            const deletePromises = messagesSnapshot.docs.map(msgDoc => {
                const msgDocRef = doc(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, msgDoc.id);
                return deleteDoc(msgDocRef);
            });

            await Promise.all(deletePromises);

            // 2. Delete the chat document itself
            const chatDocRef = doc(db, USERS_COLLECTION, userId, CHATS_COLLECTION, chatId);
            await deleteDoc(chatDocRef);

            console.log(`Successfully deleted chat ${chatId} and ${messagesSnapshot.docs.length} messages`);
            return true;
        } catch (error) {
            console.error("Error deleting chat:", error);
            return false;
        }
    }
};
