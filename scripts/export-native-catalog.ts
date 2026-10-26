import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { initialKnowledge } from '../app/features/knowledge/domain/initialKnowledge';
import { enrichKnowledge } from '../app/features/knowledge/domain/enrichment';
import { languageWordBank, languageCaseBank } from '../app/features/learning/domain/lessons';
import { graphCategories, semanticTopics } from '../app/features/knowledge/domain/graph';
import { resumeSkillDictionary } from '../app/features/career/domain/resumeMatching';
import { jobs } from '../app/server/jobs/catalog';

const root=resolve(import.meta.dirname,'..');
const output=join(root,'apps/atlas/assets');
mkdirSync(join(output,'images'),{recursive:true});
const path=join(root,'app/server/market/handlers.ts');
const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
let market: unknown[]=[];
function visit(node: ts.Node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='candidates'&&node.initializer){
    market=runInNewContext(`(${node.initializer.getText(source)})`) as unknown[];
  }
  ts.forEachChild(node,visit);
}
visit(source);
const snake=(row: Record<string,unknown>)=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key.replace(/[A-Z]/g,letter=>'_'+letter.toLowerCase()),value]));
const knowledge=initialKnowledge.map(item=>({...snake(item),enrichment:enrichKnowledge(item)}));
const catalog={version:1,source:'Original ATLAS repository static catalog',knowledge,words:languageWordBank,cases:languageCaseBank,categories:graphCategories,topics:semanticTopics,skills:resumeSkillDictionary,jobs,market};
writeFileSync(join(output,'catalog.json'),JSON.stringify(catalog));
for(const file of readdirSync(join(root,'public')).filter(name=>/^knowledge.*\.webp$/.test(name))){copyFileSync(join(root,'public',file),join(output,'images',file));}
console.log(JSON.stringify({knowledge:knowledge.length,words:Object.values(languageWordBank).flat().length,jobs:jobs.length,market:market.length}));
