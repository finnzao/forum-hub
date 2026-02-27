// ============================================================
// PATCH para pje-download.controller.ts
// Na rota POST '/auth/profile', SUBSTITUIR o bloco de erro:
// ============================================================

// ANTES:
//
//   if (result.error) {
//     return reply.status(400).send({
//       success: false,
//       error: { code: 'PROFILE_ERROR', message: result.error, statusCode: 400 },
//     });
//   }

// DEPOIS:
//
//   if (result.error) {
//     const isExpired = result.error === 'SESSION_EXPIRED';
//     const statusCode = isExpired ? 401 : 400;
//     const code = isExpired ? 'SESSION_EXPIRED' : 'PROFILE_ERROR';
//     const message = isExpired ? 'Sessão PJE expirada. Faça login novamente.' : result.error;
//
//     return reply.status(statusCode).send({
//       success: false,
//       error: { code, message, statusCode },
//     });
//   }
