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

const env_yaml = (fs.existsSync('./.env.yaml'))?
    yaml.safeLoad(fs.readFileSync('./.env.yaml')):{};

Object.assign(env, env_yaml)

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('o','output')
  .alias('s','soft-links')
//  .boolean('pg-monitor')
//  .boolean('commit')
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

(verbose>0) && console.log({env});

/*
const json = loadJsonFile.sync(env.input);
(verbose >0) && console.log(`loaded json file ${Object.keys(json).length} articles. (included deleted)`);
*/

/**
    HERE: articles are from museum.xlsx by default.

    for each /museum-v3/article
      - create a page (0000) in tvec.pages (with tvec.file)
      - populate index _au, _mk, and _constructeurs.
**/

(verbose >0) && console.log('Going async...')

main(argv)
.then((npages)=>{
  console.log('@110 done');
//  db.instance.$pool.end();
})
.catch (err => {
  throw err
})


const etime = new Date().getTime();

async function main() {
  try {
    (verbose >0) && console.log(`@110 Massive startup w/passwd: <${password}>`);
    const db = await Massive({
      host,
      port,
      database,
      user,
      password
    });
    (verbose >0) && console.log('Massive is ready.');
    const etime = new Date().getTime();

    const data = await db.query(`
      select
         data->'indexNames' as indexnames,
         data->'links' as links,
         data->>'yp' as yp,
         (data->>'transcription')::boolean as transcription,
         (data->>'restricted')::boolean as restricted,
         data->>'xid' as xid,
         data->'auteurs' as auteurs,
         (data->>'sec')::integer as sec
      from tvec.pages, tvec.files
      where (file_id = id) and (path <@ 'museum.yaml')
      and ((data->>'sec')::integer >= 3)
      and (data->>'auteurs' is not null)
--      order by data->>'yp'
      ;
      `,[],{single:false})
    // console.log({data})
    db.instance.$pool.end();


    /*
        quick check
    */

    for (a of data) {
      if (!a.indexnames || a.indexnames<=0) {
        console.log(`@159 fatal indexNames:`,{a})
        process.exit(-a)
      }

    }

    /*
          Now we can create index
          each article can have multiple names !
    */
    const index = mk_index_articles(data).sort((a,b)=>{
      //console.log({a})
      return a.title.localeCompare(b.title);}
    );
    (verbose >0) && console.log(`@155 etime:${new Date().getTime()-etime}`)
//    console.log({index})

    for (entry of index) {
      // we could have same title for different articles.
        //console.log(entry); process.exit(1);
        assert(entry.title)

        for (a of entry.articles) {
          const vp =[];
          const links = a.links || [];
          const auteurs = a.auteurs || [];
          (verbose >0) && console.log(`   [${a.xid}] yp:${a.yp} links:${links.length}`)

          for (pdf of links) {
  //          console.log(`      pdf:`,pdf)
            if (a.restricted) {
              vp.push(`
                <div style="margin:0 0 0 0px;" class="red">
                → Document  sous droits d'auteur, non communicable.
                </div>
              `)
            } else {
              vp.push(`
                <div>
                →
                  <div style="display:inline-block">
                    <a href="http://museum-assets-v3.ultimheat.com/article/${a.xid}/${pdf.fn}.pdf" target="anotherTab">
                    ${pdf.fn}.pdf
                    </a>
                  </div>
                </div>
                `)
            }
          } // loop pdf

          console.log(`
            <div style="margin:5px 0 0 0; border-bottom:3px solid rgb(230,230,230); padding:0 0 10px 0; font-family:times;">
              <b>Article</b><br>${entry.title} [${a.xid}]
              ${(a.restricted)?'*restricted*':''}
              ${(a.transcription)?'*transcription*':''} 
              <div>
                Auteurs(s) : ${auteurs.join('&nbsp;&mdash;&nbsp;')}
              </div>
              <div>
                ${vp.join('')}
              </div>
            </div>
            `)

        } // each article

      }; // loop entry
    (verbose >0) && console.log(`@168 etime:${new Date().getTime()-etime}`)
  }
  catch (err) {
    console.log(err)
  }
}


function notice (x) {console.log(x)}


function mk_index_articles(xlsx) { // 1-1 relation with xlsx
  const _iNames = {}
  let mCount = 0;
  for (const xe of xlsx) {
    const {xid, yp, indexnames, auteurs, links, transcription, restricted} = xe;
    // each xlsx-entry can generate multiple entry in marques.

    if (!indexnames || !auteurs) {
      console.log(`@328 fatal:`,{xe})
      process.exit(-1)
    }

    const indexNames = indexnames.map(j=>(j.trim())).filter(j=>(j.length>0)); // FIX.


//    console.log(`@332 fatal:`,{indexnames})
    /*
    const _auteurs = auteurs.map(j=>(j.trim())).filter(j=>(j.length>0)); // FIX.

    if (!_auteurs || (_auteurs.length<1)) {
      notice(`j:${j} titre:${JSON.stringify(indexNames)}`);
      mCount++;
      notice (`mapp_index_byMarques =>fatal title without marque xid:${xid} ${mCount}/${j}`);
      continue;
    }
  //  notice(titre.sec);
    */

    indexNames.forEach((title)=>{
      if (title.length<1) {
        console.log({xe})
        throw `fatal-65`;
      }
      if (title.trim().length<1) throw `fatal-66`;
      _iNames[title] = _iNames[title] || [];

      _iNames[title].push({
  	    xid,
        auteurs,
  	    yp,
  	    links, // pdf
  	    transcription,
  	    restricted
  	  })
    });
  }; // loop.


  const alist = Object.keys(_iNames).map(title => ({
      title,		// marque === iName
  //    nc: marques[mk1].length,
      articles: _iNames[title]	// list of catalogs.
  }));

  return alist;
}
