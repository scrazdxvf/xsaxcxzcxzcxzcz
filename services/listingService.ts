
import { Product, AdStatus, ProductCondition } from '../types';
import { CATEGORIES, DEFAULT_PLACEHOLDER_IMAGE } from '../constants';
// import { UKRAINIAN_CITIES } from '../cities'; // Still needed for form, but not for storage logic here

import { db } from '../firebase'; // Import Firestore instance
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp // Import Timestamp for type checking if needed
} from 'firebase/firestore';

// const LISTINGS_STORAGE_KEY = 'scrBaraholkaListings'; // No longer needed

// Helper to convert Firestore doc to Product, handling Timestamps
const mapDocToProduct = (documentSnapshot: any): Product => {
    const data = documentSnapshot.data();
    return {
      id: documentSnapshot.id,
      ...data,
      // Convert Firestore Timestamps to numbers if they exist and are Timestamps
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
    } as Product;
};


export const listingService = {
  // --- New Firestore based functions ---

  getAllListings: async (): Promise<Product[]> => {
    const listingsCol = collection(db, 'listings');
    const q = query(listingsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDocToProduct);
  },

  getActiveListings: async (): Promise<Product[]> => {
    const listingsCol = collection(db, 'listings');
    const q = query(
      listingsCol, 
      where('status', '==', AdStatus.ACTIVE), 
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDocToProduct);
  },

  getListingById: async (id: string): Promise<Product | undefined> => {
    if (!id) {
      console.warn("getListingById called with undefined id");
      return undefined;
    }
    const docRef = doc(db, 'listings', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDocToProduct(docSnap);
    }
    return undefined;
  },

  getListingsByUserId: async (userId: string): Promise<Product[]> => {
    if (!userId) {
        console.warn("getListingsByUserId called with undefined userId");
        return [];
    }
    const listingsCol = collection(db, 'listings');
    const q = query(
      listingsCol, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDocToProduct);
  },
  
  createListing: async (productData: Omit<Product, 'id' | 'createdAt' | 'status'>): Promise<Product> => {
    const listingsCol = collection(db, 'listings');
    const newProductData = {
      ...productData,
      status: AdStatus.PENDING,
      createdAt: serverTimestamp(), // Use Firestore server timestamp
    };
    const docRef = await addDoc(listingsCol, newProductData);
    // To return the full product with ID and resolved timestamp, we'd ideally fetch it again
    // or construct it carefully. For simplicity here, we'll assume the input + new ID is enough for now.
    // A more robust way is to getDoc(docRef) after creation.
    const createdDoc = await getDoc(docRef); // Fetch to get server timestamp resolved
    if (createdDoc.exists()) {
        return mapDocToProduct(createdDoc);
    }
    // Fallback, though ideally getDoc should always work after addDoc
    return { 
        id: docRef.id, 
        ...productData, 
        status: AdStatus.PENDING,
        createdAt: Date.now() // Client-side timestamp as a fallback
    } as Product;
  },

  updateListing: async (id: string, updates: Partial<Omit<Product, 'id'>>): Promise<Product | undefined> => {
    if (!id) {
        console.warn("updateListing called with undefined id");
        return undefined;
    }
    const docRef = doc(db, 'listings', id);
    // If updating createdAt or any other serverTimestamp field, handle it appropriately
    const updateData = { ...updates };
    if (updates.createdAt && typeof updates.createdAt === 'number') {
        // If we are setting a timestamp from client, ensure it's compatible or use serverTimestamp()
        // For simplicity, this example assumes createdAt is not typically updated this way by clients after creation.
        // If status changes to PENDING due to edit, new serverTimestamp might be desired for 'updatedAt' field.
    }
    await updateDoc(docRef, updateData);
    const updatedDoc = await getDoc(docRef);
    return updatedDoc.exists() ? mapDocToProduct(updatedDoc) : undefined;
  },

  deleteListing: async (id: string): Promise<boolean> => {
    if (!id) {
        console.warn("deleteListing called with undefined id");
        return false;
    }
    const docRef = doc(db, 'listings', id);
    await deleteDoc(docRef);
    return true; // Assume success if no error, or check if doc still exists (it shouldn't)
  },

  // Admin functions
  getPendingListings: async (): Promise<Product[]> => {
    const listingsCol = collection(db, 'listings');
    const q = query(
      listingsCol, 
      where('status', '==', AdStatus.PENDING),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDocToProduct);
  },

  approveListing: async (id: string): Promise<Product | undefined> => {
    return listingService.updateListing(id, { status: AdStatus.ACTIVE, rejectionReason: undefined });
  },

  rejectListing: async (id: string, reason: string): Promise<Product | undefined> => {
    return listingService.updateListing(id, { status: AdStatus.REJECTED, rejectionReason: reason });
  },

  // --- Utility functions (can remain as they are if not Firebase dependent) ---
  getCategoryName: (categoryId: string): string => {
    return CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
  },

  getSubcategoryName: (categoryId: string, subcategoryId: string): string => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category?.subcategories.find(sc => sc.id === subcategoryId)?.name || subcategoryId;
  }
};
