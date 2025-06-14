/**
 * Accessibility testing utilities
 * Provides automated testing helpers for WCAG 2.1 AA compliance
 */

import { getFocusableElements, isFocusable } from './focus-management'
import { checkContrast, WCAG_CONTRAST_RATIOS } from './color-contrast'
import { validateAriaProps } from './aria-utils'

/**
 * Accessibility violation types
 */
export type ViolationType = 
  | 'missing-alt-text'
  | 'missing-label'
  | 'missing-heading-structure'
  | 'insufficient-contrast'
  | 'missing-focus-indicator'
  | 'invalid-aria'
  | 'missing-landmark'
  | 'keyboard-trap'
  | 'timing-issue'
  | 'missing-skip-link'

/**
 * Accessibility violation severity
 */
export type ViolationSeverity = 'error' | 'warning' | 'info'

/**
 * Accessibility violation interface
 */
export interface AccessibilityViolation {
  type: ViolationType
  severity: ViolationSeverity
  message: string
  element?: Element
  selector?: string
  wcagCriterion?: string
  howToFix?: string
}

/**
 * Accessibility test result
 */
export interface AccessibilityTestResult {
  passed: boolean
  violations: AccessibilityViolation[]
  score: number // 0-100
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

/**
 * Test configuration options
 */
export interface TestConfig {
  /**
   * Include contrast checking
   */
  checkContrast?: boolean
  
  /**
   * Include focus management testing
   */
  checkFocus?: boolean
  
  /**
   * Include ARIA validation
   */
  checkAria?: boolean
  
  /**
   * Include semantic structure testing
   */
  checkSemantics?: boolean
  
  /**
   * Include keyboard navigation testing
   */
  checkKeyboard?: boolean
  
  /**
   * Elements to exclude from testing
   */
  exclude?: string[]
  
  /**
   * Custom color combinations to test
   */
  colorPairs?: Array<[string, string]>
  
  /**
   * Minimum contrast ratio (default: WCAG AA)
   */
  minContrastRatio?: number
}

/**
 * Default test configuration
 */
const DEFAULT_CONFIG: Required<TestConfig> = {
  checkContrast: true,
  checkFocus: true,
  checkAria: true,
  checkSemantics: true,
  checkKeyboard: true,
  exclude: [],
  colorPairs: [],
  minContrastRatio: WCAG_CONTRAST_RATIOS.AA_NORMAL
}

/**
 * Run comprehensive accessibility tests on a container
 * @param container - Element to test (defaults to document.body)
 * @param config - Test configuration options
 * @returns Test results
 */
export function runAccessibilityTests(
  container: Element = document.body,
  config: TestConfig = {}
): AccessibilityTestResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const violations: AccessibilityViolation[] = []
  
