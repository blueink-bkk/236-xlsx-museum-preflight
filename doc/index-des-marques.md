# Index des Marques

#### Presentation 3 levels

```
- marque/label
  - document/article-1
    - pdf-1
    - pdf-2
  - document/article-2
    - pdf-1
    ...
    - pdf-(n)
```

- An article stored in the database can have more than 1 title.
For ex. name of the document in another language.
- titles are stored in `indexNames`.
- h1 should be `indexNames[0]`


#### ex article.

```
"{
"ci": "Orleans",
"co": "France",
"en": "Price list Thermor",
"fr": "Tarif Thermor au 15 Octobre 1951Fers à repasser, bouilloires, sèche-cheveux, ventilateurs, grille-pain, réchaud,radiateurs, coussins chauffants, chauffe-pieds, cuisinières, éléments chauffants, machines à laver, chauffe-eau, thermostats",
"h1": "Thermor",
"h2": ["appareils électriques chauffants"],
"mk": ["Thermor", "Monobloc", "Coffre"],
"yp": 1951,
"zh": "Thermor价格单",
"ori": "Collection privée J.Jumeau",
"pic": "1951 Thermor tarif",
"rev": "Fri Jan 06 2017 23:59:56 GMT+0700 (Indochina Time)",
"sec": 2,
"xid": 8562,
"links": [{"fn": "1951 Thermor tarif 20170208", "np": "4"}],
"deleted": false,
"indexNames": ["Thermor"],
"restricted": false,
"transcription": false
}"
```

#### Extraction
```
select
   data->'indexNames' as titles,
   data->'links' as links,
   data->>'yp' as yp,
   (data->>'transcription')::boolean as transcription,
   (data->>'restricted')::boolean as restricted,
   data->>'xid' as xid,
   data->'mk' as mk,
   data->>'sec' as sec
from tvec.pages, tvec.files
where (file_id = id) and (path <@ 'museum.yaml')
and (data->>'sec' != '3')
and (data->>'mk' is not null);
```
