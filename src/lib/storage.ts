export const DB = {
  get: (key: string) => {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: unknown) => {
    if (typeof window === "undefined") return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  push: (key: string, item: Record<string, unknown>) => {
    const arr = (DB.get(key) as Record<string, unknown>[] | null) ?? [];
    arr.push({ ...item, id: Date.now().toString() });
    return DB.set(key, arr);
  },
  remove: (key: string, id: string) => {
    const arr = (DB.get(key) as { id: string }[] | null) ?? [];
    return DB.set(
      key,
      arr.filter((i) => i.id !== id)
    );
  },
  update: (key: string, id: string, newData: Record<string, unknown>) => {
    const arr = (DB.get(key) as { id: string }[] | null) ?? [];
    const updated = arr.map((i) =>
      i.id === id ? { ...i, ...newData } : i
    );
    return DB.set(key, updated);
  },
};