  try {
    // Test image alt text
    if (finalConfig.checkSemantics) {
      violations.push(...testImageAltText(container, finalConfig))
    }
    
    // Test form labels
    if (finalConfig.checkSemantics) {
      violations.push(...testFormLabels(container, finalConfig))
    }
    
    // Test heading structure
    if (finalConfig.checkSemantics) {
      violations.push(...testHeadingStructure(container, finalConfig))
    }
    
    // Test color contrast
    if (finalConfig.checkContrast) {
      violations.push(...testColorContrast(container, finalConfig))
    }
    
    // Test focus indicators
    if (finalConfig.checkFocus) {
      violations.push(...testFocusIndicators(container, finalConfig))
    }
    
    // Test ARIA attributes
    if (finalConfig.checkAria) {
      violations.push(...testAriaAttributes(container, finalConfig))
    }
    
    // Test landmark structure
    if (finalConfig.checkSemantics) {
      violations.push(...testLandmarks(container, finalConfig))
    }
    
    // Test keyboard navigation
    if (finalConfig.checkKeyboard) {
      violations.push(...testKeyboardNavigation(container, finalConfig))
    }
  } catch (error) {
    violations.push({
      type: 'missing-label',
      severity: 'error',
      message: `Testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      wcagCriterion: 'General'
    })
  }
  
  // Calculate summary
  const summary = violations.reduce(
    (acc, violation) => {
      acc[violation.severity]++
      return acc
    },
    { error: 0, warning: 0, info: 0 }
  )
  
  // Calculate score (0-100)
  const totalViolations = summary.error + summary.warning + summary.info
  const weightedScore = summary.error * 3 + summary.warning * 2 + summary.info * 1
  const maxPossibleScore = totalViolations * 3
  const score = maxPossibleScore > 0 ? Math.max(0, 100 - (weightedScore / maxPossibleScore) * 100) : 100
  
  return {
    passed: summary.error === 0,
    violations,
    score: Math.round(score),
    summary
  }
}

/**
 * Test image alt text
 */
function testImageAltText(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  const images = container.querySelectorAll('img')
  
  images.forEach((img) => {
    if (config.exclude.some(selector => img.matches(selector))) return
    
    const alt = img.getAttribute('alt')
    const ariaLabel = img.getAttribute('aria-label')
    const ariaLabelledBy = img.getAttribute('aria-labelledby')
    const role = img.getAttribute('role')
    
    // Skip decorative images
    if (role === 'presentation' || role === 'none' || alt === '') return
    
    // Check for missing alt text
    if (!alt && !ariaLabel && !ariaLabelledBy) {
      violations.push({
        type: 'missing-alt-text',
        severity: 'error',
        message: 'Image is missing alt text',
        element: img,
        selector: getElementSelector(img),
        wcagCriterion: '1.1.1 Non-text Content',
        howToFix: 'Add alt attribute with descriptive text or use aria-label/aria-labelledby'
      })
    }
  })
  
  return violations
}

/**
 * Test form labels
 */
function testFormLabels(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  const formControls = container.querySelectorAll('input, select, textarea')
  
  formControls.forEach((control) => {
    if (config.exclude.some(selector => control.matches(selector))) return
    
    const type = control.getAttribute('type')
    if (type === 'hidden' || type === 'submit' || type === 'button') return
    
    const id = control.getAttribute('id')
    const ariaLabel = control.getAttribute('aria-label')
    const ariaLabelledBy = control.getAttribute('aria-labelledby')
    const title = control.getAttribute('title')
    
    // Check for associated label
    let hasLabel = false
    
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`)
      if (label) hasLabel = true
    }
    
    // Check for parent label
    const parentLabel = control.closest('label')
    if (parentLabel) hasLabel = true
    
    // Check for ARIA labeling
    if (ariaLabel || ariaLabelledBy) hasLabel = true
    
    // Title is not sufficient but better than nothing
    if (!hasLabel && !title) {
      violations.push({
        type: 'missing-label',
        severity: 'error',
        message: 'Form control is missing a label',
        element: control,
        selector: getElementSelector(control),
        wcagCriterion: '1.3.1 Info and Relationships, 3.3.2 Labels or Instructions',
        howToFix: 'Add a label element, aria-label, or aria-labelledby attribute'
      })
    }
  })
  
  return violations
}

/**
 * Test heading structure
 */
function testHeadingStructure(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  
  if (headings.length === 0) {
    violations.push({
      type: 'missing-heading-structure',
      severity: 'warning',
      message: 'No headings found - consider adding heading structure',
      wcagCriterion: '1.3.1 Info and Relationships',
      howToFix: 'Add headings (h1-h6) to structure your content'
    })
    return violations
  }
  
  // Check for h1
  const h1Elements = headings.filter(h => h.tagName === 'H1')
  if (h1Elements.length === 0) {
    violations.push({
      type: 'missing-heading-structure',
      severity: 'warning',
      message: 'No h1 heading found',
      wcagCriterion: '1.3.1 Info and Relationships',
      howToFix: 'Add an h1 element as the main page heading'
    })
  } else if (h1Elements.length > 1) {
    violations.push({
      type: 'missing-heading-structure',
      severity: 'info',
      message: 'Multiple h1 headings found - consider using only one per page',
      wcagCriterion: '1.3.1 Info and Relationships',
      howToFix: 'Use only one h1 per page, use h2-h6 for subsections'
    })
  }
  
  // Check heading hierarchy
  let previousLevel = 0
  headings.forEach((heading) => {
    if (config.exclude.some(selector => heading.matches(selector))) return
    
    const level = parseInt(heading.tagName.charAt(1))
    
    if (previousLevel > 0 && level > previousLevel + 1) {
      violations.push({
        type: 'missing-heading-structure',
        severity: 'warning',
        message: `Heading level ${level} follows level ${previousLevel} - consider using sequential levels`,
        element: heading,
        selector: getElementSelector(heading),
        wcagCriterion: '1.3.1 Info and Relationships',
        howToFix: 'Use heading levels sequentially (h1, h2, h3, etc.)'
      })
    }
    
    previousLevel = level
  })
  
  return violations
}

