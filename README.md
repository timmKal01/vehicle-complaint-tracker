# Vehicle Complaint Tracker — NHTSA Owner Complaints

Search raw owner-submitted vehicle complaints filed with NHTSA by make,
model, and model-year range. Complaints are the early-warning signal —
patterns show up here months or years before NHTSA opens an
investigation or a manufacturer issues an official recall.

Built for consumer advocates, class-action researchers, journalists, and
used-car buyers who want to know what owners are actually reporting,
not just what's already been officially recalled.

## Input

```json
{
  "make": "Honda",
  "model": "Accord",
  "yearFrom": 2018,
  "yearTo": 2022,
  "seriousOnly": false,
  "maxResults": 50
}
```

| Field | Type | Description |
|---|---|---|
| `make` | string | Vehicle manufacturer, e.g. `"Honda"`, `"Ford"`, `"Toyota"`. |
| `model` | string | Vehicle model, e.g. `"Accord"`, `"Explorer"`, `"Camry"`. |
| `yearFrom` | number | Earliest model year to search (inclusive). Default `2018`. |
| `yearTo` | number | Latest model year to search (inclusive). Default `2026`. Range capped at 15 years. |
| `seriousOnly` | boolean | Only return complaints involving a crash, fire, injury, or death. Default `false`. |
| `maxResults` | number | Max complaints to return, most recently filed first. Default `50`, max `200`. |

## Output

One record per complaint:

```json
{
  "odiNumber": 11755895,
  "manufacturer": "Honda (American Honda Motor Co.)",
  "vehicle": { "make": "HONDA", "model": "ACCORD", "year": "2020" },
  "components": "POWER TRAIN,ENGINE,FUEL/PROPULSION SYSTEM",
  "summary": "The car has a blown head gasket at 72k miles the odometer. This seems to be a major problem with 2018-2022 honda accords with the 1.5 turbo engine...",
  "crash": false,
  "fire": false,
  "numberOfInjuries": 0,
  "numberOfDeaths": 0,
  "dateOfIncident": "2026-04-02",
  "dateComplaintFiled": "2026-08-10",
  "vin": "1HGCV1F35LA"
}
```

`vin` is partial (the last 6-8 characters are redacted by NHTSA before
publication). A search with no matching complaints returns no items but
is still billed once for the search.

## How it works

Direct calls to the official [NHTSA Complaints
API](https://www.nhtsa.gov/nhtsa-datasets-and-apis)
(`api.nhtsa.gov/complaints`), one request per model year in the
requested range, deduplicated by ODI complaint number. No proxy, no
key, no scraping — public-domain U.S. government data.

**Note:** these are unverified consumer-submitted reports, not
confirmed defects — NHTSA publishes them as filed. Treat volume and
pattern as a signal worth investigating, not proof of a defect.

## Pricing note

Billed per **search**, not per complaint returned — one charge whether
the search spans one model year or fifteen, and whether it returns 0
complaints or 200.

## Related products

- [Vehicle Recall Tracker](https://github.com/timmKal01/vehicle-recall-tracker) — official confirmed recalls from the same NHTSA data family, the "after" to this actor's "before"
