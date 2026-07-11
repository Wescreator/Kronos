const AppError = require('./AppError')

/**
 * Validação de "magic bytes" (assinatura real do arquivo).
 *
 * O multer só confere o MIME declarado pelo cliente — que é falsificável.
 * Um atacante pode enviar um HTML/SVG com script (XSS armazenado) ou um
 * executável renomeado com Content-Type de imagem. Aqui conferimos os
 * primeiros bytes do buffer contra a assinatura esperada do MIME.
 *
 * Tipos sem assinatura binária confiável (text/plain, text/csv) são
 * liberados: servidos com o próprio Content-Type textual, o navegador não
 * os executa como HTML. O objetivo é barrar binários/documentos disfarçados
 * de imagem/PDF, não validar texto puro.
 */

// Cada entrada: função que recebe o Buffer e diz se casa com a assinatura.
const startsWith = (buf, bytes) =>
  bytes.every((b, i) => buf[i] === b)

const asciiAt = (buf, offset, str) =>
  buf.slice(offset, offset + str.length).toString('latin1') === str

const SIGNATURES = {
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/png':  (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/gif':  (b) => asciiAt(b, 0, 'GIF87a') || asciiAt(b, 0, 'GIF89a'),
  'image/webp': (b) => asciiAt(b, 0, 'RIFF') && asciiAt(b, 8, 'WEBP'),
  'application/pdf': (b) => asciiAt(b, 0, '%PDF'),
  // OpenXML (docx/xlsx/pptx) e zip: contêiner ZIP → "PK".
  'application/zip': (b) => startsWith(b, [0x50, 0x4b]),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => startsWith(b, [0x50, 0x4b]),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => startsWith(b, [0x50, 0x4b]),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': (b) => startsWith(b, [0x50, 0x4b]),
  // Formatos Office legados (doc/xls/ppt) → contêiner OLE2 (D0 CF 11 E0...).
  'application/msword':            (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  'application/vnd.ms-excel':      (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  'application/vnd.ms-powerpoint': (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
}

// MIMEs textuais sem assinatura binária: liberados sem checagem de bytes.
const NO_SIGNATURE = new Set(['text/plain', 'text/csv'])

/**
 * Lança AppError(400) se o conteúdo não corresponder ao MIME declarado.
 * Não faz nada para tipos textuais liberados ou buffers vazios/ausentes
 * (esses casos já são tratados antes por quem chama).
 *
 * @param {Buffer} buffer
 * @param {string} declaredMime
 */
function validateFileSignature(buffer, declaredMime) {
  if (!buffer || !buffer.length) return
  if (NO_SIGNATURE.has(declaredMime)) return

  const check = SIGNATURES[declaredMime]
  // MIME fora do mapa: a allowlist do multer já limitou os tipos aceitos;
  // se chegou aqui um tipo sem assinatura conhecida, não bloqueamos por
  // ausência de regra (evita falso-positivo em tipos legítimos futuros).
  if (!check) return

  if (!check(buffer)) {
    throw new AppError(400, 'Conteúdo do arquivo não corresponde ao tipo declarado.')
  }
}

module.exports = { validateFileSignature }
