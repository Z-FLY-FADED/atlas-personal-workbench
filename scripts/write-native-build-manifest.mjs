import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const app=join(root,'apps/atlas');
const output=join(root,'release/flutter');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inputs=[];
function visit(path){
  for(const entry of readdirSync(path,{withFileTypes:true})){
    const full=join(path,entry.name);
    if(entry.isDirectory())visit(full);
    else if(entry.isFile())inputs.push({file:relative(app,full).replaceAll('\\','/'),sha256:sha(readFileSync(full))});
  }
}
for(const folder of ['lib','assets','android/app/src','windows/runner'])visit(join(app,folder));
for(const file of ['pubspec.yaml','pubspec.lock','android/app/build.gradle.kts','android/build.gradle.kts','android/settings.gradle.kts','android/gradle.properties','android/gradle/wrapper/gradle-wrapper.properties','windows/CMakeLists.txt','windows/flutter/CMakeLists.txt','config/prod.json'])inputs.push({file,sha256:sha(readFileSync(join(app,file)))});
inputs.sort((a,b)=>a.file.localeCompare(b.file));
const sourceSha256=sha(Buffer.from(JSON.stringify(inputs)));
const artifactPaths=[join(output,'WorkSpace-Android.apk'),join(output,'windows/WorkSpace.exe'),
  ...readdirSync(output).filter(name=>/^WorkSpace-Windows-.*\.zip$/.test(name)).sort().slice(-1).map(name=>join(output,name))];
const artifacts=artifactPaths.map(path=>({file:relative(root,path).replaceAll('\\','/'),bytes:statSync(path).size,sha256:sha(readFileSync(path))}));
const version=readFileSync(join(app,'pubspec.yaml'),'utf8').match(/^version:\s*(.+)$/m)?.[1];
const manifest={createdAt:new Date().toISOString(),version,platforms:['windows-x64','android'],sourceSha256,sourceFiles:inputs.length,artifacts,
  note:'Artifact checksums only. Test, cloud and physical-device verification must be recorded separately for each release.'};
writeFileSync(join(output,'build-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({version,sourceSha256,artifacts},null,2));
