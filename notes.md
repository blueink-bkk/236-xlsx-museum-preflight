## `232-xlsx-museum-preflight`

- revision: February 2020.

#### `xlsx2json.js`

mapping cols to json

```
- xid              // A
- sec              // B
- yp               // C
- circa            // D
- pic              // E : jpeg
- co               // F : country
- h1               // G
- isoc             // H
- h2               // I
- root             // J : other name, author (root-name)!
- yf               // K : year founded
- fr               // L : texte francais
- mk               // M : marque
- en               // N : english
- zh               // O : english
- ci               // P : city
- sa               // Q : street address
- links            // R : pdf[]
- flags            // S : [RT..]
- npages           // T : number of pages
- rev              // U : revision date (Update)
- com              // V : comments
- ori              // W : origine source du document.
- auteurs          from isoc
- indexName        from isoc (titres) messy!
```

#### `reformat.js`
- convert CC (country codes) into ISO.
- trim all fields
- extract {legalName, aka} from isoc (sec 1, sec 2)
- extract {titre, auteurs} from isoc (sec>=3) => new entries
- normalize/split flags: deleted, restricted, transcription
- split h2 (col I) into multiple {keywords-products}
- split mk (col M) into multiple marques
- merge cols (R,T) into links[] multiple {fn,np} (pdf-fileNAme, #pages)

#### `101-xlsx2json.js`

- ignore deleted entries
- collect auteurs into index
- create index des titres classes by auteurs.
-





#### LOG.

##### Mon Feb 3, 2020
```
101-xlsx2json.js
  create/update soft link museum.xls (to latest)
  $ ln -sf 0-Heating-Museum-from-start-to-31-12-2019-FRENCN-20200204.xlsx museum.xlsx
  errors/alerts are on stdout
  $ ./101-xlsx2json.js | grep ALERT
  $ ./101-xlsx2json.js |grep ^@52 >52-auteurs.txt
  $ ./101-xlsx2json.js |grep ^@69 > 69-constructeurs.txt
  $ ./101-xlsx2json.js |grep ^@86 > 86-marques.txt
```

##### Tue Feb 4, 2020
```
rm -rf ~/tmp/232-museum-data/**/*.jpg
rm -rf ~/tmp/232-museum-data/**/*.pdf
$ ./102-json2yaml.js ./museum.xlsx.json |grep ^@74
```
