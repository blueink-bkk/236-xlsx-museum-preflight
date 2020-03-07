const Massive = require('massive');
const monitor = require('pg-monitor');
const assert = require('assert')

async function index_marques(o) {
  const {verbose=false} = o;
  const etime = new Date().getTime();
  let db = o.db || await Massive(o)
  // if db already open - do not close....

  const data = await db.query(`
    select
       data->'indexNames' as indexnames,
       data->'links' as links,
       data->>'yp' as yp,
       (data->>'transcription')::boolean as transcription,
       (data->>'restricted')::boolean as restricted,
       data->>'xid' as xid,
       data->'mk' as mk,
       (data->>'sec')::integer as sec
    from tvec.pages, tvec.files
    where (file_id = id) and (path <@ 'museum.yaml')
    and ((data->>'sec')::integer < 3)
    and (data->>'mk' is not null)
    order by data->>'yp'
    ;
    `,[],{single:false})
  // console.log({data})
  if (!o.db) db.instance.$pool.end();

  // now we can process the data.

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
  */
  const index = mk_index2(data).sort((a,b)=>{
    //console.log({a})
    return a.marque.localeCompare(b.marque);}
  );

  (verbose >0) && console.log(`@155 etime:${new Date().getTime()-etime}`)
//    console.log({index})

  const list = [];

  for (it of index) {
    const va =[];
//      console.log(`-- ${it.marque} articles:${it.articles.length}`)
    for (a of it.articles) {
      //console.log(a); process.exit(1);
      assert(a.title)
      const vp =[];
      (verbose >0) && console.log(`   [${a.xid}] yp:${a.yp} links:${a.links.length}`)
      for (pdf of a.links) {
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
      /*
      if (!a.indexNames || a.indexNames<=0) {
        console.log(`@203 fatal indexNames:`,{a})
        process.exit(-a)
      }*/
      if (a.restricted) {
        va.push(`
          <div style="margin:4px 0 0 0px;">
            <span class="yp">(${a.yp})</span> ${a.title}
            <span style="font-size:9pt;">[${a.xid}]
              <span class="red">Restricted</span>
            </span>
            ${vp.join('')}
            </div>
        `);
      } else {
        va.push(`
          <div style="margin:4px 0 0 0px;">
            <span class="yp">(${a.yp})</span> ${a.title} [${a.xid}]
            ${vp.join('')}
            </div>
        `);
      }
    }


    list.push(`
      <div style="margin:5px 0 0 0; border-bottom:3px solid rgb(230,230,230); padding:0 0 10px 0; font-family:times;">
        <b>Marque :</b><br>
        <a href="/auteur/">${it.marque}</a><br>
        <div style="margin:5px 0 0 20px;">
          <b>Cité dans le(s) document(s) suivant(s)</b>
          ${va.join('')}
        </div>
      </div>
      `)
  }


  return {data,
    list,
    etime: new Date().getTime() - etime
  }
}

function mk_index2(xlsx) { // 1-1 relation with xlsx
  const marques = {}
  let mCount = 0;
  for (const xe of xlsx) {
    const {xid, yp, indexnames:indexNames, mk, links, transcription, restricted} = xe;
    // each xlsx-entry can generate multiple entry in marques.

    if (!indexNames || !mk) {
      console.log(`@328 fatal:`,{xe})
      process.exit(-1)
    }

//    console.log(`@332 fatal:`,{indexnames})

    const _mk = mk.map(mk1=>(mk1.trim())).filter(mk1=>(mk1.length>0)); // FIX.

    if (!mk || (mk.length<1)) {
      notice(`j:${j} titre:${JSON.stringify(indexNames)}`);
      mCount++;
      notice (`mapp_index_byMarques =>fatal title without marque xid:${xid} ${mCount}/${j}`);
      continue;
    }
  //  notice(titre.sec);


    _mk.forEach((mk1)=>{
      if (mk1.length<1) throw `fatal-65`;
      if (mk1.trim().length<1) throw `fatal-66`;
      marques[mk1] = marques[mk1] || [];

      marques[mk1].push({
        title : indexNames[0],
  	    xid,
  	    yp,
  	    links, // pdf
  	    transcription,
  	    restricted
  	  })
    });
  }; // loop.


  const mlist = Object.keys(marques).map(mk1 => ({
      marque: mk1 || '*null*',		// marque === iName
  //    nc: marques[mk1].length,
      articles: marques[mk1]	// list of catalogs.
  }));

  return mlist;
}

function mk_index(xlsx) {
  for (let ix=0; ix <xlsx.length; ix++) {
    const it = xlsx[ix];
    if (it.deleted) continue;
//    console.log(`--- ${it.xid} sec:${it.sec}`)

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
  console.log({_mk})
}

//const etime = new Date().getTime();

module.exports = index_marques;
