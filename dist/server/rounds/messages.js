"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRoundReminderMessage = buildRoundReminderMessage;
exports.buildRoundOverdueMessage = buildRoundOverdueMessage;
exports.buildRoundObservationAlertMessage = buildRoundObservationAlertMessage;
exports.buildRoundAssignmentMessage = buildRoundAssignmentMessage;
const templates_1 = require("../messages/templates");
function buildRoundReminderMessage(input) {
    return (0, templates_1.roundReminder)(input);
}
function buildRoundOverdueMessage(input) {
    return (0, templates_1.roundOverdue)(input);
}
function buildRoundObservationAlertMessage(input) {
    return (0, templates_1.roundObservationAlert)(input);
}
function buildRoundAssignmentMessage(input) {
    return (0, templates_1.roundAssignment)(input);
}
