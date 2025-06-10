
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase'; // Import Firebase instances
import { AuthContextType, UserProfile } from '../../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_USER_EMAIL_STUB = 'jessieinberg'; // Will be combined with a domain
const ADMIN_USER_DEFAULT_DOMAIN = '@admin.baraholka'; // A dummy domain for the admin user
const ADMIN_USER_PASSWORD_USER = 'Jessynberg69666$$SS'; // Password for the user 'jessieinberg'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allUserProfiles, setAllUserProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const mapDocToUserProfile = (documentSnapshot: any): UserProfile => {
    const data = documentSnapshot.data();
    return {
      uid: documentSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
    } as UserProfile;
  };

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile | null> => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const profileData = mapDocToUserProfile(userDocSnap);
      setIsAdmin(profileData.isAdmin || false);
      return profileData;
    }
    return null;
  }, []);

  const fetchAllUserProfiles = useCallback(async (): Promise<void> => {
    try {
      const usersCol = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCol);
      const profiles = usersSnapshot.docs.map(mapDocToUserProfile);
      setAllUserProfiles(profiles);
    } catch (error: any) {
      console.error("Error fetching all user profiles:", error.message, error.code, error);
      setAllUserProfiles([]); // Set to empty array on error
    }
  }, []);


  const ensureAdminUserExists = useCallback(async () => {
    const usersRef = collection(db, "users");
    const adminEmail = `${ADMIN_USER_EMAIL_STUB}${ADMIN_USER_DEFAULT_DOMAIN}`;
    const q = query(usersRef, where("email", "==", adminEmail));
    const querySnapshot = await getDocs(q);

    let adminFirebaseUser: FirebaseUser | null = null;

    if (querySnapshot.empty) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, ADMIN_USER_PASSWORD_USER);
        adminFirebaseUser = userCredential.user;
        
        const adminProfileData = {
          username: ADMIN_USER_EMAIL_STUB,
          email: adminFirebaseUser.email,
          createdAt: serverTimestamp(),
          isAdmin: true,
        };
        await setDoc(doc(db, "users", adminFirebaseUser.uid), adminProfileData);
        console.log("Admin user 'jessieinberg' created in Firebase Auth and Firestore.");
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.warn("Admin user 'jessieinberg' email already in use in Auth. Attempting to ensure Firestore profile exists or is admin.");
           // Attempt to find the user by email in Auth if needed, or simply ensure Firestore profile.
           // For simplicity, we assume if email is in use, we just need to check/update Firestore.
           // This part could be more robust by trying to sign in to get the UID if not already available.
        } else {
          console.error("Error creating admin user 'jessieinberg' in Auth:", error.message, error.code, error);
        }
      }
    }
    
    // This part ensures Firestore profile is admin, even if Auth user already existed
    // or was just created (if adminFirebaseUser is set)
    let adminUidToUpdate: string | undefined = adminFirebaseUser?.uid;

    if (!adminUidToUpdate && !querySnapshot.empty) { // If admin user was found in Firestore
        adminUidToUpdate = querySnapshot.docs[0].id;
    }
    
    if (adminUidToUpdate) {
        const adminDocRef = doc(db, "users", adminUidToUpdate);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
            if (!adminDocSnap.data().isAdmin) {
                await setDoc(adminDocRef, { isAdmin: true }, { merge: true });
                console.log("Updated 'jessieinberg' Firestore profile to isAdmin: true.");
            }
        } else if (adminFirebaseUser) { // Firestore doc didn't exist but auth user was just created
            const adminProfileData = {
                username: ADMIN_USER_EMAIL_STUB,
                email: adminFirebaseUser.email,
                createdAt: serverTimestamp(),
                isAdmin: true,
            };
            await setDoc(doc(db, "users", adminFirebaseUser.uid), adminProfileData);
            console.log("Admin user 'jessieinberg' profile created in Firestore (Auth user existed or was just created).");
        }
    } else if (querySnapshot.empty && !adminFirebaseUser) {
        console.warn("Could not ensure admin user 'jessieinberg': User not found in Auth and creation failed or email already in use without finding existing UID.");
    }

  }, []);


  useEffect(() => {
    setIsLoading(true);
    const initializeAuth = async () => {
      await ensureAdminUserExists(); 
      await fetchAllUserProfiles(); 

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          const profile = await fetchUserProfile(user);
          setUserProfile(profile);
          await fetchAllUserProfiles();
        } else {
          setUserProfile(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      });
      return unsubscribe;
    };
    
    let unsubscribePromise = initializeAuth();

    return () => {
      unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, [fetchUserProfile, ensureAdminUserExists, fetchAllUserProfiles]);

  const login = useCallback(async (email: string, passwordAttempt: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, passwordAttempt);
      return userCredential.user;
    } catch (error: any) {
      console.error("Login error:", error.message, error.code, error);
      setCurrentUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      return null;
    } finally {
        setIsLoading(false); 
    }
  }, []);

  const register = useCallback(async (email: string, passwordAttempt: string, username: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    const usernameQuery = query(collection(db, "users"), where("username", "==", username));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
        console.error("Username already exists.");
        setIsLoading(false);
        throw new Error("Username already exists."); 
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordAttempt);
      const firebaseUser = userCredential.user;
      
      const newUserProfileData = {
        username: username,
        email: firebaseUser.email,
        createdAt: serverTimestamp(), 
        isAdmin: username === ADMIN_USER_EMAIL_STUB, 
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUserProfileData);
      return firebaseUser;
    } catch (error: any) {
      console.error("Registration error:", error.message, error.code, error);
      setIsLoading(false);
      throw error; 
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout error:", error.message, error.code, error);
      setCurrentUser(null);
      setUserProfile(null);
      setIsAdmin(false);
    } finally {
        setIsLoading(false); 
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, allUserProfiles, login, register, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};