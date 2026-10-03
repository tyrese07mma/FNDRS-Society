import { translateNow } from '@/i18n';
import { safeErrorCopy } from './error-copy';

export const describeError = (error: unknown): string => translateNow(safeErrorCopy(error));
