import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {translate,interpolate} from '../src/i18n/core.ts';
import {de} from '../src/i18n/de.ts';

test('interface translations preserve placeholders and fallback copy',()=>{
 for(const [english,german] of Object.entries(de)) {
  assert.ok(german.trim(),english);
  const tokens=s=>[...s.matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(tokens(german),tokens(english),english);
 }
 assert.equal(translate('de','Email',de),'E-Mail');
 assert.equal(translate('en','Email',de),'Email');
 assert.equal(translate('de','Unknown interface text',de),'Unknown interface text');
 assert.equal(interpolate('{{email}}',{email:'a{{other}}@example.test'}),'a{{other}}@example.test');
});
test('every explicit literal translation call has a German entry',()=>{
 const missing=[];
 function visitFolder(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){
  const path=folder+'/'+entry.name;
  if(entry.isDirectory())visitFolder(path);
  else if(/\.tsx?$/.test(path)){
   const ast=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
   function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='t'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])&&!Object.hasOwn(de,n.arguments[0].text))missing.push(path+': '+n.arguments[0].text);ts.forEachChild(n,visit)}visit(ast);
  }
 }}visitFolder('src');
 assert.deepEqual(missing,[]);
});
