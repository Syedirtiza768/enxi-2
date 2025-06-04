/**
 * ESLint rule to prevent empty values in Select.Item components
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent empty string values in SelectItem components',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      emptySelectValue: 'SelectItem must have a non-empty string value. Use placeholder prop on SelectTrigger instead.',
      missingSelectValue: 'SelectItem is missing a value prop.',
    },
  },

  create(context) {
    return {
      JSXElement(node) {
        const elementName = node.openingElement.name.name
        
        // Check for SelectItem components
        if (elementName === 'SelectItem') {
          const valueAttr = node.openingElement.attributes.find(
            attr => attr.type === 'JSXAttribute' && attr.name.name === 'value'
          )
          
          if (!valueAttr) {
            context.report({
              node: node.openingElement,
              messageId: 'missingSelectValue',
            })
            return
          }
          
          // Check for empty string value
          if (
            valueAttr.value &&
            valueAttr.value.type === 'Literal' &&
            valueAttr.value.value === ''
          ) {
            context.report({
              node: valueAttr,
              messageId: 'emptySelectValue',
            })
          }
          
          // Check for empty string in JSX expression
          if (
            valueAttr.value &&
            valueAttr.value.type === 'JSXExpressionContainer' &&
            valueAttr.value.expression.type === 'Literal' &&
            valueAttr.value.expression.value === ''
          ) {
            context.report({
              node: valueAttr,
              messageId: 'emptySelectValue',
            })
          }
        }
      },
    }
  },
}