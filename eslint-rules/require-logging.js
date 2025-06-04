module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require debug logging in API routes and services',
      category: 'Best Practices',
      recommended: true
    },
    fixable: 'code',
    schema: []
  },
  create(context) {
    return {
      // Check API route exports
      'ExportNamedDeclaration > FunctionDeclaration[id.name=/^(GET|POST|PUT|DELETE|PATCH)$/]': function(node) {
        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText(node);
        
        if (!text.includes('withLogging')) {
          context.report({
            node,
            message: 'API route handlers should use withLogging wrapper',
            fix(fixer) {
              // This is a simplified fix - in practice you'd need more complex logic
              return null; // Manual fix required
            }
          });
        }
      },
      
      // Check service classes
      'ClassDeclaration[superClass.name!="BaseService"]': function(node) {
        const className = node.id.name;
        if (className.endsWith('Service')) {
          context.report({
            node,
            message: 'Service classes should extend BaseService for logging',
            fix(fixer) {
              return null; // Manual fix required
            }
          });
        }
      }
    };
  }
};