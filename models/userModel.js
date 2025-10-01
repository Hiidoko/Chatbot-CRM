const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  // 'unique: true' já cria índice -> evita duplicar manualmente depois
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senhaHash: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
  roles: { type: [String], default: ['user'] }
}, { versionKey: false });

// Removido índice manual duplicado para evitar warning de duplicate schema index

module.exports = mongoose.model('User', userSchema);
