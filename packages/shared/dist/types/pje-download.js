"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PJE_MAX_RETRIES = exports.PJE_DOWNLOAD_BATCH_SIZE = exports.PJE_DEFAULT_WAIT_TIME = exports.PJE_DEFAULT_PAGE_SIZE = exports.PJE_MAX_CONCURRENT_JOBS = exports.PJE_2FA_TTL = exports.PJE_SESSION_TTL = exports.PJE_REDIS_KEYS = exports.PJE_QUEUE_NAME = void 0;
exports.PJE_QUEUE_NAME = 'pje-download';
exports.PJE_REDIS_KEYS = {
    session: (userId) => `pje:session:${userId}`,
    twoFaCode: (jobId) => `pje:2fa:${jobId}`,
    twoFaRequest: (jobId) => `pje:2fa-request:${jobId}`,
    progress: (jobId) => `pje:progress:${jobId}`,
};
exports.PJE_SESSION_TTL = 8 * 60 * 60;
exports.PJE_2FA_TTL = 5 * 60;
exports.PJE_MAX_CONCURRENT_JOBS = 3;
exports.PJE_DEFAULT_PAGE_SIZE = 500;
exports.PJE_DEFAULT_WAIT_TIME = 300;
exports.PJE_DOWNLOAD_BATCH_SIZE = 10;
exports.PJE_MAX_RETRIES = 2;
//# sourceMappingURL=pje-download.js.map