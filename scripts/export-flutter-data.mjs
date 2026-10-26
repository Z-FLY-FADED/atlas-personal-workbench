import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

// Read-only export, one archive per owner. Never upload or modify the source DB.
const root=resolve(import.meta.dirname,'..');
const argument=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const source=resolve(root,argument('--db-dir')||'.runtime/backups/before-flutter-data-20261026');
const output=resolve(root,argument('--out')||'.runtime/flutter-migration');
const kinds=new Set(['tasks','task_subtasks','focus_sessions','projects','project_knowledge','quick_notes','reminders','knowledge','knowledge_preferences','profiles','resumes','applications','resume_versions','application_resume_links','career_attachments','weekly_reviews','workspace_settings','learning_cards','learning_logs','industry_sources','industry_articles','industry_article_actions','industry_ingestion_runs','instruments','instrument_aliases','watchlists','watchlist_items','recycled_records','ai_connections','ai_schedules','ai_runs']);
const secret=/^(api_?key|secret_?key|service_role|access_token|refresh_token|owner_?id|user_?id)$/i;
const quote=name=>'"'+name.replaceAll('"','""')+'"';
mkdirSync(output,{recursive:true});
const result=[];
for(const filename of readdirSync(source).filter(name=>name.endsWith('.sqlite'))){
  const db=new DatabaseSync(join(source,filename),{readOnly:true});
  try {
    const available=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name).filter(name=>kinds.has(name));
    const tables=Object.fromEntries(available.map(name=>[name,db.prepare(`SELECT * FROM ${quote(name)}`).all()]));
    const owners=new Set(Object.values(tables).flat().map(row=>row.owner_id).filter(Boolean));
    for(const owner of owners){
      const tag=createHash('sha256').update(owner).digest('hex').slice(0,12);
      const rows=[];
      for(const [kind,values] of Object.entries(tables)){
        for(const row of values.filter(row=>row.owner_id===owner||(!Object.hasOwn(row,'owner_id')&&['instruments','instrument_aliases'].includes(kind)))){
          const payload=Object.fromEntries(Object.entries(row).filter(([key])=>!secret.test(key)));
          if(kind==='workspace_settings'&&row.key==='runtime-policy'){
            try{const policy=JSON.parse(String(payload.value));payload.value=JSON.stringify({...policy,mode:policy.mode==='ai'?'public':policy.mode,automaticAI:false});}catch{payload.value=JSON.stringify({mode:'public',automaticAI:false});}
          }
          rows.push({kind,legacy_key:String(row.id??row.knowledge_key??'singleton'),payload});
        }
      }
      const archive={format:'atlas-flutter',version:1,created_at:new Date().toISOString(),rows,checksum:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
      const path=join(output,`atlas-owner-${tag}.json`);
      writeFileSync(path,JSON.stringify(archive,null,2),{flag:'wx'});
      result.push({file:path,records:rows.length,collections:Object.fromEntries([...new Set(rows.map(row=>row.kind))].map(kind=>[kind,rows.filter(row=>row.kind===kind).length]))});
    }
  }finally{db.close();}
}
writeFileSync(join(output,'export-manifest.json'),JSON.stringify({created_at:new Date().toISOString(),source,exports:result},null,2),{flag:'wx'});
console.log(JSON.stringify({readOnly:true,exports:result.map(({file,records,collections})=>({file,records,collections}))},null,2));
