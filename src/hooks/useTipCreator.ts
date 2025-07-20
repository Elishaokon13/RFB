import { useState, useCallback } from 'react';
import { pay, getPaymentStatus } from '@base-org/account';

interface PaymentSuccess {
  success: true;
  id: string;
  amount: string;
  to: string;
  payerInfoResponses?: unknown;
}

interface PaymentError {
  success: false;
  error: string;
  amount: string;
  to: string;
}

type PayResult = PaymentSuccess | PaymentError;

export function useTipCreator() {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const tipCreator = useCallback(async (address: string, amount: string, options?: { testnet?: boolean }) => {
    setStatus('pending');
    setError(null);
    setPaymentId(null);
    setPaymentStatus(null);
    try {
      const result: PayResult = await pay({
        amount,
        to: address,
        testnet: options?.testnet ?? true,
      });
      if ('error' in result) {
        setError(result.error || 'Payment failed');
        setStatus('error');
      } else {
        setPaymentId(result.id);
        setStatus('success');
        setPaymentStatus('pending');
      }
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Unknown error'));
      setStatus('error');
    }
  }, []);

  const checkStatus = useCallback(async () => {
    if (!paymentId) return;
    try {
      const statusResult = await getPaymentStatus({ id: paymentId, testnet: true });
      setPaymentStatus(statusResult.status);
      if (statusResult.status === 'completed') setStatus('success');
      else if (statusResult.status === 'failed') setStatus('error');
      else setStatus('pending');
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Error checking payment status'));
      setStatus('error');
    }
  }, [paymentId]);

  return { tipCreator, status, error, paymentId, paymentStatus, checkStatus };
} 