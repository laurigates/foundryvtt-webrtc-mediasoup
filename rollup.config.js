import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: 'src/mediasoup-vtt.js',
  output: {
    file: 'dist/mediasoup-vtt.js',
    format: 'es',
    sourcemap: !isProduction
  },
  plugins: [
    nodeResolve(),
    isProduction && terser({
      keep_classnames: true,
      keep_fnames: true
    })
  ].filter(Boolean),
  external: ['mediasoup-client']
};