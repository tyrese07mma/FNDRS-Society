import { useContext } from 'react';
import { useMutation, type DefaultError, type UseMutationOptions } from '@tanstack/react-query';
import { AccountScope } from '@/providers/AccountScope';
import { api } from './index';

export class AccountChangedError extends Error {
  constructor() { super('The account changed before this action could run.'); }
}

export function useAccountMutation<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(options: UseMutationOptions<TData, TError, TVariables, TContext>) {
  const owner = useContext(AccountScope);
  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationFn: async (variables, context) => {
      // onMutate may await user confirmation/network work. Revalidate afterwards.
      const session = await api.getSession();
      if (!owner || session?.userId !== owner) throw new AccountChangedError();
      if (!options.mutationFn) throw new Error('Mutation has no implementation');
      return options.mutationFn(variables, context);
    },
  });
}
