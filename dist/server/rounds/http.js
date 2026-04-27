"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db = __importStar(require("../db"));
const env_1 = require("../_core/env");
const service_1 = require("./service");
const schedule_1 = require("./schedule");
const roundsHttpRouter = (0, express_1.Router)();
const roundsService = (0, service_1.createRoundsService)(db);
roundsHttpRouter.post('/internal/rondas/run', async (req, res) => {
    const cronSecret = (0, env_1.readEnv)('CRON_SECRET');
    if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const dateKey = typeof req.body?.dateKey === 'string'
        ? req.body.dateKey
        : (0, schedule_1.getBuenosAiresDateKey)();
    const created = await roundsService.createDailyOccurrences(dateKey);
    const reminders = await roundsService.runReminderCycle();
    return res.json({
        success: true,
        dateKey,
        created: created.length,
        ...reminders,
    });
});
exports.default = roundsHttpRouter;
