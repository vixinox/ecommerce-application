import { useEffect, useRef, useState } from "react";

type CheckStatus = 'idle' | 'loading' | 'available' | 'taken' | 'error';

interface CheckResult {
  status: CheckStatus;
  message: string;
}


export function useDebouncedApiCheck(
  value: string | undefined | null,
  checkFn: (v: string) => Promise<string>,
  delay: number,
  shouldCheck: boolean
): CheckResult {
  const [checkResult, setCheckResult] = useState<CheckResult>({
    status: 'idle',
    message: '',
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const trimmedValue = value?.trim();

    if (shouldCheck && trimmedValue && trimmedValue !== '') {
      setCheckResult({status: 'loading', message: ''});
      timeoutRef.current = setTimeout(async () => {
        try {
          const message = await checkFn(trimmedValue);
          if (message.includes('可用'))
            setCheckResult({status: 'available', message});
          else if (message.includes('存在'))
            setCheckResult({status: 'taken', message});
          else
            setCheckResult({status: 'error', message: message || '检查返回未知结果'});
        } catch (error: any) {
          console.error("API Check Error:", error);
          const errorMessage = error.message || (typeof error === 'string' ? error : '检查失败，请稍后再试');
          setCheckResult({
            status: 'error',
            message: errorMessage,
          });
        } finally {
          timeoutRef.current = null;
        }
      }, delay);
    }
    else
      setCheckResult({status: 'idle', message: ''});
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay, checkFn, shouldCheck]);

  return checkResult;
}