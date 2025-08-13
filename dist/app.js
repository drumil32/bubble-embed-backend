"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const routes_1 = require("./routes");
const error_middleware_1 = require("./middleware/error.middleware");
const logging_middleware_1 = require("./middleware/logging.middleware");
const createApp = () => {
    const app = (0, express_1.default)();
    // Trust proxy for nginx
    app.set('trust proxy', 'loopback'); // TODO: test this on production after changing ip
    // Middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Logging middleware
    app.use(logging_middleware_1.requestLoggingMiddleware);
    // Routes
    app.use('/api', routes_1.routes);
    // Error handling
    app.use(error_middleware_1.errorMiddleware);
    return app;
};
exports.createApp = createApp;
