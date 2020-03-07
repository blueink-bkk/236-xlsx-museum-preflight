#! /usr/bin/env node

/*

      INPUT: museum.xlsx.json

      uses config file: ./.env.json (hard link only)
      --from 2345 to resume at a certain point (if conn broken)
      --limit 100

      Museum does not contain MD-code
      the page is rebuilt from yaml-metadata.

      This could change in the future by moving en-fr-zh into MD-zones
      just by renaming 'en' => '.en' or '.lang-en' etc...
      Then we will store md-code into meta['.md'] or meta['.en'] ...
      Editora will pack-unpack any property like '.lang-xx'
      check safeLoad ....
*/

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const writeJsonFile = require('write-json-file');
const loadJsonFile = require('load-json-file');
const yaml = require('js-yaml');
//const createSymlink = require('create-symlink');
//const {realpathSync} = require('fs');
const Massive = require('massive');
const monitor = require('pg-monitor');


//const {xnor1, xnor2, xnor3} = require('./lib/utils')
//const {api,_assert, __assert} = require('../207-jpc-catalogs-admin/lib/openacs-api')


//const {_assert, fatal_error} = require('./lib/openacs-api');
//const input_fn = '0-Heating-Museum-from-start-to-31-Mars-2019-FRENCN-20190425.xlsx';


const env = {
  input: 'museum.xlsx.json',
  user: process.env.PGUSER,
  port: process.env.PGPORT,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
};
console.log({env})


const env_yaml = (fs.existsSync('./.env.yaml'))?
    yaml.safeLoad(fs.readFileSync('./.env.yaml')):{};

Object.assign(env, env_yaml)

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('o','output')
  .alias('s','soft-links')
  .option('limit',{type:'integer', default:10*1000})
//  .boolean('pg-monitor')
//  .boolean('commit')
  .option('resume',{type:'string', default:''})
//  .option('from',{type:'',default:''})
  .option('commit',{type:'boolean', default:false})
  .options({
//    'pg-monitor': {default:true},
//    'limit': {default:99999}, // stop when error, if --no-stop, show error.
//    'zero-auteurs': {default:false}, //
  }).argv;

Object.assign(env, argv);

//assert(assets)

if (!env.input) {
  console.log(`
    ************************************************
    FATAL : Missing input file declaration
    default is "museum.xlsx.json"
    ************************************************
    `);
  return;
}

if (!fs.existsSync(env.input)) {
  console.log(`
    FATAL : input file-not-found <${env.input}>
    `);
  return;
}


assert(env.user)
assert(env.port)
assert(env.host)
assert(env.database)
assert(env.password)
assert(env.root) // store

//const {verbose, root:www_root, assets} = env;
//assert(www_root)

const {root:root_folder, verbose} = env;
const {host,port,user,database,password} = env;
const {from= +0} = env;

const xlsx = loadJsonFile.sync(env.input)
console.log(`loaded json file ${Object.keys(xlsx).length} articles. (included deleted)`)

/**
    HERE: articles are from museum.xlsx by default.

    for each /museum-v3/article
      - create a page (0000) in tvec.pages (with tvec.file)
      - populate index _au, _mk, and _constructeurs.
**/

console.log('Going async...')

