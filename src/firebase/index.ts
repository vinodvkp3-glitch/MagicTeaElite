"use client";

import { createContext, useContext } from "react";

export const AuthContext = createContext<null>(null);
export const FirestoreContext = createContext<null>(null);
export const UserContext = createContext<{ user: null; loading: boolean }>({
  user: null,
  loading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useFirestore() {
  return useContext(FirestoreContext);
}

export function useUser() {
  return useContext(UserContext);
}

export const auth = null;
export const db = null;
