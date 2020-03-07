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

(verbose>0) && console.log({env})


const json = loadJsonFile.sync(env.input);
(verbose >0) && console.log(`loaded json file ${Object.keys(json).length} articles. (included deleted)`);

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


async function main() {
  try {
    const {data,list,etime} = await require('./lib/index-des-marques.js')({
      host,
      port,
      database,
      user,
      password
    })

    list.forEach(p=>{
      console.log(p)
    })

    console.log(`@129 list.length:${list.length} data.length:${data.length}  in ${etime}ms.`)
  }
  catch (err) {
    console.log(err)
  }
}
