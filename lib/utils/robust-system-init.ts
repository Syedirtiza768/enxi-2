import { globalErrorHandler } from './global-error-handler';
import { routeHealthMonitor } from '../middleware/route-health-monitor';

let isInitialized = false;

export function initializeRobustSystem() {
  if (isInitialized) {
    console.debug('Robust system already initialized');
    return;
  }

  try {
    // Initialize global error handler
    globalErrorHandler.initialize();
    
    // Periodic health checks disabled
    
    isInitialized = true;
    console.log('Robust error handling and monitoring system initialized', {
      environment: process.env.NODE_ENV,
      features: [
        'Global error handling',
        'Route health monitoring',
        'System health checks'
      ]
    });

  } catch (error) {
    console.error('Failed to initialize robust system', error);
  }
}

// Auto-initialize in appropriate environments
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Server-side initialization
  initializeRobustSystem();
}