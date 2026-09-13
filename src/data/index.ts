import type { Api } from './api';
import { supabaseApi } from './supabase/supabaseApi';

export const api: Api = supabaseApi;
export { ApiError, isApiError } from './api';
