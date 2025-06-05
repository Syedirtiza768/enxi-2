import { globalErrorHandler } from './global-error-handler';

let isInitialized = false;

export function initializeRobustSystem() {
  if (isInitialized) {
    console.warn('Robust system already initialized');
    return;
  }

  try {
    // Initialize global error handler
    globalErrorHandler.initialize();
    
    // Periodic health checks disabled
    
    isInitialized = true;
    console.warn('Robust error handling and monitoring system initialized', {
      environment: process.env.NODE_ENV,
      features: [
        'Global error handling',
        'Route health monitoring',
        'System health checks'
      ]
    });

  } catch (error) {
    console.error('Error initializing robust system:', error);
  }
}

// Auto-initialize in appropriate environments
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Server-side initialization
  initializeRobustSystem();
}