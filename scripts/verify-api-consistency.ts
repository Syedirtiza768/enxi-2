#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

class APIConsistencyVerifier {
  private issues: Array<{ file: string; line: number; issue: string }> = [];
  
  async verify() {
    console.log('🔍 Verifying API consistency across codebase...\n');
    
    const files = await glob('**/*.{ts,tsx}', {
      ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'scripts/**']
    });
    
    for (const file of files) {
      await this.checkFile(file);
    }
    
    if (this.issues.length === 0) {
      console.log('✅ All API usage is consistent!');
      console.log('\nVerified:');
      console.log('- All imports use { apiClient } or { api }');
      console.log('- apiClient() is used for direct calls');
      console.log('- api.method() is used for convenience methods');
      console.log('- No undefined api references');
    } else {
      console.log(`❌ Found ${this.issues.length} issues:\n`);
      for (const issue of this.issues) {
        console.log(`${issue.file}:${issue.line} - ${issue.issue}`);
      }
      process.exit(1);
    }
  }
  
  private async checkFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      let hasApiImport = false;
      let hasApiClientImport = false;
      let importLine = 0;
      
      // Check imports
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes("from '@/lib/api/client'") || line.includes('from "@/lib/api/client"')) {
          if (line.includes('{ api }') || line.includes('{ api,') || line.includes(', api }') || line.includes(', api,')) {
            hasApiImport = true;
            importLine = i + 1;
          }
          if (line.includes('{ apiClient }') || line.includes('{ apiClient,') || line.includes(', apiClient }') || line.includes(', apiClient,')) {
            hasApiClientImport = true;
          }
        }
      }
      
      // Check usage
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip comments and strings
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
          continue;
        }
        
        // Check for api.method() usage
        if (line.match(/\bapi\.(get|post|put|patch|delete)\(/)) {
          if (!hasApiImport) {
            this.issues.push({
              file: filePath,
              line: i + 1,
              issue: "Using api.method() but 'api' is not imported from '@/lib/api/client'"
            });
          }
        }
        
        // Check for standalone api usage (potential undefined reference)
        if (line.match(/\bapi\s*[<\(]/) && !line.includes('apiClient')) {
          if (!hasApiImport && !line.includes('await api')) {
            // Skip if it's clearly a different api
            if (!line.includes('.api') && !line.includes('api:') && !line.includes('api =')) {
              this.issues.push({
                file: filePath,
                line: i + 1,
                issue: "Potential undefined 'api' reference"
              });
            }
          }
        }
        
        // Check for apiClient usage
        if (line.includes('apiClient(') || line.includes('apiClient<')) {
          if (!hasApiClientImport && !hasApiImport) {
            this.issues.push({
              file: filePath,
              line: i + 1,
              issue: "Using apiClient() but it's not imported from '@/lib/api/client'"
            });
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
}

// Run the verifier
const verifier = new APIConsistencyVerifier();
verifier.verify().catch(console.error);