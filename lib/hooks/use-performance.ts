import { useEffect, useRef } from 'react';

export function usePerformance(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    
    // Track component mount time
    const mountDuration = Date.now() - mountTime.current;
    if (renderCount.current === 1) {
      console.warn(`${componentName}_mount`, mountDuration);
    }

    // Track re-renders
    if (renderCount.current > 1) {
      console.warn(`${componentName}_rerender`, renderCount.current, 'count');
    }
  }, [componentName]);

  // Return a function to track custom metrics
  return {
    trackMetric: (metric: string, value: number, unit?: string) => {
      console.warn(`${componentName}_${metric}`, value, unit);
    },
    trackOperation: async <T,>(
      operationName: string,
      operation: () => Promise<T>
    ): Promise<T> => {
      const startTime = Date.now();
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        console.warn(`${componentName}_${operationName}`, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.warn(`${componentName}_${operationName}_error`, duration);
        throw error;
      }
    }
  };
}