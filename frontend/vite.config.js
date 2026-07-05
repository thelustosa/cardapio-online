import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sri from 'vite-plugin-sri'

// ================= VITE BLINDADO: PRODUÇÃO ANTI-ENGENHARIA REVERSA ================= //
export default defineConfig({
  plugins: [
    react(),
    // SRI (Subresource Integrity) — Valida hashes de scripts e styles no build final
    // Previne injeção de código malicioso em CDNs ou proxies intermediários
    sri({
      algorithms: ['sha384']
    })
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // 1. DESATIVAÇÃO PERMANENTE DE SOURCE MAPS
  // Impede que o navegador acesse o código-fonte original via DevTools
  build: {
    sourcemap: false,

    // 2. MINIFICAÇÃO EXTREMA (Terser com configuração agressiva)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,       // Remove TODOS os console.log/warn/error
        drop_debugger: true,      // Remove todos os debugger statements
        pure_funcs: ['console.info', 'console.debug', 'console.trace'],
        passes: 3,                // 3 passadas de compressão para máxima redução
        dead_code: true,          // Remove código morto/não utilizado
        collapse_vars: true,      // Colapsa variáveis de uso único
        reduce_vars: true,        // Reduz variáveis quando possível
        booleans_as_integers: true, // Converte true/false em 1/0
        arguments: true,          // Substitui arguments por parâmetros nomeados
        hoist_funs: true,         // Eleva declarações de funções ao topo
        hoist_vars: false,        // Mantém false para evitar quebra de escopo
        toplevel: true,           // Compressão agressiva de escopo global
        unsafe_math: true,        // Otimizações matemáticas agressivas
        unsafe_proto: true        // Otimizações de __proto__ (seguro para React SPA)
      },
      mangle: {
        toplevel: true,           // Renomeia variáveis de escopo global
        properties: {
          // Renomeia propriedades privadas (começando com _)
          // Isso resolve a exposição de nomes no console/DevTools
          regex: /^_/,            // Só renomeia propriedades prefixadas com _
          reserved: [
            // Palavras-chave do React que NÃO podem ser renomeadas
            'render', 'Component', 'useState', 'useEffect', 'useRef',
            'useCallback', 'useMemo', 'useContext', 'createRoot',
            'createElement', 'Fragment', 'StrictMode', 'children',
            'props', 'state', 'key', 'ref', 'current', 'className',
            'style', 'onClick', 'onChange', 'onSubmit', 'value',
            'checked', 'disabled', 'type', 'id', 'name', 'href',
            'src', 'alt', 'placeholder', 'target', 'method'
          ]
        },
        // Ofusca nomes de funções no stack trace (resolve exposição no console)
        keep_fnames: false,
        // Ofusca nomes de classes
        keep_classnames: false
      },
      format: {
        comments: false,          // Remove TODOS os comentários do código final
        ascii_only: true,         // Força ASCII puro (evita problemas de encoding)
        ecma: 2020,               // Usa sintaxe JS moderna para saída mais compacta
        wrap_func_args: false     // Não envolve argumentos de função
      }
    },

    // 3. FRAGMENTAÇÃO (Code Splitting) para dificultar leitura sequencial
    rollupOptions: {
      output: {
        // Nomes de arquivo com hash para cache-busting e ofuscação de rotas
        entryFileNames: 'assets/z-[hash].js',
        chunkFileNames: 'assets/z-[hash].js',
        assetFileNames: 'assets/z-[hash].[ext]',

        // Separação estratégica de chunks
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-core';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            return 'vendor-libs';
          }
        }
      }
    },

    // 4. Tamanho máximo de chunk para fragmentar mais
    chunkSizeWarningLimit: 500,

    // 5. Output limpo
    outDir: 'dist',
    emptyOutDir: true
  },

  // 6. CSS MODULES COM HASHES ALEATÓRIOS
  css: {
    modules: {
      // Gera classes como "_z3x8k2" em vez de "category-sidebar"
      generateScopedName: '_z[hash:base64:6]',
      localsConvention: 'camelCase'
    },
    // Desativa sourcemaps de CSS também
    devSourcemap: false
  }
})
