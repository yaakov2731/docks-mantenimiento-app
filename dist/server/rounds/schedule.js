"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBuenosAiresDateKey = getBuenosAiresDateKey;
exports.saveRoundScheduleAndSyncToday = saveRoundScheduleAndSyncToday;
function getBuenosAiresDateKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
        throw new Error('Could not derive Buenos Aires date key');
    }
    return `${year}-${month}-${day}`;
}
async function saveRoundScheduleAndSyncToday(repo, input, now = new Date()) {
    const result = await repo.saveRoundSchedule(input);
    await repo.createDailyOccurrences(getBuenosAiresDateKey(now));
    return result;
}
