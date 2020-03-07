# Table Of Content


#### Migration on lima1

##### from xps-8500/Seagate:

- `$ rsync -avzt JPG-20200206 dkz@ultimheat.com:/www/museum-assets-v3`
- `$ rsync -avzt JPG-20191231 dkz@ultimheat.com:/www/museum-assets-v3`
- `$ rsync -avzt new-pdf-and-jpg-20190425 dkz@ultimheat.com:/www/museum-assets-v3`
- `$ rsync -avzt jpeg-www dkz@ultimheat.com:/www/museum-assets-v3`

- `$ rsync -avzt pdf-20200206 dkz@ultimheat.com:/www/museum-assets-v3`
- `$ rsync -avzt PDF-20200205 dkz@ultimheat.com:/www/museum-assets-v3`
- `$ rsync -avzt PDF-20191231 dkz@ultimheat.com:/www/museum-assets-v3`
- `$ rsync -avzt pdf-www dkz@ultimheat.com:/www/museum-assets-v3`


##### On the server:

- `$ git clone https://github.com/blueink-bkk/232-xlsx-museum-preflight.git`
- create link: `$ ln "0-Heating----.xlsx" museum.xlsx`
- `$ ./101-xlsx2json`
- `$ ./102-json2yaml`
