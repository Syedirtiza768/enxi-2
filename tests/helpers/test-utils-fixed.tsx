import React from 'react';
import { render, RenderOptions, waitFor } from '@testing-library/react';
import { act } from 'react';

/**
 * Enhanced test utilities that properly handle act() warnings
 */

// Custom render that wraps in act()
export async function renderWithAct(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  let result: any;
  
  await act(async () => {
    result = render(ui, options);
  });
  
  // Wait for any pending updates
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  
  return result;
}

// Helper to wait for async operations
export async function waitForAsync() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

// Helper to handle form submissions
export async function submitForm(submitButton: HTMLElement) {
  await act(async () => {
    submitButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

// Helper to handle input changes
export async function changeInput(input: HTMLElement, value: string) {
  await act(async () => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    }
    
    const event = new Event('change', { bubbles: true });
    input.dispatchEvent(event);
    
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

// Mock API responses with proper timing
export function mockApiResponse(data: any, delay: number = 50) {
  return new Promise(resolve => {
    setTimeout(() => resolve({ ok: true, json: async () => data }), delay);
  });
}

// Helper to wait for loading states to resolve
export async function waitForLoadingToFinish(container: HTMLElement) {
  await waitFor(
    () => {
      const loadingElements = container.querySelectorAll('[data-testid*="loading"]');
      const spinners = container.querySelectorAll('.animate-spin');
      expect(loadingElements.length + spinners.length).toBe(0);
    },
    { timeout: 5000 }
  );
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { act } from 'react';