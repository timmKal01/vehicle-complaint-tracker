import { Actor, log } from 'apify';
import { fetchComplaints } from './nhtsa.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { make, model, yearFrom = 2018, yearTo = 2026, seriousOnly = false, maxResults = 50 } = input;

if (!make || !model) {
    throw new Error('Both "make" and "model" are required.');
}
if (yearFrom > yearTo) {
    throw new Error('"yearFrom" must be less than or equal to "yearTo".');
}
if (yearTo - yearFrom > 15) {
    throw new Error('Model year range cannot exceed 15 years.');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const COMPLAINT_SEARCH_EVENT = 'complaint-search';

const complaints = await fetchComplaints({
    make,
    model,
    yearFrom,
    yearTo,
    seriousOnly,
    maxResults: Math.min(maxResults, 200),
});

for (const complaint of complaints) {
    await Actor.pushData(complaint);
}

await Actor.charge({ eventName: COMPLAINT_SEARCH_EVENT });

log.info(`Pushed ${complaints.length} complaint(s) for ${make} ${model} (${yearFrom}-${yearTo})`);

await Actor.exit();
