# MigratieMonitor NL

Mobielvriendelijke dashboardsite met live CBS-data over migratie in Nederland.

## Features

- Maandtrend voor immigratie, emigratie en netto migratiesaldo.
- Laatste CBS-publicatie met kerncijfers.
- Verdeling naar herkomst: Nederland, Europa exclusief Nederland, buiten Europa.
- Top herkomstlanden/gebieden voor de laatste CBS-maand.
- Migratiemotief: aandeel arbeidsmigratie, asielmigratie, gezinsmigratie, studie, tijdelijke bescherming en overig.

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
