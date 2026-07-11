# MigratieMonitor NL

Mobielvriendelijke dashboardsite met live CBS-data over migratie in Nederland.

**Live:** <https://casperpeters.github.io/cbs-migratie-dashboard/>

## Features

- Plot-first maandtrend met aparte schaal voor het netto migratiesaldo.
- Compacte microplots voor het 12-maandssaldo, topland en topmotief.
- Jaar-op-jaarvergelijkingen, zodat seizoenseffecten minder misleiden.
- Toegankelijke tabelweergave met exacte maandcijfers.
- Laatste CBS-publicatie met kerncijfers.
- Verdeling naar herkomst: Nederland, Europa exclusief Nederland, buiten Europa.
- Top herkomstlanden/gebieden voor de laatste CBS-maand.
- Horizontale vergelijkingsplots voor herkomstlanden en migratiemotieven.
- De maandcijfers blijven werken als de afzonderlijke migratiemotief-API tijdelijk uitvalt.
- Open Graph/Twitter-metadata met een reproduceerbare social preview.

## Databronnen

- Maandelijkse migratiecijfers: CBS StatLine tabel `85484NED`  
  <https://opendata.cbs.nl/ODataApi/OData/85484NED>
- Migratiemotief: CBS StatLine tabel `84809NED`  
  <https://opendata.cbs.nl/ODataApi/OData/84809NED>

Let op: CBS publiceert migratiemotief als jaarlijkse data voor immigranten met een niet-EU/EFTA-nationaliteit. Dit loopt dus niet 1-op-1 met de maandelijkse totale migratiecijfers.

## Lokaal draaien

```bash
python -m http.server 5179 --bind 0.0.0.0
```

Open daarna: <http://127.0.0.1:5179>

## Checks

```bash
npm test
npm run check:js
```

## Deploy

Deze site is geschikt voor GitHub Pages vanuit de `main` branch en root folder.
