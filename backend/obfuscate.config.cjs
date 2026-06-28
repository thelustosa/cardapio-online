// ================= JAVASCRIPT-OBFUSCATOR: CONFIGURAÇÃO BLINDADA ================= //
// Este arquivo configura a ofuscação agressiva do código backend.
// O resultado é funcional para o Node.js, mas ilegível para humanos.

module.exports = {
  // Compactação máxima: remove espaços, quebras de linha e indentação
  compact: true,

  // Controle de fluxo: embaralha a ordem de execução das instruções
  // Torna impossível seguir a lógica lendo o código sequencialmente
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,

  // Código morto injetado: adiciona blocos de código falso que nunca executam
  // Confunde ferramentas de análise estática e leitores humanos
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,

  // Output para debug desativado
  debugProtection: false,         // true trava DevTools (não necessário em backend)
  debugProtectionInterval: 0,

  // Desativa console (opcional para backend - mantenha false para manter logs do Winston)
  disableConsoleOutput: false,

  // Transforma identificadores em nomes hexadecimais (_0x4a3b2c)
  identifierNamesGenerator: 'hexadecimal',

  // Log desativado no obfuscator
  log: false,

  // Embaralha a ordem de declaração de variáveis
  numbersToExpressions: true,

  // Renomeia variáveis globais e locais
  renameGlobals: false,   // false para não quebrar imports do Node.js

  // Rotaciona e criptografa arrays de strings
  rotateStringArray: true,
  selfDefending: false,    // false para não quebrar em ambientes Node.js

  // Embaralha strings literais tornando-as ininteligíveis
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 8,

  // Criptografia RC4 em todas as strings do código
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,

  // Strings que NÃO devem ser ofuscadas (CORS, domínios, headers críticos)
  reservedStrings: [
    'zestmenu\\.com\\.br',
    'localhost',
    'Access-Control-',
    'Origin',
    'Content-Type',
    'CSRF-Token',
    'X-Nonce-Token',
    'OPTIONS',
    'credentials',
    'cookie'
  ],

  // Transforma objetos em chamadas dinâmicas
  transformObjectKeys: true,

  // Converte strings Unicode em escapes \x
  unicodeEscapeSequence: false
};
