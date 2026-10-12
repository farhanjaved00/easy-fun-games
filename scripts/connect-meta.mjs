// One-time helper: connects your Facebook Page and Instagram account for auto-posting.
// Run it yourself on your computer:  node scripts/connect-meta.mjs
// It prints the values to save as GitHub secrets. Never paste them into a chat.
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const V = process.env.META_GRAPH_VERSION || 'v26.0';
const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = async q => (await rl.question(q)).trim();
const get = async url => { const r = await fetch(url); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };

console.log('\nEasyGameFun: connect Facebook Page + Instagram\n');
const appId = await ask('1) Your Meta App ID: ');
const appSecret = await ask('2) Your Meta App Secret: ');
const userToken = await ask('3) The User access token from Graph API Explorer: ');

try {
  // Exchange the short user token (1-2 hours) for a long-lived one; Page tokens made from it do not expire.
  const ll = await get(`https://graph.facebook.com/${V}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(userToken)}`);
  const pages = (await get(`https://graph.facebook.com/${V}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(ll.access_token)}`)).data || [];
  if (!pages.length) throw new Error('No Facebook Pages found. Make sure you picked your Page when you gave permissions in Graph API Explorer.');
  pages.forEach((p, i) => console.log(`   ${i + 1}. ${p.name}${p.instagram_business_account ? ` (Instagram: @${p.instagram_business_account.username})` : ' (no Instagram linked)'}`));
  const pick = pages.length === 1 ? pages[0] : pages[(+(await ask('Which Page number is EasyGameFun? ')) || 1) - 1];
  const dbg = await get(`https://graph.facebook.com/${V}/debug_token?input_token=${encodeURIComponent(pick.access_token)}&access_token=${encodeURIComponent(appId + '|' + appSecret)}`);
  const exp = dbg.data?.expires_at;
  console.log('\nDone. Add these as GitHub repository secrets (Settings > Secrets and variables > Actions):\n');
  console.log(`   FB_PAGE_ID       = ${pick.id}`);
  console.log(`   META_PAGE_TOKEN  = ${pick.access_token}`);
  if (pick.instagram_business_account) console.log(`   IG_USER_ID       = ${pick.instagram_business_account.id}`);
  else console.log('   IG_USER_ID       = (none yet: link your Instagram professional account to this Page, then run this again)');
  console.log(`\n   Page token expires: ${!exp ? 'never' : new Date(exp * 1000).toDateString()}`);
  console.log(`   Permissions: ${(dbg.data?.scopes || []).join(', ')}\n`);
} catch (e) {
  console.log(`\nSomething went wrong: ${e.message}\n`);
}
rl.close();
