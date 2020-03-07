#! /usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
var jsonfile = require('jsonfile');

/*
  Convert museum.xlsx => museum.xlsx.json
*/

const xlsx_fn = './museum.xlsx';
const xlsx = require('./xlsx2json.js')(xlsx_fn);
console.log(`writing json on file <${xlsx_fn+".json"}>`)
jsonfile.writeFileSync(xlsx_fn+".json",xlsx,{spaces:2})


/*
  Do some validations and
  create lists auteurs, constructeurs, marques.
*/

let deleted_Count =0;
let xlsx_Count =0;
xlsx.forEach(it=>{
  xlsx_Count ++;
  if (it.deleted) deleted_Count ++;
})
console.log(`xlsx total-rows:${xlsx_Count} deleted:${deleted_Count}`)

const _xlsx = {}; // access sur base du xid.
const _au = {};
const _constructeurs = {};
const _mk = {};

for (let ix=0; ix <xlsx.length; ix++) {
  const it = xlsx[ix];
  if (it.deleted) continue;
  _xlsx[it.xid] = it;

  if (it.sec >= 3) {
//    console.log(`-- section-${it.sec} xid:${it.xid}`)
//    console.log(`   auteurs:`,it.auteurs)
//    console.log(`   titles:`,it.indexNames) // titre de doument
    it.auteurs && it.auteurs.forEach(au=>{
      _au[au] = _au[au] || [];
      _au[au].push(it.xid);
      console.log(`@44 xid:${it.xid} => [${au}]`)
    })
  } else {
    // here we have constructeurs.
    it.indexNames && it.indexNames.forEach(cn =>{
      _constructeurs[cn] = _constructeurs[cn] || [];
      _constructeurs[cn].push(it.xid);
//      console.log(`@52 xid:${it.xid} => [${cn}]`)
    })
  }


  if (it.mk && it.mk.length>0 && it.sec <3) {
    it.mk.forEach(mk =>{
      mk = mk.trim()
      if (mk) {
        _mk[mk] = _mk[mk] || [];
        _mk[mk].push(it.xid);
      }
    })
  }
}


Object.keys(_au).sort((a,b)=>(a.localeCompare(b)))
.forEach(au =>{
  console.log(`@52 [${au}]`);
  _au[au].forEach(xid =>{
    console.log(`@52 -- [${xid}] ${_xlsx[xid].indexNames[0]}`);
  })
})


Object.keys(_constructeurs).sort((a,b)=>(a.localeCompare(b)))
.forEach(cn =>{
  console.log(`@69 [${cn}]`);
  _constructeurs[cn].forEach(xid =>{
    console.log(`@69 -- [${xid}] ${_xlsx[xid].indexNames[0]}`);
  })
})

Object.keys(_mk).sort((a,b)=>(a.localeCompare(b)))
.forEach(mk =>{
  console.log(`@86 [${mk}]`);
  _mk[mk].forEach(xid =>{
    console.log(`@86 -- [${xid}] ${_xlsx[xid].indexNames[0]}`);
  })
})

console.log(`writing json on file <${xlsx_fn+".json"}>`)
console.log(`xlsx total-rows:${xlsx_Count} deleted:${deleted_Count}`)
console.log(`${Object.keys(_au).length} auteurs`)
console.log(`${Object.keys(_constructeurs).length} constructeurs`)
console.log(`${Object.keys(_mk).length} marques`)
console.log('-eoj-')
