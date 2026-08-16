const BASE_URL = 'https://api.nhtsa.gov/complaints/complaintsByVehicle';

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

    const res = await fetch(url, { headers: { Connection: 'close' } });
    if (!res.ok) {
        throw new Error(`NHTSA API request failed for model year ${year}: ${res.status} ${res.statusText}`);
    }
    const body = await res.json();
    return body.results ?? [];
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
