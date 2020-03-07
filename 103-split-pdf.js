#! /usr/bin/env node

/*************************************************
    Instead of getting pdf-filename from YAML
    we could directly find the pdf.
    -Also dont rebuild if timeStamp older.

**************************************************/
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
//const writeJsonFile = require('write-json-file');
//const loadJsonFile = require('load-json-file');
const yaml  = require('js-yaml');
//const createSymlink = require('create-symlink');
//const {realpathSync} = require('fs');
const find = require('find'); // 2019 find.file(regex,path); find.fileSync(regex,path)
const pdfjsLib = require('pdfjs-dist');
const wrap = require('word-wrap');
const Massive = require('massive');
const monitor = require('pg-monitor');

//const {xnor1, xnor2, xnor3} = require('./lib/utils')
//const {api,_assert, __assert} = require('../207-jpc-catalogs-admin/lib/openacs-api')


//const {_assert, fatal_error} = require('./lib/openacs-api');
//const input_fn = '0-Heating-Museum-from-start-to-31-Mars-2019-FRENCN-20190425.xlsx';

const env = {
//  input: 'museum.xlsx.json'
}

const env_yaml = (fs.existsSync('./.env.yaml'))?
    yaml.safeLoad(fs.readFileSync('./.env.yaml')):{};

//console.log({env})
Object.assign(env, env_yaml)


const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .option('commit',{type:'boolean', default:false})

//  .alias('o','output')
//  .boolean('pg-monitor')
//  .boolean('commit')
  .options({
//    'pg-monitor': {default:true},
//    'limit': {default:99999}, // stop when error, if --no-stop, show error.
//    'zero-auteurs': {default:false}, //
  }).argv;

Object.assign(env, argv);

const {verbose, root:www_root, assets, commit} = env;
const {host,port,user,database,password} = env;
assert(www_root)  // list of folders XID (store) and index.yaml for each xid.
assert(assets)    // where are the pdf and jpeg NOT USED because links...

if (!www_root) {
  console.log(`
    ************************************************
    FATAL : root-directory
    ./103-split-pdf.js <root-directory>
    ************************************************
    `);
  process.exit(-1);

}


if (!fs.existsSync(www_root)) {
  console.log(`
    FATAL : root-directory not found <${www_root}>
    `);
  process.exit(-1);
}

;(verbose >0) && console.log(`@75: www_root: <${www_root}>`)


const files = find.fileSync(/\.md$/, www_root);

;(verbose >0) && console.log(`@80: found ${files.length} md-files`)


//console.log({files})

if (false) {
  const pdf1 = '/home/dkz/tmp/232-museum-data/3001/1883 Science Pittoresque Barometre thermometre Cheminees.pdf';
  const pdf2 = '/media/dkz/Seagate/2019-museum-assets/PDF-20191231/1896 Electromecanique chauffage 20200110.pdf';

  const loadingTask = pdfjsLib.getDocument(pdf2);
  loadingTask.promise.then(function(pdf) {
    // you can now use *pdf* here
    console.log({pdf})
  });
}

async function load_remote_pdf(db) {
  const remote_dir = {};
  const v = await db.adoc.list_files('museum.pdf');
  v.forEach(it =>{
    remote_dir[it.xid] = it;
  })
  const remote_Count = Object.keys(remote_dir).length;
  console.log(`@103: found ${remote_Count} pdf on server.`)
  return (remote_Count>0)?remote_dir:null;

}


main();
console.log(`Going async... on ${files.length} files`)


