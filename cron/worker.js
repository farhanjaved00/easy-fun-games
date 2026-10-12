// EasyGameFun daily timer (Cloudflare Worker with Cron Triggers).
// GitHub's own schedule can be late or skipped, so this Worker starts the GitHub "Deploy"
// workflow on time. The workflow only adds the games still missing for the day, so extra
// starts never create extra games.
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(startDailyRun(env, event.cron));
  }
};

async function startDailyRun(env, cron) {
  const res = await fetch(`https://api.github.com/repos/${env.REPO}/actions/workflows/deploy.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'easygamefun-daily-timer',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ref: 'main', inputs: { import_count: '5', daily: true } })
  });
  if (res.status !== 204) throw new Error(`GitHub answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  console.log(`Daily run started (${cron})`);
}
