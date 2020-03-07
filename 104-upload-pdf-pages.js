#! /usr/bin/env node

/*

    THE ORIGINAL WAS IN
    /home/dkz/dev-utpp/museum-1808-massive-upload/upload-batch-85.js

    ATTENTION THIS IS ONLY FOR MUSEUM-V3
*/


const fs = require('fs');
const path = require('path');
const assert = require('assert');
const jsonfile = require('jsonfile')
const yaml = require('js-yaml');
const Massive = require('massive');
const monitor = require('pg-monitor');
var pdfjsLib = require('pdfjs-dist');
const klaw = require('klaw');

const env = {
  user: process.env.PGUSER,
  port: process.env.PGPORT,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
};
console.log({env})

const env_yaml = (fs.existsSync('./.env.yaml')) ?
  yaml.safeLoad(fs.readFileSync('./.env.yaml', 'utf8')) : {};
console.log({env_yaml})

Object.assign(env, env_yaml);

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('p','password')
  .alias('f','file')
  .alias('d','dir')
  .alias('a','all')
  .alias('c','commit')
  .options({
    'commit': {type:'boolean', default:false},
  }).argv;
console.log('commit:',{argv})

Object.assign(env, argv);

assert(env.user)
assert(env.port)
assert(env.host)
assert(env.database)
assert(env.password)
assert(env.root) // store

const {root:root_folder, verbose} = env;
const {host,port,user,database,password} = env;

// ==========================================================================

/*
  Here we process an entire folder.
*/


function *walkSync(dir,patterns) {
  const files = fs.readdirSync(dir, 'utf8');
//  console.log(`scanning-dir: <${dir}>`)
  for (const file of files) {
    try {
      let pathToFile = path.join(dir, file);
      if (file.startsWith('.')) continue; // should be an option to --exclude
        const fstat = fs.statSync(pathToFile);

      if (fs.statSync(pathToFile).isSymbolicLink()) {
        let pathToFile = fs.realpathSync(pathToFile)
      }

      const isDirectory = fs.statSync(pathToFile).isDirectory();
      if (isDirectory) {
        if (file.startsWith('.')) continue;
          yield *walkSync(pathToFile, patterns);
      } else {
        if (file.startsWith('.')) continue;
        let failed = false;
        for (pat of patterns) {
          const regex = new RegExp(pat,'gi');
          if (file.match(regex)) continue;
          failed = true;
          break;
        };
        if (!failed)
        yield pathToFile;
      }
    }
    catch(err) {
      console.log(`ALERT on file:${ path.join(dir, file)} err:`,err)
//      console.log(`ALERT err:`,err)
      continue;
    }
  }
}


main(argv)
.then(({npages, nfiles})=>{
  console.log(`done npages:${npages} in ${nfiles} pdf-files`);
})
.catch (err => {
  throw err
})

let nfiles =0;
let npages =0;


const etime = new Date().getTime();

async function main() {
  try {
    console.log(`@110 Massive startup w/passwd: <${password}>`);
    const db = await Massive({
      host,
      port,
      database,
      user,
      password
    });
    console.log('Massive is ready.');

    return await walk(db);
  }
  catch (err) {
    console.log(err)
  }
}

async function walk(db) {
  (verbose >0) && console.log(`@141: entering walk root_folder: <${root_folder}>`)
  return new Promise((resolve, reject) =>{
    klaw(root_folder, {
        //filter: (item)=>{return item.path.endsWith('.pdf')}
        filter: (item)=> {
//          console.log(`@144 filter nfiles:${nfiles}`)
          return(nfiles<10) // no effect because
        }
    })
    .on('data', async (item) =>{
        let {path:fn} = item;
        if (fn.endsWith('.pdf')) {
  //        console.log(`file[${nfiles}]`, fn)
          nfiles ++;
          if (nfiles <=10*1000) {
            console.log(`@155 ondata nfiles:${nfiles}`)
            await upload_museum_pages(fn,db);
            console.log(`===================================`)
          }
        }
    })/*
      .on('readable', function () {
        let item
        while ((item = this.read())) {
          console.log(`x:`, item)
        }
      })*/
    .on('error', (err, item) => {
        console.log(err.message)
        console.log(item.path) // the file the error occurred on
        reject(err)
    })
    .on('end', () => {
        console.log(`klaw done etime:${new Date().getTime() - etime}ms.`);
        resolve({nfiles:999, npages:99999});
    })
  }) // promise
} // walk


async function upload_museum_pages(fn,db) {
//  const xid = path.dirname(fn).split('/'); // last one
  (verbose >=2) && console.log(`@180 entering upload_museum_pages(${fn})`)
  const dirname = path.dirname(fn);
  let xid = dirname.substring(dirname.lastIndexOf('/'));
  if (!xid) {
    console.log(`@183:`,path.dirname(fn).split('/'))
    console.log(`@184:`,path.dirname(fn).split('/')[-1])
    throw 'FATAL'
  }
  if (xid[0] != '/') {
    console.log(`@190:`,path.dirname(fn))
    console.log(`@191 xid:`,xid)
    throw 'FATAL';
  }
  xid = xid.substring(1);
  console.log(`@182 XID:${xid}`)
  const fn2 = fs.realpathSync(fn)
  const baseName = path.basename(fn2);
  const doc = await pdfjsLib.getDocument(fn2).promise;
//  npages += doc.numPages;
//  console.log(`[${nfiles++}] npages:${doc.numPages} <${fn}> `);

  for (let pageNo=1; pageNo <= doc.numPages; pageNo++) {
    const txt_fn = (fn + `-${('0000'+pageNo).substr(-4)}.txt`);
    (verbose >=2) && console.log(`@203 processing page (${txt_fn}) commit=${argv.commit}`)
    if (!fs.existsSync(txt_fn)) {
      console.log(`@205 ALERT file-not-found: <${txt_fn}>`)
      continue;
    }

    const raw_text = fs.readFileSync(txt_fn, 'utf8')

    if (argv.commit) {
      try {
        npages ++;
        console.log(`COMMIT page:${pageNo} total:${npages} files:${nfiles}`);
//        console.log(`-- page ${pageNo} raw_text:${raw_text.length}`);
//        const ts_vector = undefined;
//        const json_data = {xid}
        const retv = await db.adoc.write_page('museum.pdf',xid, pageNo, raw_text);
        console.log(`@195 -- page ${nfiles}.${pageNo} raw_text.length:${raw_text.length} retv:`, {retv})
      }
      catch(err) {
        console.log(err)
      }
    }
  }; // each page
}


return;



main(argv)
.then((npages)=>{
  console.log('done npages:',npages);
  db.instance.$pool.end();
})
.catch (err => {
  throw err
})

function _assert(b, o, err_message) {
  if (!b) {
    console.log(`[${err_message}]_ASSERT=>`,o);
    console.trace(`[${err_message}]_ASSERT`);
    throw {
      message: err_message // {message} to be compatible with other exceptions.
    }
  }
}