/**
 * Test color contrast
 */
function testColorContrast(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  
  // Test common text elements
  const textElements = container.querySelectorAll('p, span, div, a, button, input, select, textarea, label, h1, h2, h3, h4, h5, h6')
  
  textElements.forEach((element) => {
    if (config.exclude.some(selector => element.matches(selector))) return
    
    const styles = getComputedStyle(element)
    const color = styles.color
    const backgroundColor = styles.backgroundColor
    
    // Skip if transparent or no background
    if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') return
    
    const contrastResult = checkContrast(color, backgroundColor)
    
    if (contrastResult && contrastResult.ratio < config.minContrastRatio) {
      violations.push({
        type: 'insufficient-contrast',
        severity: 'error',
        message: `Insufficient color contrast: ${contrastResult.ratio.toFixed(2)}:1 (minimum: ${config.minContrastRatio}:1)`,
        element: element,
        selector: getElementSelector(element),
        wcagCriterion: '1.4.3 Contrast (Minimum)',
        howToFix: `Increase color contrast to at least ${config.minContrastRatio}:1`
      })
    }
  })
  
  // Test custom color pairs
  config.colorPairs.forEach(([foreground, background]) => {
    const contrastResult = checkContrast(foreground, background)
    
    if (contrastResult && contrastResult.ratio < config.minContrastRatio) {
      violations.push({
        type: 'insufficient-contrast',
        severity: 'error',
        message: `Insufficient color contrast in custom color pair: ${contrastResult.ratio.toFixed(2)}:1 (minimum: ${config.minContrastRatio}:1)`,
        wcagCriterion: '1.4.3 Contrast (Minimum)',
        howToFix: `Increase color contrast to at least ${config.minContrastRatio}:1`
      })
    }
  })
  
  return violations
}

/**
 * Test focus indicators
 */
function testFocusIndicators(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  const focusableElements = getFocusableElements(container)
  
  focusableElements.forEach((element) => {
    if (config.exclude.some(selector => element.matches(selector))) return
    
    const styles = getComputedStyle(element)
    const outline = styles.outline
    const outlineWidth = styles.outlineWidth
    const boxShadow = styles.boxShadow
    
    // Check if element has visible focus indicator
    if (outline === 'none' && outlineWidth === '0px' && !boxShadow.includes('inset')) {
      violations.push({
        type: 'missing-focus-indicator',
        severity: 'error',
        message: 'Focusable element lacks visible focus indicator',
        element: element,
        selector: getElementSelector(element),
        wcagCriterion: '2.4.7 Focus Visible',
        howToFix: 'Add visible focus styles using outline, box-shadow, or border'
      })
    }
  })
  
  return violations
}

/**
 * Test ARIA attributes
 */
function testAriaAttributes(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [aria-expanded], [aria-pressed], [aria-selected], [aria-checked], [role]')
  
  elementsWithAria.forEach((element) => {
    if (config.exclude.some(selector => element.matches(selector))) return
    
    const attributes: Record<string, any> = {}
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('aria-') || attr.name === 'role') {
        attributes[attr.name] = attr.value
      }
    })
    
    const ariaErrors = validateAriaProps(attributes)
    
    ariaErrors.forEach(error => {
      violations.push({
        type: 'invalid-aria',
        severity: 'error',
        message: `Invalid ARIA attribute: ${error}`,
        element: element,
        selector: getElementSelector(element),
        wcagCriterion: '4.1.2 Name, Role, Value',
        howToFix: 'Correct the ARIA attribute value according to the specification'
      })
    })
  })
  
  return violations
}

/**
 * Test landmark structure
 */
