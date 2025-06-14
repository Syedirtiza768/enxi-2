# Quotation Form Validation Enhancements

## Overview
The quotation form has been enhanced with comprehensive validation following the patterns from customer and lead forms. The validation provides real-time feedback with visual indicators and ensures data integrity.

## Key Enhancements Implemented

### 1. Visual Validation Indicators
- **Red asterisks (*)** for required fields
- **CheckCircle2 icons** (green) for valid fields
- **AlertCircle icons** (red) for fields with errors
- **Character counters** for text areas and limited input fields
- **Border color changes**: red for errors, green for valid fields

### 2. Required Field Validation
The following fields are marked as required with proper validation:
- **Sales Case** - Must select an open sales case
- **Valid Until Date** - Must be a future date (max 6 months)
- **Payment Terms** - Standard terms or custom entry
- **Quotation Items** - At least one item required

### 3. Field-Specific Validations

#### Sales Case
- Required field
- Only shows open sales cases
- Validates that selected case is still open
- Shows info message when no open cases available

#### Valid Until Date
- Required field
- Must be at least tomorrow
- Cannot be more than 6 months in the future
- Date picker with min/max constraints

#### Payment Terms
- Required field
- Dropdown with standard options (Net 7, Net 30, etc.)
- Custom entry option with character limit (100 chars)
- Real-time validation of custom terms

#### Delivery Terms
- Optional field
- Character limit: 200 characters
- Character counter displayed

#### Notes (Customer Visible)
- Optional field
- Character limit: 1000 characters
- Character counter with info about visibility

#### Internal Notes
- Optional field  
- Character limit: 1000 characters
- Warning icon indicating internal use only

#### Line Items
Each line item validates:
- **Item Code**: Required, max 50 chars, uppercase
- **Description**: Required, max 500 chars
- **Quantity**: Required, must be > 0, max 999,999
- **Unit Price**: Required, >= 0, max 9,999,999.99
- **Discount**: Optional, 0-100%
- **Tax Rate**: Optional, 0-100%
- **Margin Check**: Warning if selling below cost

### 4. Real-Time Validation
- Fields validate as user types (onChange)
- Validation also triggered on blur
- Form validates continuously to update submit button state
- Error messages appear immediately when fields become invalid

### 5. Form Submission Validation
- Submit buttons disabled when form is invalid
- "Save as Draft" also requires valid form
- Tooltip shows "Please fill in all required fields" on disabled buttons
- All fields marked as touched on submit attempt
- Scrolls to first error field if validation fails

### 6. Validation State Management
- `touchedFields` Set tracks which fields have been interacted with
- `validationErrors` object stores current error messages
- `fieldValidationStatus` tracks valid/invalid/checking states
- `isFormValid` boolean controls submit button states

### 7. Character Limits Enforced
All text inputs have proper maxLength attributes matching backend limits:
- Item Code: 50 characters
- Description: 500 characters  
- Line Description: 200 characters
- Payment Terms: 100 characters
- Delivery Terms: 200 characters
- Notes/Internal Notes: 1000 characters

### 8. Line Item Editor Integration
The LineItemEditorV2 component provides:
- Individual field validation for each item
- Visual feedback with CheckCircle2/AlertCircle icons
- Character counters for text fields
- Duplicate item code detection within lines
- Margin warnings for below-cost pricing
- Validation summary showing count of items with errors

### 9. Error Display Patterns
- Field-level errors shown below inputs with AlertCircle icon
- General form errors in red alert box at top
- Auto-save errors in orange alert box
- Success messages in green with CheckCircle icon

### 10. Accessibility & UX
- Clear "* Required fields" indicator
- Consistent icon usage across all forms
- Smooth transitions for validation states
- Loading states with proper disabled states
- Proper ARIA attributes via data-has-error

## Code Structure

### Validation Functions
- `validateField()` - Central validation for all fields
- `validateForm()` - Full form validation
- Uses validators from `/lib/validators/quotation.validator.ts`
- Leverages common validators from `/lib/validators/common.validator.ts`

### State Management
```typescript
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
const [fieldValidationStatus, setFieldValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking'>>({})
const [isFormValid, setIsFormValid] = useState(false)
const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
```

### Validation Flow
1. User interacts with field → field added to touchedFields
2. onChange/onBlur triggers validateField()
3. Updates validationErrors and fieldValidationStatus
4. validateForm() checks all required fields
5. Updates isFormValid state
6. Submit buttons enable/disable based on isFormValid

## Testing the Enhancements

To test the validation enhancements:

1. **Empty Form Test**
   - Try submitting empty form
   - Should show all required field errors
   - Submit buttons should be disabled

2. **Required Fields Test**
   - Fill in only some required fields
   - Verify submit remains disabled until all required fields valid

3. **Character Limit Test**
   - Type in text fields to max length
   - Verify counters update correctly
   - Verify input stops at max length

4. **Date Validation Test**
   - Try selecting past date for Valid Until
   - Try selecting date > 6 months future
   - Verify error messages appear

5. **Line Item Test**
   - Add items without required fields
   - Verify validation errors appear
   - Try duplicate item codes
   - Test quantity/price limits

6. **Visual Feedback Test**
   - Fill fields correctly - see green checkmarks
   - Clear required fields - see red alerts
   - Verify border colors change appropriately

The quotation form now provides a robust, user-friendly validation experience consistent with other forms in the system.