/**
 * ESLint rule to prevent raw fetch calls without proper auth handling
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent raw fetch calls - use apiClient instead',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noRawFetch: 'Use apiClient or api helper methods instead of raw fetch() calls to ensure proper authentication and error handling.',
      missingAuth: 'fetch() call detected without Authorization header. Use apiClient for automatic auth handling.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // Check for fetch() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'fetch'
        ) {
          // Allow fetch in specific files (like the apiClient itself)
          const filename = context.getFilename()
          
          if (
            filename.includes('lib/api/client.ts') ||
            filename.includes('node_modules') ||
            filename.includes('tests/') ||
            filename.includes('.test.') ||
            filename.includes('.spec.')
          ) {
            return
          }

          // Check if this is a fetch call with options
          const hasOptions = node.arguments.length > 1
          
          if (hasOptions) {
            const options = node.arguments[1]
            
            // Check for Authorization header in options
            if (options.type === 'ObjectExpression') {
              const headersProperty = options.properties.find(
                prop => 
                  prop.type === 'Property' &&
                  prop.key.type === 'Identifier' &&
                  prop.key.name === 'headers'
              )
              
              if (headersProperty && headersProperty.value.type === 'ObjectExpression') {
                const authHeader = headersProperty.value.properties.find(
                  prop =>
                    prop.type === 'Property' &&
                    ((prop.key.type === 'Identifier' && prop.key.name === 'Authorization') ||
                     (prop.key.type === 'Literal' && prop.key.value === 'Authorization'))
                )
                
                if (!authHeader) {
                  context.report({
                    node,
                    messageId: 'missingAuth',
                  })
                  return
                }
              } else if (!headersProperty) {
                context.report({
                  node,
                  messageId: 'missingAuth',
                })
                return
              }
            }
          }
          
          // Report any raw fetch call
          context.report({
            node,
            messageId: 'noRawFetch',
          })
        }
      },
    }
  },
}