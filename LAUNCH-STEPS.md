# Launch steps for EasyGameFun

Short steps, in order. Never paste a token or password into a chat. Keys go only into GitHub Secrets or Cloudflare.

Cloudflare sometimes moves buttons. If a name differs slightly, look for the closest match.

---

## 1. Push the code to GitHub (computer)

Open Terminal in the `easy-fun-games` folder and run:

```bash
git init -b main
git add .
git commit -m "EasyGameFun site"
git remote add origin https://github.com/farhanjaved00/easy-fun-games.git
git push -u origin main
```

If GitHub asks for a password, it wants a token, not your password. The easy way: install GitHub Desktop, sign in, and push from there.

The first deploy will **fail** until step 3 is done. That is expected.

## 2. Make a Cloudflare API token

1. Go to dash.cloudflare.com.
2. Top right: your profile icon > **My Profile** > **API Tokens**.
3. **Create Token** > **Create Custom Token** (Get started).
4. Name: `GitHub deploy easy-fun-games`.
5. Permissions: **Account** > **Cloudflare Pages** > **Edit**.
6. Account Resources: **Include** > your account.
7. **Continue to summary** > **Create Token**.
8. Copy the token. It is shown only once.

Get your **Account ID**: open **Workers & Pages** in the left menu. The Account ID is on the right side. (It is also the long code in the browser address after `dash.cloudflare.com/`.)

## 3. Add the two secrets to GitHub

1. github.com/farhanjaved00/easy-fun-games > **Settings** > **Secrets and variables** > **Actions**.
2. **New repository secret**: name `CLOUDFLARE_API_TOKEN`, value = the token.
3. **New repository secret**: name `CLOUDFLARE_ACCOUNT_ID`, value = the Account ID.
4. Go to the **Actions** tab > **Deploy** > **Run workflow**.
5. Wait for the green tick (about 1 minute). The site is now at `https://easy-fun-games.pages.dev`.

From now on every push to `main` deploys by itself, and it also rebuilds every day.

## 4. Connect easygamefun.com

1. Cloudflare > **DNS** > **Records** for easygamefun.com. Delete any old `A`, `AAAA` or `CNAME` records for `easygamefun.com` (`@`) and `www` (for example parking or Hostinger records). Leave `MX` and `TXT` records alone.
2. **Workers & Pages** > **easy-fun-games** > **Custom domains** > **Set up a custom domain**.
3. Type `easygamefun.com` > **Continue** > **Activate domain**.
4. Repeat for `www.easygamefun.com`.
5. Wait until both say **Active** (a few minutes, sometimes up to an hour).

## 5. Send www to the main address

We use `easygamefun.com` (no www) everywhere.

1. Cloudflare > easygamefun.com > **Rules** > **Redirect Rules** > **Create rule**.
2. Name: `www to apex`.
3. When: **Hostname** **equals** `www.easygamefun.com`.
4. Then: **Dynamic**, expression: `concat("https://easygamefun.com", http.request.uri.path)`, status **301**, tick **Preserve query string**.
5. **Deploy**.

## 6. HTTPS settings

1. **SSL/TLS** > **Overview**: set mode to **Full (strict)**.
2. **SSL/TLS** > **Edge Certificates**: turn **Always Use HTTPS** on.

## 7. Free analytics (no cookies)

**Workers & Pages** > **easy-fun-games** > **Metrics** > **Web Analytics** > **Enable**.

## 8. Email: hello@easygamefun.com

1. Cloudflare > easygamefun.com > **Email** > **Email Routing** > **Get started**.
2. Custom address: `hello`. Destination: your own email.
3. Open the verify email Cloudflare sends you and click the link.
4. Back in Cloudflare, click **Add records and enable**.
5. Send a test email to hello@easygamefun.com.

## 9. Turn on Google (only when real games are live)

Do this after the partner games replace the sample games.

1. In `data/site.json`, change `"indexing": false` to `"indexing": true`. Commit and push.
2. Go to search.google.com/search-console > **Add property** > **Domain** > `easygamefun.com`.
3. Copy the TXT record. In Cloudflare **DNS** > **Records** > **Add record**: type `TXT`, name `@`, content = paste. Save.
4. Back in Search Console click **Verify**.
5. **Sitemaps** > enter `sitemap.xml` > **Submit**.
6. Bing: bing.com/webmasters > **Import from Google Search Console**. Bing also gets new pages automatically (IndexNow runs after each deploy).

---

## Still to decide

- Game partner (GameDistribution, GamePix, GameMonetize, Famobi or Playgama). Read their embed terms and apply.
- Have a legal advisor review Privacy, Terms and Copyright pages before launch.
- Search for existing "Easy Game Fun" brands and grab matching social handles.