async function main() {

  console.log(`@110 Massive startup w/passwd: <${password}>`);
  const db = await Massive({
    host,
    port,
    database,
    user,
    password
  });
  console.log('Massive is ready.');

  const remote_pdf = await load_remote_pdf(db);

// console.log(remote_pdf); throw 'break@130'

  for (fn of files) {
    ;(verbose >0) && console.log(`@105: reading md-file <${fn}>`)
    const file_Content = fs.readFileSync(fn, 'utf8')
    try {
      const v = file_Content.trim().split(/\-\-\-/);
      assert(v.length = 3)
      const article = yaml.safeLoad(v[1]); // ./xid/index.yaml
      if (article.deleted) continue;
  //    console.log({article})
    //  console.log(`#${article.xid} ${article.deleted?"-deleted":""}`)
      console.log(`@114: #${article.xid} ${article.h1} pdf:`, article.links && article.links.map(it=>it.fn));
      if (!article.links) continue;
      for (link of article.links) {
        if (!fs.existsSync(path.join(fn,'..',link.fn))) {
          console.log(`@93 ALERT pdf file-not-found <${path.join(fn,'..',link.fn)}>`)
          continue; // ATT: BUG.
        }
        const pdf_fn = await fs.realpath(path.join(fn,'..',link.fn));
        if (!fs.existsSync(pdf_fn)) {
          console.log(`@93 ALERT pdf file-not-found <${pdf_fn}>`)
          continue;
        }

        const pdf_mtime = fs.statSync(pdf_fn).mtime;

        if (remote_pdf) {
          console.log(`@130: remote_pdf[${link.fn}]:`,remote_pdf[link.fn])
//          throw 'break@130'
          if (remote_pdf[link.fn]) {
            // on considere que c'est bon pour le pdf.
            continue;
          }
        }


  //      console.log(`file :::: <${pdf_fn}>`)
        const doc = await get_pdf_doc(pdf_fn)
  //      console.log({pdf})
        ;(verbose >0) && console.log(`@72 #${article.xid} ${doc.numPages} pages for <${pdf_fn}>`)

  //      await split_pdf_raw_text(pdf_fn, options)
        const pages =[];
        for (let pageno=1; pageno <=doc.numPages; pageno++) {

          // check if destination.mtime newer than pdf.mtime
          const txt_fn = `${path.join(fn,'..',link.fn)}-${('0000'+pageno).substr(-4)}.txt`;

          // PB HERE...
          if (false && !fs.existsSync(txt_fn)) {
            ;(verbose >0) && console.log(`@139: skipping timeStamp check for non existant <${txt_fn}>`)
            continue;
          }

          if (fs.existsSync(txt_fn)) {
            const txt_mtime = fs.statSync(txt_fn).mtime;

            /****************************************************

            <if> raw-text exists
            <and> newer than pdf
            <and> not in database <or> newer than database
            <THEN> commit DB

            <ELSE> will have second chance later...

            *****************************************************/
            ;(verbose >0) && console.log(`@198: <${txt_fn}> ${txt_mtime} >= ${pdf_mtime} ? ${(txt_mtime >= pdf_mtime)}`)
            if (txt_mtime >= pdf_mtime) {
              // we have an up to date TXT (raw-text)
              if (!remote_pdf) {
                // commit this pdf-page.
                if (commit) {
                  const raw_text = fs.readFileSync(txt_fn,'utf8')
                  await db.adoc.write_page('museum.pdf',link.fn,pageno,raw_text)
                  console.log(`@206: write_page xid:(${link.fn})#${pageno} (passed)`)
                }
                continue;
              } else {
                if (commit && !remote_pdf[link.fn]) {
                  const raw_text = fs.readFileSync(txt_fn,'utf8')
                  await db.adoc.write_page('museum.pdf',link.fn,pageno,raw_text)
                  console.log(`@206: write_page xid:(${link.fn})#${pageno} (passed)`)
                  continue;
                }
              }
            } // txt newer than pdf
          } // txt_fn found


          // throw {code:'break@142', txt_fn, pdf_fn, pdf_mtime, txt_mtime};

          const page = await doc.getPage(pageno);
          const textContent = await page.getTextContent();
          const vp = textContent.items
            .map(it =>it.str.replace(/[\(•\)\*\+\^■\{\}\|]+/g,' ')
                .replace(/\s([,\.])/g,'$1')
                .replace(/\s+/g,' ')
                .replace(/([,_\.\-])[,_\.\-]+/,'$1')
                .replace(/^[^a-zA-Z0-9]*$/g,'')
                .replace(/­/,'<H>') // ATTENTION DISC-HYPHEN hidden here.
                .trim())
            .filter(it =>(it.length>0))
          const txt = vp.join(' ').replace(/([a-zé])\-\s([a-zé])/g,'$1$2').replace(/<H>\s/g,'')
          //if (txt.length <=10) console.log(`ALERT:`,{txt})


          if (txt.length <50) continue;
          if (txt.length >50) pages.push(txt); // or not enough info. just pic.
  //        console.log(`textContent.items:`,txt)
          console.log(`writing txt on <${txt_fn}>`)
          fs.writeFileSync(txt_fn, wrap(txt,{width:80}),'utf8');
        }  // each pdf-page
        //      console.log({pages})
        //      console.log(`${pages.length} pages: ${pages.map(it=>('['+it.length+']')).join(',')}`)
      } // links
    } // try

    catch (err) {
      if (err instanceof yaml.YAMLException) {
        console.log(`@162: err:`,err.message)
        console.log(`@162: file_Content:`, file_Content)
        throw 'fatal@162'
      }
      if (err.code == 'fatal@142') {
        console.log(err)
        console.log(`(pdf_mtime < txt_mtime) :`, (pdf_mtime < txt_mtime))
        throw err;
      }

      console.log(`@176: err:`, err)
      throw 'fatal@163'
    }
  }
}

async function get_pdf_doc(fn) {
  return pdfjsLib.getDocument(fn).promise
  .then(function(pdf) {
      // you can now use *pdf* here
    return (pdf)
  })
  .catch(err=>{
    console.log({err})
    throw err;
  })
}



async function split_pdf_raw_text(fn, options) {
  options = options ||{};
  const {verbose} = options;
  const pages =[];

  verbose && console.log(`fetching pdf-document <${fn}>`);
  const pdf_doc = pdfjsLib.getDocument(fn);
  verbose && console.log(`found ${doc.numPages} pages for <${fn}>`);
  for (let pageno=1; pageno <=doc.numPages; pageno++) {
    const page = await doc.getPage(pageno);
    const textContent = await page.getTextContent();
    pages.push(textContent.items)
  }  // each pdf-page
  return pages;
}