function testLandmarks(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  
  // Check for main landmark
  const mainLandmarks = container.querySelectorAll('main, [role="main"]')
  if (mainLandmarks.length === 0) {
    violations.push({
      type: 'missing-landmark',
      severity: 'warning',
      message: 'No main landmark found',
      wcagCriterion: '1.3.1 Info and Relationships',
      howToFix: 'Add a main element or role="main" to identify the main content area'
    })
  } else if (mainLandmarks.length > 1) {
    violations.push({
      type: 'missing-landmark',
      severity: 'warning',
      message: 'Multiple main landmarks found - should have only one',
      wcagCriterion: '1.3.1 Info and Relationships',
      howToFix: 'Use only one main landmark per page'
    })
  }
  
  // Check for navigation landmarks
  const navLandmarks = container.querySelectorAll('nav, [role="navigation"]')
  if (navLandmarks.length === 0) {
    violations.push({
      type: 'missing-landmark',
      severity: 'info',
      message: 'No navigation landmarks found',
      wcagCriterion: '1.3.1 Info and Relationships',
      howToFix: 'Add nav elements or role="navigation" to identify navigation areas'
    })
  }
  
  return violations
}

/**
 * Test keyboard navigation
 */
function testKeyboardNavigation(container: Element, config: Required<TestConfig>): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = []
  const interactiveElements = container.querySelectorAll('button, a, input, select, textarea, [tabindex], [role="button"], [role="link"], [role="tab"], [role="menuitem"]')
  
  interactiveElements.forEach((element) => {
    if (config.exclude.some(selector => element.matches(selector))) return
    
    // Check if element is focusable
    if (!isFocusable(element)) {
      violations.push({
        type: 'keyboard-trap',
        severity: 'error',
        message: 'Interactive element is not keyboard focusable',
        element: element,
        selector: getElementSelector(element),
        wcagCriterion: '2.1.1 Keyboard',
        howToFix: 'Ensure interactive elements can be reached and operated with keyboard'
      })
    }
    
    // Check for negative tabindex on interactive elements
    const tabIndex = element.getAttribute('tabindex')
    if (tabIndex === '-1' && element.tagName !== 'DIV') {
      violations.push({
        type: 'keyboard-trap',
        severity: 'warning',
        message: 'Interactive element has negative tabindex',
        element: element,
        selector: getElementSelector(element),
        wcagCriterion: '2.1.1 Keyboard',
        howToFix: 'Remove negative tabindex or ensure element is still keyboard accessible'
      })
    }
  })
  
  return violations
}

/**
 * Generate CSS selector for an element
 */
function getElementSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`
  }
  
  const tag = element.tagName.toLowerCase()
  const classes = Array.from(element.classList).join('.')
  
  if (classes) {
    return `${tag}.${classes}`
  }
  
  // Find position among siblings
  const parent = element.parentElement
  if (parent) {
    const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName)
    const index = siblings.indexOf(element)
    if (siblings.length > 1) {
      return `${tag}:nth-of-type(${index + 1})`
    }
  }
  
  return tag
}

/**
 * Generate accessibility report
 * @param result - Test result
 * @returns Formatted report string
 */
export function generateAccessibilityReport(result: AccessibilityTestResult): string {
  const { passed, violations, score, summary } = result
  
  let report = `Accessibility Test Report\n`
  report += `========================\n\n`
  report += `Overall Score: ${score}/100\n`
  report += `Status: ${passed ? 'PASSED' : 'FAILED'}\n\n`
  report += `Summary:\n`
  report += `- Errors: ${summary.error}\n`
  report += `- Warnings: ${summary.warning}\n`
  report += `- Info: ${summary.info}\n\n`
  
  if (violations.length > 0) {
    report += `Violations:\n`
    report += `----------\n\n`
    
    violations.forEach((violation, index) => {
      report += `${index + 1}. ${violation.message}\n`
      report += `   Severity: ${violation.severity.toUpperCase()}\n`
      report += `   WCAG: ${violation.wcagCriterion}\n`
      if (violation.selector) {
        report += `   Element: ${violation.selector}\n`
      }
      if (violation.howToFix) {
        report += `   How to fix: ${violation.howToFix}\n`
      }
      report += `\n`
    })
  } else {
    report += `No violations found!\n`
  }
  
  return report
}

/**
 * Quick accessibility check function
 * @param element - Element to test
 * @returns Simple pass/fail result
 */
export function quickAccessibilityCheck(element: Element = document.body): boolean {
  const result = runAccessibilityTests(element, {
    checkContrast: false, // Skip contrast for quick check
    checkKeyboard: false  // Skip keyboard for quick check
  })
  
  return result.passed
}