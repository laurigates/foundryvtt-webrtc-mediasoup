import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const isProduction = process.env.NODE_ENV === 'production';

// Template processing plugin
function templatePlugin() {
  return {
    name: 'template-plugin',
    async generateBundle() {
      try {
        const { processTemplateToString } = require('./scripts/process-template.cjs');
        const moduleJsonContent = processTemplateToString();
        
        // Emit the processed module.json
        this.emitFile({
          type: 'asset',
          fileName: 'module.json',
          source: moduleJsonContent
        });
      } catch (error) {
        console.error('Error processing template:', error);
      }
    }
  };
}

export default {
  input: 'src/mediasoup-vtt.js',
  output: {
    file: 'dist/mediasoup-vtt.js',
    format: 'es',
    sourcemap: !isProduction
  },
  plugins: [
    nodeResolve(),
    templatePlugin(),
    isProduction && terser({
      keep_classnames: true,
      keep_fnames: true
    })
  ].filter(Boolean),
  external: ['mediasoup-client']
};