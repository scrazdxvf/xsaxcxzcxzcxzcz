// Import Firebase user type if needed, or use a custom user profile type
import type { User as FirebaseUser } from 'firebase/auth';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
  icon: string; // Font Awesome class
}

export interface Subcategory {
  id: string;
  name: string;
  icon?: string;
}

export enum AdStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  SOLD = 'sold', // Added SOLD status
}

export enum ProductCondition {
  NEW = 'new',
  USED = 'used',
}

export interface Product {
  id: string; // Firestore document ID
  title: string;
  description: string;
  price: number;
  category: string; // Main category ID
  subcategory: string; // Subcategory ID
  images: string[]; // URLs or base64 strings
  userId: string; // User ID of the owner (Firebase User UID)
  username?: string; // Username of the owner (denormalized for display)
  status: AdStatus;
  rejectionReason?: string;
  createdAt: number; // Timestamp (Firebase ServerTimestamp or client-side Date.now())
  contactInfo?: string; // e.g., Telegram username
  city: string; 
  condition: ProductCondition; 
}

export interface Message {
  id: string; // Firestore document ID
  adId: string;
  senderId: string; // Firebase User UID
  receiverId: string; // Firebase User UID
  senderUsername?: string; // Denormalized for display
  text: string;
  timestamp: number; // Firebase ServerTimestamp or client-side Date.now()
  read: boolean;
}

// User profile stored in Firestore (extends FirebaseUser info)
export interface UserProfile {
  uid: string; // Firebase User UID
  username: string; 
  email?: string | null; // From Firebase Auth
  createdAt: number; // Timestamp of user registration
  isAdmin?: boolean;
  // any other app-specific user data
}


export interface AuthContextType {
  currentUser: FirebaseUser | null; // Firebase User object
  userProfile: UserProfile | null; // Additional user data from Firestore
  allUserProfiles: UserProfile[]; // Array of all user profiles for admin purposes
  login: (email: string, passwordAttempt: string) => Promise<FirebaseUser | null>;
  register: (email: string, passwordAttempt: string, username: string) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean; // Derived from userProfile
}

// For mocked sample data generation. These are not for active user sessions.
// These will be deprecated/removed when fully on Firebase
export const SAMPLE_USER_ID_1 = 'sampleUser123';
export const SAMPLE_USER_ID_2 = 'sampleSellerABC';
export const SAMPLE_USER_ID_3 = 'anotherSampleSellerXYZ';
// Admin user will be handled in AuthContext with Firebase