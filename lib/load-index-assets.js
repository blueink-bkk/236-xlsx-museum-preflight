const find = require('find');
const path = require('path')
const fs = require('fs')
const moment = require('moment')

/********************

  for each fileName, build an array of folder
  IF found in multiple folder, sort by date. (mtime)

  return an Object. (hash)

*********************/

module.exports = function(assets_path) {
  const files = find.fileSync(/\.pdf$|\.jpg$/, assets_path);
  console.log(`@6: found ${files.length} in assets`)
  const assets = {};
  files.forEach(file =>{
    const {base} = path.parse(file);
    assets[base] = assets[base] || [];
    assets[base].push(file);
  })

  console.log(`@14: assets size ${Object.keys(assets).length}`)

  const offset = assets_path.length;

  Object.entries(assets).forEach(([key,value])=>{
    if (value.length >1) {
      console.log(`\n${key}`);

      const vv = value.map(it=>{
        const {size, mtime} = fs.statSync(it);
        return {fn:it, size, mtime, timeStamp:new Date(mtime).getTime()}
      })
      .sort((a,b)=>{
        return b.timeStamp-a.timeStamp;
      })

//      console.log(vv)

      .forEach(v=>{
//        const {size, mtime} = fs.statSync(v);
        console.log(`  -- ${v.size} (${moment(new Date(v.mtime)).format('YYYY-MM-DD- HH:MM')}) ${v.fn.substring(offset)}`)
      })
    }
  })

  return assets;
}