main(argv)
.then((npages)=>{
})
.catch (err => {
  throw err
})


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

    const remote_dir = {};
    const _v_remote_dir = await db.adoc.list_files('museum.md');
    _v_remote_dir.forEach(it =>{
      remote_dir[it.xid] = it;
    })
    const remote_Count = Object.keys(remote_dir).length;
    console.log(`@150: found ${Object.keys(remote_dir).length} products on server.`)

    /************************************

    mtime is timestamp for museum.xls.json

    *************************************/
    const mtime = fs.statSync(env.input).mtime;

    let a_Count =0;
    for (article of xlsx) { // xlsx.json  (clean).
      if (a_Count >= +env.limit) break;
      if (article.deleted) continue;
//      if (+article.xid < +from) continue;

      if (argv.resume) {
        if (argv.resume != article.xid) continue;
        argv.resume = null; // ONE SHOT
      }

      // USE --force to bypass this.
      if (remote_dir[article.xid] && remote_dir[article.xid].mtime) {
        //console.log(`@159: timeStamp ai:${ai} local:${mtime} remote:${remote_dir[ai].mtime}`)
        if (mtime <= remote_dir[article.xid].mtime) continue;
      }


      console.log(`-[${a_Count}]- xid:${article.xid} h1:${article.h1}`);

      //console.log(`@140: `,{article});
      //if (a_Count>20) break;

      const raw_text =[];
      if (+article.sec >2) {
        // articles-auteur

        raw_text.push(`revue: ${article.indexNames.join(' - ')}`);
        (article.yp) && raw_text.push(`published ${article.yp}${article.circa||''}`);
        raw_text.push(`h1: ${article.h1}`);
        (article.auteurs.length>0) && raw_text.push(`auteurs: ${article.auteurs.join(' - ')}`);
        (article.h2.length>0) && raw_text.push(`produits: ${article.h2.join(' - ')}`);
        (article.co) && raw_text.push(`adresse: ${article.sa} ${article.ci} ${article.co}`);
        (article.ori) && raw_text.push(`origine: ${article.ori}`);
        (article.fr) && raw_text.push(`${article.fr}`);
        (article.en) && raw_text.push(`${article.en}`);
        (article.links.length>0) && raw_text.push(`fichiers: ${article.links.map(it=>(it.fn+'.pdf')).join(' - ')}`);
        (article.pic) && raw_text.push(`${article.pic}.jpg`);
        (article.xid) && raw_text.push(`ref: ${article.xid}`);
      } else {
        // catalogue constructeur - marques -
        (article.indexNames.length>0) && raw_text.push(`constructeur: ${article.indexNames.join(' - ')}`);
        raw_text.push(`h1: ${article.h1}`);
        (article.yp) && raw_text.push(`published ${article.yp}${article.circa||''}`);
        (article.yf) && raw_text.push(`founded ${article.yf}`);
        (article.h2) && (article.h2.length>0) && raw_text.push(`produits: ${article.h2.join(' - ')}`);
        (article.mk) && (article.mk.length>0) && raw_text.push(`marques: ${article.mk.join(' - ')}`);
        (article.co) && raw_text.push(`adresse: ${article.sa} ${article.ci} ${article.co}`);
        (article.ori) && raw_text.push(`origine: ${article.ori}`);
        (article.fr) && raw_text.push(`${article.fr}`);
        (article.en) && raw_text.push(`${article.en}`);
        (article.links.length>0) && raw_text.push(`fichiers: ${article.links.map(it=>(it.fn+'.pdf')).join(' - ')}`);
        (article.pic) && raw_text.push(`${article.pic}.jpg`);
        (article.xid) && raw_text.push(`ref: ${article.xid}`);
      }

      (verbose >1) && console.log(`==============================\n`,raw_text.join('\n'));
      if (!env.commit) continue;

      const retv = await db.adoc.write_pagex(
        'museum.md',        // path
        `${article.xid}`,     // xid
        0,                    // pageno
        article,              // data::jsonb
        raw_text.join('\n')            // raw text for tsv
      )
      .then(x=>{
        a_Count++
      })
      .catch(err=>{
        console.log(`ALERT write_page FAILED xid:${article.xid}`,err)
        console.log(`
          select dadoc.write_pagex(
            'museum.md',        -- path
            '${article.xid}',     -- xid
            0,                  -- pageno
            '{}',            -- data::jsonb
            -- raw-text
            '${raw_text.join('\n')}'
          );
          `)
        throw 'FATAL ERROR'
      });

    }
    db.instance.$pool.end();
    console.log(`done processing ${xlsx.length} articles.
      ${(argv.commit)?"committed: ":"DRY-RUN use option --commit"}${(argv.commit)?a_Count:''}
      `)
    return a_Count; // nbre of articles written on DB.
  }
  catch (err) {
    console.log(err)
  }
}






