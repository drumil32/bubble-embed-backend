"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const customTimestamp = () => {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};
const logFormat = printf(({ level, message, stack, ...meta }) => {
    const ts = customTimestamp();
    let log = `${ts} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    if (stack) {
        log += `\n${stack}`;
    }
    return log;
});
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), logFormat),
    transports: [
        new winston_1.default.transports.Console({
            format: combine(colorize(), errors({ stack: true }), logFormat)
        })
    ]
});
