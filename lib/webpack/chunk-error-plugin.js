// Webpack plugin to handle chunk loading errors
class ChunkErrorPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('ChunkErrorPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ChunkErrorPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        () => {
          // Add error handling to the runtime
          const RuntimeGlobals = compiler.webpack.RuntimeGlobals;
          const RuntimeModule = compiler.webpack.RuntimeModule;
          
          compilation.hooks.runtimeRequirementInTree
            .for(RuntimeGlobals.ensureChunkHandlers)
            .tap('ChunkErrorPlugin', (chunk, set) => {
              compilation.addRuntimeModule(
                chunk,
                new ChunkErrorHandlerModule()
              );
            });
        }
      );
    });
  }
}

class ChunkErrorHandlerModule extends (require('webpack').RuntimeModule) {
  constructor() {
    super('chunk error handler');
  }

  generate() {
    return `
      // Chunk error handling
      (function() {
        var originalEnsure = __webpack_require__.e;
        var retryAttempts = {};
        var maxRetries = 3;
        
        __webpack_require__.e = function(chunkId) {
          var key = 'chunk_' + chunkId;
          retryAttempts[key] = retryAttempts[key] || 0;
          
          return originalEnsure(chunkId).catch(function(error) {
            if (retryAttempts[key] >= maxRetries) {
              console.error('Failed to load chunk after retries:', chunkId, error);
              
              // Emit custom event
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('chunkloaderror', {
                  detail: { chunkId: chunkId, error: error }
                }));
              }
              
              throw error;
            }
            
            retryAttempts[key]++;
            console.warn('Retrying chunk load (attempt ' + retryAttempts[key] + '):', chunkId);
            
            // Exponential backoff
            return new Promise(function(resolve) {
              setTimeout(resolve, Math.pow(2, retryAttempts[key] - 1) * 1000);
            }).then(function() {
              return originalEnsure(chunkId);
            });
          });
        };
      })();
    `;
  }
}

module.exports = ChunkErrorPlugin;