function validate_xtrans(xlsx) {
  const ySeq = [];

  const _constructeurs={}, _publishers={};
  const _sections={};
  const _marques={}, _produits={}, _auteurs={}; // for cr_keywords

  function near_miss3(_h, title, it, object_type) {
    const titles = (Array.isArray(title))? title : [title];

    titles.forEach(_title =>{
      const name = xnor3(_title)
      _h[name] = _h[name] || new Set([_title]);
      if (!_h[name].has(_title)) {
        (verbose>1) && console.log(`${it.xid} NEAR-MISS [${object_type}] [${_title}] [${Array.from(_h[name]).join(', ')}]`);
      }
      _h[name].add(title);
    })
  }

  _assert(Array.isArray(xlsx), "fatal", "xlsx is not an Array.");

  let err_Count =0;
  for (ix in xlsx) {
    const it = xlsx[ix]; // all refs are in ix not xid.
    const {xid, sec, deleted} = it;
    if (deleted) continue;

    const {h1, h2:produits, mk:marques, indexNames} = it;
    //console.log(`-- xid:${xid} sec:${sec}`)
    if (!xid) {
      verbose &&
      console.log(`ALERT invalid-xid row:`,it)
      err_Count +=1;
      continue;
    }



    /***********************************
      Catalogs.
    ************************************/
    if (sec <=2) {
      const {sec, xid, co} = it;
      let {indexNames} = it; // can be null
      if (!indexNames) {
        (verbose>1) && console.log(`${xid} WARNING: Missing indexName - fixed by using h1.`)
        err_Count +=1;
      }
      indexNames = indexNames || [h1];
      __assert(indexNames.length >=1, "", "Missing indexNames");

      const title = (indexNames && indexNames[0]) || h1;
//      const name = `${co}::${title}`;
      const constructeur_name = `${title}@[${co}]`;
      Object.assign(it,{title, constructeur_name, indexNames})

      register_constructeur(ix);
      register_catalog(ix);
      register_produits(ix);
      register_marques(ix);
    }
    else {
      const {h1, auteurs} = it;
      let {indexNames} = it; // can be null
      if (!indexNames) {
        (verbose>1) && console.log(`${xid} WARNING: Missing indexName - fixed by using h1.`)
        err_Count +=1;
      }
      indexNames = indexNames || [h1];
      //_assert(auteurs.length <=1, it, `Multiple publishers:${auteurs.length}`);

      __assert(indexNames.length >=1, it, "Missing indexNames");

      // no such thing register_publisher(indexNames[0], xid);
      register_auteurs(ix); // no publisher
      register_article(ix);
      // register_keywords()
    }

  } // loop on each xlsx row.

  function isec2path(isec) {
    return (+isec <=2) ? `c.${isec}` : `a.${isec}`;
  }

  /***************************************************

    push back references to marques, produits, auteurs.

    WHAT FOR ?

  ****************************************************/


  console.log(`3. validate_xtrans: err_Count:${err_Count}/${xlsx.length}`);

  const base_ofn = input_fn.replace(/\.xlsx$/,'');
  _assert(base_ofn != input_fn, base_ofn, input_fn)
  writeJsonFile.sync(base_ofn + '-constructeurs.json',_constructeurs)
  console.log(`4. construteurs.json saved.`)
  writeJsonFile.sync(base_ofn + '-marques.json',_marques)
  console.log(`5. marques.json saved.`)
  writeJsonFile.sync(base_ofn + '-produits.json',_produits)
  console.log(`6. produits.json saved.`)
  writeJsonFile.sync(base_ofn + '-auteurs.json',_auteurs)
  console.log(`7. auteurs.json saved.`)

return ySeq;

// --------------------------------------------------------------------------

function register_produits(ix) {
  const {xid, h2:products} = xlsx[ix]
  products && products.forEach(p =>{
    _produits[p] = _produits[p] || [];
    _produits[p].push(ix);
    if (_produits[p].length == 1) {
      // we might name a name...
      ySeq.push({product:p, xid})
    }
  })
}

// --------------------------------------------------------------------------

function register_auteurs(ix) {
  const {xid, auteurs} = xlsx[ix];
  auteurs && auteurs.forEach(au =>{
    const name = xnor3(au)
    _auteurs[name] = _auteurs[name] ||[];
    _auteurs[name].push(ix);
    if (_auteurs[name].length == 1) {
      // we might name a name...
      ySeq.push({auteur:au, name, xid})
    }
  })
}

// --------------------------------------------------------------------------

function register_marques(ix) {
  const {xid, mk, constructeur_name, parent_ix} = xlsx[ix]
  mk && mk.forEach(label =>{
    if (!label) {
      console.log('NULL LABEL it:',it)
      throw 'fatal@219'
    }
    _assert(label, xlsx[ix], `null label at ix:${ix}`);

    near_miss3(_marques, label, xlsx[ix], 'marque')
return;

    _marques[label] = _marques[label] || {ix_ref:ix, list:[]};
    _marques[label].list.push(ix);
    if (_marques[label].list.length == 1) {
      // we might name a name...
      ySeq.push({marque: label, xid})
    }

  }) // each marque.
}

// --------------------------------------------------------------------------

function register_constructeur(ix) {
  // first ix is where the constructeur is first seen. => definition
  const {constructeur_name:name, title, co,ci,sa,yf, xid} = xlsx[ix]
  _constructeurs[name] = _constructeurs[name] || [];
  _constructeurs[name].push(ix);
  xlsx[ix].parent_ix = _constructeurs[name][0];
  if (_constructeurs[name].length == 1) {
    ySeq.push({constructeur:name, title, ix, co, sa, ci, yf, xid});
  }

}

// --------------------------------------------------------------------------

function register_catalog(ix) {
  const {h1, sec, xid, indexNames, co, ci, sa, yp, h2:products, links, pic, mk} = xlsx[ix];
  const title = (indexNames && indexNames[0]) || h1;
  const name = `${title}@[${co}/${yp}/${xid}]`;
  ySeq.push({
    catalog: title, // the constructeur name, no specific title fo catalogs
    name: 'catalog-'+xid,
    // catalog.name will be built in next step import-yaml
    path: isec2path(sec)+'.'+co.toLowerCase(),
    yp, co, ci, sa,
    indexNames,
    products, marques:mk,
    pic,
    links,
    xid, // pour info.
  })
}

// --------------------------------------------------------------------------

function register_article(ix) {
  const {h1, sec, xid, indexNames, co, ci, sa, auteurs, links, pic} = xlsx[ix];
  const title = (indexNames && indexNames[0]) || h1;
  const name = `${title}@[${xid}]`; // constructeur name
  ySeq.push({
    article: title, // the constructeur name, no specific title fo catalogs
    // article.name will be built in next step import-yaml
    path: isec2path(sec),
    auteurs,
    ci, sa,
    indexNames,
    pic,
    links,
    xid, // pour info.
  })
}

// --------------------------------------------------------------------------
throw "WE SHOULD NOT BE HERE"
}
