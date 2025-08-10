"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationRoutes = void 0;
const express_1 = require("express");
const upload_middleware_1 = require("../middleware/upload.middleware");
const organization_controller_1 = require("../controllers/organization.controller");
const router = (0, express_1.Router)();
exports.organizationRoutes = router;
router.post('/register', upload_middleware_1.uploadPdfMiddleware, organization_controller_1.registerOrganization);
