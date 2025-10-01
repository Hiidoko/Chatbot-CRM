// Schema declarativo de cliente (fonte única de verdade)
// Este objeto será usado no backend e exportado para o frontend via script de build.
// Regras suportadas pelo validador interno:
// - type: 'string'
// - minLength / maxLength
// - pattern (regex string)
// - enum (array)
// - telefone: { digits: true, lengths: [10,11] } (extensão interna)
// - normalizer: nome de função de normalização em utils/normalizer.js
// - required: boolean (se omitido assume true em full validation)
// - messages: { required, invalid, enum, pattern, length }

const STATUS_VALUES = ['novo','em andamento','contatado','convertido','perdido'];

const clienteSchema = {
  $id: 'clienteSchema',
  type: 'object',
  description: 'Schema de validação para entidade Cliente',
  properties: {
    nome: {
      type: 'string',
      minLength: 2,
      pattern: "^[A-Za-zÀ-ÿ'\\-\\s]{2,}$",
      normalizer: 'normalizeNomeCidade',
      messages: {
        required: "Campo 'nome' é obrigatório.",
        invalid: "Nome inválido.",
        pattern: "Nome inválido (mín. 2 letras)."
      }
    },
    email: {
      type: 'string',
      pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
      normalizer: 'normalizeEmail',
      messages: {
        required: "Campo 'email' é obrigatório.",
        invalid: 'E-mail inválido.',
        pattern: 'E-mail inválido.'
      }
    },
    telefone: {
      type: 'string',
      digits: true,
      lengths: [10,11],
      normalizer: 'normalizeTelefone',
      messages: {
        required: "Campo 'telefone' é obrigatório.",
        invalid: 'Telefone deve ter 10 ou 11 dígitos.'
      }
    },
    cidade: {
      type: 'string',
      minLength: 2,
      pattern: "^[A-Za-zÀ-ÿ'\\-\\s]{2,}$",
      normalizer: 'normalizeNomeCidade',
      messages: {
        required: "Campo 'cidade' é obrigatório.",
        invalid: 'Cidade inválida.',
        pattern: 'Cidade inválida.'
      }
    },
    maquina: {
      type: 'string',
      minLength: 2,
      normalizer: 'normalizeMaquina',
      messages: {
        required: "Campo 'maquina' é obrigatório.",
        invalid: 'Máquina inválida.'
      }
    },
    horario: {
      type: 'string',
      minLength: 2,
      normalizer: 'normalizeHorario',
      messages: {
        required: "Campo 'horario' é obrigatório.",
        invalid: 'Horário inválido.'
      }
    },
    status: {
      type: 'string',
      enum: STATUS_VALUES,
      normalizer: 'trimString',
      messages: {
        required: "Campo 'status' é obrigatório.",
        enum: 'Status inválido.'
      }
    },
    origem: {
      type: 'string',
      enum: ['chatbot','manual'],
      normalizer: 'trimString',
      messages: {
        enum: 'Origem inválida.'
      },
      required: false
    }
  },
  required: ['nome','email','telefone','cidade','maquina','horario']
};

module.exports = { clienteSchema, STATUS_VALUES };
