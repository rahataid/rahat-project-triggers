# How to Find and Configure a GLOFAS Station

## Step 1 — Find the station on the GLOFAS map

Go to the GLOFAS flood forecasting portal:
**https://global-flood.copernicus.eu/glofas-forecasting/**

Click on any station marker on the map. A popup will show the station metadata. You need:

| Field | Example | Notes |
|---|---|---|
| Station ID | `G4416` | The GLOFAS point ID — used as `stationId` in config |
| Country | Nepal | For reference |
| Basin | Ganges | For reference |
| River | Babai | For reference |
| Station Name | Chepang | For reference |
| Point ID | SI003022 | Not used in config |

Write down the **Station ID** (e.g. `G4416`). This is the key value you need.

---

## Step 2 — Find the station in the FTP return levels file

Connect to the GLOFAS FTP server:

```
Host:     aux.ecmwf.int
User:     <your_user>
Password: <your_password>
```

Inside the FTP, navigate to the org folder (e.g. `/for_ICIMOD/`). You will see tar.gz files named like:

```
glofas_pointdata_ICIMOD_2026061700.tar.gz
```

Download one and extract it. You get two `.txt` files:

```
glofas_discharge_ICIMOD_2026061700.txt      ← ensemble discharge series
glofas_returnlevels_ICIMOD_2026061700.txt   ← return level thresholds
```

Open the **return levels file**. It has columns:

```
Name  lat  lon  2yr  5yr  20yr  ...
```

Example rows:

```
G4475_Chatara   27.68  87.16  1234.5  2345.6  4567.8
G4416_Chepang   28.12  81.67   456.2   789.3  1234.5
```

Grep for your Station ID:

```bash
grep "G4416" glofas_returnlevels_ICIMOD_*.txt
```

If a row comes back — the station is covered by this org folder. The `stationId` you use in config is the part **before the first `_`** (e.g. `G4416`).

If nothing comes back — this station is not in this org folder. Try a different org folder (see Step 3).

---

## Step 3 — Confirm the station is also in the discharge file

Open the **discharge file**. It is a pandas DataFrame export with columns:

```
(rowIndex)  name  time  member  dis
```

The `name` field is formatted as `<stationId>_<StationName>_<member>` or similar. Grep for the station:

```bash
grep "G4416" glofas_discharge_ICIMOD_*.txt | head -5
```

If rows appear — the discharge data exists for this station in this org folder. You are ready to configure it.

---

## Step 4 — Find the correct `orgFolder`

The org folder is the directory name on the FTP server (without the `for_` prefix). List the FTP root to see all available org folders:

```
/for_ICIMOD/
/for_OTHER_ORG/
...
```

The `orgFolder` value in config is the part after `for_`, e.g. `ICIMOD`.

---

## Step 5 — Add the station to the config

Update the `DATASOURCE` setting in the database (or seed file) under `GLOFAS`:

```json
{
  "GLOFAS": [
    {
      "stationId": "G4416",
      "orgFolder": "ICIMOD",
      "location": "Babai at Chepang"
    }
  ]
}
```

| Field | Where it comes from |
|---|---|
| `stationId` | Station ID from the GLOFAS map (Step 1) |
| `orgFolder` | FTP directory name without `for_` prefix (Step 4) |
| `location` | Human-readable label — used as the river basin key in DB |

---

## Summary

```
GLOFAS map → Station ID (G4416)
        ↓
FTP return levels file → grep G4416 → confirms station exists in org folder
        ↓
FTP discharge file → grep G4416 → confirms discharge data available
        ↓
Add { stationId, orgFolder, location } to DATASOURCE config
```
