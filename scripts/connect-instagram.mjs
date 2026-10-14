// One-time helper: checks the Instagram token for "Instagram login" posting (no Facebook Page link needed).
// Get the token in your Meta app: Use cases > Instagram > API setup with Instagram login > 2. Generate access tokens.
// Run it yourself on your computer:  node scripts/connect-instagram.mjs
// Never paste the token into a chat.
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const V = process.env.META_GRAPH_VERSION || 'v26.0';
const rl = readline.createInterface({ input: stdin, output: stdout });

console.log('\nEasyGameFun: connect Instagram (Instagram login)\n');
const token = (await rl.question('Paste the Instagram access token from your Meta app: ')).trim();
try {
  const me = await fetch(`https://graph.instagram.com/${V}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(token)}`).then(r => r.json());
  if (!me.user_id) throw new Error(me.error?.message || 'This token did not work. Generate a new one and try again.');
  console.log(`\nConnected to @${me.username} (${me.account_type || 'professional'} account).`);
  if (me.account_type && !/BUSINESS|MEDIA_CREATOR/i.test(me.account_type)) console.log('Note: switch Instagram to a Professional (Business) account, or posting will not work.');
  console.log('\nAdd these as GitHub repository secrets (Settings > Secrets and variables > Actions):\n');
  console.log(`   IG_LOGIN_TOKEN  = ${token}`);
  console.log('   IG_APP_SECRET   = the "Instagram app secret" shown on the same Meta page (click Show)\n');
  console.log('After that, the daily run posts to Instagram and renews this login by itself.\n');
} catch (e) {
  console.log(`\nSomething went wrong: ${e.message}\n`);
}
rl.close();
