const BASE_URL = 'https://api.nhtsa.gov/complaints/complaintsByVehicle';

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 15_000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** NHTSA returns dates as MM/DD/YYYY. */
function toIsoDate(mdy) {
    const [month, day, year] = mdy.split('/');
    if (!month || !day || !year) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function fetchComplaintsForYear(make, model, year) {
    const url = new URL(BASE_URL);
    url.searchParams.set('make', make);
    url.searchParams.set('model', model);
    url.searchParams.set('modelYear', String(year));

    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res;
        let body;
        try {
            res = await fetch(url, { headers: { Connection: 'close' }, signal: controller.signal });
            body = await res.json().catch(() => null);
        } catch (err) {
            lastError = err.name === 'AbortError' ? new Error(`NHTSA request timed out for model year ${year}`) : err;
            if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
            continue;
        } finally {
            clearTimeout(timeoutId);
        }
        // NHTSA returns HTTP 400 even for a genuine zero-results response (e.g. a model
        // year with no complaints filed yet) — trust the parsed body over the status code.
        if (body && Array.isArray(body.results)) return body.results;
        if (!TRANSIENT_STATUSES.has(res.status)) {
            throw new Error(`NHTSA API request failed for model year ${year}: ${res.status} ${res.statusText}`);
        }
        lastError = new Error(`NHTSA API request failed for model year ${year}: ${res.status} ${res.statusText}`);
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
    throw lastError;
}

export async function fetchComplaints({ make, model, yearFrom, yearTo, seriousOnly, maxResults }) {
    const years = [];
    for (let year = yearFrom; year <= yearTo; year++) years.push(year);

    const byOdiNumber = new Map();
    for (const year of years) {
        const complaints = await fetchComplaintsForYear(make, model, year);
        for (const c of complaints) {
            if (byOdiNumber.has(c.odiNumber)) continue;
            const isSerious = c.crash || c.fire || c.numberOfInjuries > 0 || c.numberOfDeaths > 0;
            if (seriousOnly && !isSerious) continue;
            byOdiNumber.set(c.odiNumber, {
                odiNumber: c.odiNumber,
                manufacturer: c.manufacturer,
                vehicle: c.products?.[0]
                    ? {
                          make: c.products[0].productMake,
                          model: c.products[0].productModel,
                          year: c.products[0].productYear,
                      }
                    : null,
                components: c.components,
                summary: c.summary,
                crash: c.crash,
                fire: c.fire,
                numberOfInjuries: c.numberOfInjuries,
                numberOfDeaths: c.numberOfDeaths,
                dateOfIncident: toIsoDate(c.dateOfIncident),
                dateComplaintFiled: toIsoDate(c.dateComplaintFiled),
                vin: c.vin,
            });
        }
    }

    return [...byOdiNumber.values()]
        .sort((a, b) => (b.dateComplaintFiled ?? '').localeCompare(a.dateComplaintFiled ?? ''))
        .slice(0, maxResults);
}
