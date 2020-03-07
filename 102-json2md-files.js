#! /usr/bin/env node

/*

      INPUT: museum.xlsx.json
      uses config file: ./.env.json (hard link only)


*/

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const writeJsonFile = require('write-json-file');
const loadJsonFile = require('load-json-file');
const yaml = require('js-yaml');
//const createSymlink = require('create-symlink');
//const {realpathSync} = require('fs');


//const {xnor1, xnor2, xnor3} = require('./lib/utils')
//const {api,_assert, __assert} = require('../207-jpc-catalogs-admin/lib/openacs-api')


//const {_assert, fatal_error} = require('./lib/openacs-api');
//const input_fn = '0-Heating-Museum-from-start-to-31-Mars-2019-FRENCN-20190425.xlsx';

const env = {
  input: 'museum.xlsx.json'
}

const env_yaml = (fs.existsSync('./.env.yaml'))?
    yaml.safeLoad(fs.readFileSync('./.env.yaml')):{};

//console.log({env})
Object.assign(env, env_yaml)
//console.log({env})


const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('o','output')
  .alias('s','symlink')
  .alias('f','force')
  .alias('n','dry-run')
//  .boolean('pg-monitor')
//  .boolean('commit')
  .options({
    force: {type:'boolean', default:false},
    symlink: {type:'boolean', default:false},
    'dry-run':  {type:'boolean', default:false}
//    'pg-monitor': {default:true},
//    'limit': {default:99999}, // stop when error, if --no-stop, show error.
//    'zero-auteurs': {default:false}, //
  }).argv;

Object.assign(env, argv);

const {verbose, root:www_root, assets:assets_path, force, 'dry-run':dry_run, symlink} = env;
assert(www_root)


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

if (!assets_path && !force) {
  console.log(`
    ************************************************
    folder museum-assets is missing -exit-
    to operate without assets use option --force (-f)
    ************************************************
    `);
  return;
}

if (assets_path && !fs.existsSync(assets_path)) {
  console.log(`
    ********************************************
    FATAL : assets folder file-not-found <${assets_path}>
    ********************************************
    `);
  return;
}

const assets = require('./lib/load-index-assets.js')(assets_path);
console.log(`@99 assets-directory (${Object.keys(assets).length})`)

const json = loadJsonFile.sync(env.input)
console.log(`loaded json file ${Object.keys(json).length} articles. (included deleted)`)

/**
    Create a folder for each article
    with index.yaml + jpeg + pdf.
**/

function mk_linkSync(src,dest,o) {
  o = o || {};
//  const dest = path.join(fa, link.fn);
  if (fs.existsSync(dest)) fs.unlinkSync(dest)

  if (o.symlink) {
    fs.symlinkSync(src, dest);
  } else {
    fs.link(src,dest)
  }
}


main();
console.log('Going async...')


async function main() {
  let a_Count =0;
  let missing_pdf =0;
  let missing_jpeg =0;
  for (article of json) {
    a_Count ++;
    if (article.deleted) continue;

    console.log(`-[${a_Count}]- xid:${article.xid} h1:${article.h1}`);

    const fa = path.join(www_root,`${article.xid}`)
    /*
          create folder
    */
    await fs.mkdirp(fa)

    /*
          find pic (jpeg) and create a link.
    */
    if (!article.pic.endsWith('.jpg')) article.pic += '.jpg';

    if (!article.pic.endsWith('.missing.jpg')) {
      const jpeg_fn = jpeg_lookup(article.pic)
      if (jpeg_fn) {
        if (!dry_run) {
          mk_linkSync(jpeg_fn, path.join(fa, article.pic), {symlink});
          /*
          if (fs.existsSync(dest)) fs.unlinkSync(dest)
          fs.symlinkSync(jpeg_fn, dest);
          */
          ;(verbose>1) && console.log(`@87 #${article.xid} pic symlink Ok. <${jpeg_fn}>`)
        }
      } else {
        missing_jpeg ++;
        ;(verbose>1) && console.log(`@89 #${article.xid} pic not-found <${article.pic}>`)
      }
    }


    /*
          find PDF and create symlink.
    */

    (article.links) && article.links.forEach(link =>{
      if (!link.fn.endsWith('.pdf')) link.fn += '.pdf';
      const pdf_fn = pdf_lookup(link.fn)
      if (pdf_fn) {
        if (!dry_run) {
          mk_linkSync(pdf_fn, path.join(fa, link.fn), {symlink});
          /*
          const dest = path.join(fa, link.fn);
          if (fs.existsSync(dest)) fs.unlinkSync(dest)
          fs.symlinkSync(pdf_fn, dest);
          */
          ;(verbose>1) && console.log(`@104 #${article.xid} pdf symlink Ok. <${pdf_fn}>`)
        }
      } else {
        missing_pdf ++;
        (verbose>1) && console.log(`@106 #${article.xid} pdf not-found <${link.fn}>`)
      }
    })


    //    console.log(`#${article.xid}`)
        const md_data = '---\n' + yaml.safeDump(article) + '---\n';
    //    console.log(_yaml)




    fs.writeFileSync(path.join(fa,'index.md'), md_data)
  }

  const nfolders = fs.readdirSync(www_root).length;
  console.log(`done processing ${json.length} articles.
    missing_pdf:${missing_pdf}
    missing_jpeg:${missing_jpeg}
    with assets <${assets_path}>
    results in folder <${www_root}> (${nfolders})
-eoj-
  `)
}


function jpeg_lookup(fn) {
  if (!assets) return null

//  console.log(`assets[${fn}] => `,assets[fn])
  return (assets[fn] && assets[fn][0]);


  throw 'obsolete@189'
  const dirs = [
    'JPG-20200206',
    'JPG-20191231',
    'new-pdf-and-jpg-20190425',
    'jpeg-www'
  ];

  for (const dir of dirs) {
    const fpath = path.join(assets,dir,fn)
    if (fs.existsSync(fpath)) return fpath;
    (verbose>1) && console.log(`@131 not-found <${fpath}>`)
  }
}


function pdf_lookup(fn) {
  if (!assets) return null

//  console.log(`assets[${fn}] => `,assets[fn])
  return (assets[fn] && assets[fn][0]);


  const dirs = [
    'pdf-20200206',
    'PDF-20200205',
    'PDF-20191231',
    'new-pdf-and-jpg-20190425',
    'pdf-www'
  ];

  for (const dir of dirs) {
    const fpath = path.join(assets,dir,fn)
    if (fs.existsSync(fpath)) return fpath
  }
}


return;


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
