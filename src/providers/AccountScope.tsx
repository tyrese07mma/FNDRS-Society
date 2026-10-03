import { createContext } from 'react';

/** Each identity mounts its own query client and mutation observers. */
export const AccountScope = createContext<string | null>(null);
