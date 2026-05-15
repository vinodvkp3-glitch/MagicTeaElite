"use client";

import React from "react";
import {
  AuthContext,
  FirestoreContext,
  UserContext,
} from "@/firebase";

interface FirebaseClientProviderProps {
  children: React.ReactNode;
}

/** No-op provider: Firebase replaced by localStorage; contexts return null safely. */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <AuthContext.Provider value={null}>
      <FirestoreContext.Provider value={null}>
        <UserContext.Provider value={{ user: null, loading: false }}>
          {children}
        </UserContext.Provider>
      </FirestoreContext.Provider>
    </AuthContext.Provider>
  );
}
