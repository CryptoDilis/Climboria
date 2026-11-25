import test from 'node:test';
import assert from 'node:assert/strict';
import {consumePreviewRoster} from './preview-qa-roster.mjs';
const a='s_'+'a'.repeat(32),b='s_'+'b'.repeat(32),c='s_'+'c'.repeat(32);
const roster=ids=>({type:'preview-peers',ids});
test('initial singleton cannot falsely certify disconnect after two peers joined',()=>{
 const result={type:'result',ok:true};
 const inbox=[roster([a]),result,roster([a,b])];
 assert.equal(consumePreviewRoster({ids:[a,b],inbox}),true);
 assert.deepEqual(inbox,[result]);
 assert.equal(consumePreviewRoster({ids:[a],inbox}),false);
 inbox.push(roster([a]));
 assert.equal(consumePreviewRoster({ids:[a],inbox}),true);
 inbox.push(roster([a,c]));
 assert.equal(consumePreviewRoster({ids:[a,c],inbox}),true);
 assert.deepEqual(inbox,[result]);
});
test('roster checkpoints retain later transitions, match exact distinct IDs, and ignore malformed packets',()=>{
 const inbox=[null,roster([a,a]),roster([a,c]),roster([b,a]),roster([a])];
 assert.equal(consumePreviewRoster({ids:[a,a],inbox}),false);
 assert.equal(consumePreviewRoster({ids:[a,b],inbox}),true);
 assert.deepEqual(inbox,[null,roster([a])]);
 assert.equal(consumePreviewRoster({ids:[a],inbox}),true);
});
