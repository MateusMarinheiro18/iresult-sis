// src/lib/notifications.ts
'use client';
import { toast } from 'react-hot-toast';

export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast(msg),
  promise: <T>(p: Promise<T>, msgs: { loading: string; success: string | ((r: T) => string); error: string | ((e: any) => string) }) =>
    toast.promise(p, { loading: msgs.loading, success: msgs.success, error: msgs.error }),
};
