import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export interface UserProfile {
    name?: string;
    state?: string;
    district?: string;
    soil_type?: string;
    land_size?: number;
    crops_grown?: string[];
    water_availability?: string;
    role?: string;
    language?: string;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data() as UserProfile;
        } else {
            console.warn("User profile not found for uid:", uid);
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};
