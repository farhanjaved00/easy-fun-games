# Social media auto-posting: setup

Every new game is posted automatically to **Facebook**, **Instagram** and **Pinterest** with its own branded image and an AI-written caption.
Up to 3 games are posted per run (3 runs a day). Nothing is posted twice. Older games are posted gradually after the new ones.

You only do this setup once. Use the name **easygamefun** everywhere.
Keys go only into **GitHub > Settings > Secrets and variables > Actions**. Never paste them into a chat.

Do the computer steps on your Mac (you need Terminal for the two connect scripts).

---

## Part 1: Facebook Page

1. Go to **facebook.com/pages/create** (logged in to your own Facebook).
2. Page name: `EasyGameFun`. Category: `Gaming Video Creator` or `Website`.
3. Add the logo (`brand/logo-mark.svg` as an image) and the cover (`src/static/icons/og-image.png`).
4. In the Page's **About**, add the website `https://easygamefun.com`.

## Part 2: Instagram (linked to the Page)

1. Create an Instagram account `@easygamefun` in the Instagram app.
2. Instagram > **Settings** > **Account type and tools** > **Switch to professional account** > **Business** (or Creator).
3. Link it to the Facebook Page: Facebook Page > **Settings** > **Linked accounts** > **Instagram** > **Connect**.
4. In the Instagram bio, put `easygamefun.com` as the link (posts say "link in bio").

## Part 3: Meta app (lets the site post for you)

1. Go to **developers.facebook.com** > **My Apps** > **Create App**.
2. Use case: **Manage everything on your Page** (and add **Manage messaging & content on Instagram** if offered). App type: Business.
3. Name: `EasyGameFun Poster`. Finish creating it.
4. In the app: **App settings > Basic**. Copy the **App ID** and **App Secret** (keep them for step 7).
5. Open **developers.facebook.com/tools/explorer** (Graph API Explorer):
   - **Meta App**: choose `EasyGameFun Poster`.
   - **User or Page**: User Token.
   - **Permissions**: add `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`.
   - Click **Generate Access Token**, log in, and when asked, select the **EasyGameFun Page** and **Instagram account**.
6. Copy the token shown at the top.
7. On your Mac, in Terminal, inside the project folder, run:

```bash
node scripts/connect-meta.mjs
```

   Paste the App ID, App Secret and the token when asked. It prints three values.
8. Add them as GitHub secrets: `FB_PAGE_ID`, `META_PAGE_TOKEN`, `IG_USER_ID`. The page token printed should say **expires: never**.

Notes:
- Your app can stay in **Development mode**: you are the app's admin and the Page's admin, so it may post to your own Page and Instagram.
- If Instagram asks for **Page Publishing Authorization**, open the Page on Facebook and complete it (identity check).

## Instagram without linking to the Page ("Instagram login")

Use this if Meta says "Connecting an Instagram profile to your Page isn't available".

1. Instagram must be a **Professional (Business)** account.
2. developers.facebook.com > your app > **Use cases** > Instagram > **Customize** > **API setup with Instagram login**.
3. Step 1: click **Add all required permissions**.
4. Step 2 **Generate access tokens**: click **Add account**, log in to `@easygamefun`, allow. Then click **Generate token** next to the account and copy it.
   (If it asks for a tester first: App roles > Roles > **Add people** > Instagram Tester > `easygamefun`, then accept it in Instagram: Settings > Website permissions > Apps and websites > Tester invites.)
5. On your Mac run `node scripts/connect-instagram.mjs` and paste the token. It checks the account.
6. Add GitHub secrets: `IG_LOGIN_TOKEN` (the token) and `IG_APP_SECRET` (the **Instagram app secret** on the same page).

The token lasts 60 days; the daily run renews it every week by itself.

## Part 4: Pinterest

1. Create a **business account** at **pinterest.com/business/create** with the name `EasyGameFun` and website `easygamefun.com`.
2. Claim the website: Pinterest **Settings > Claimed accounts > Websites > Claim**. Choose the **HTML tag** option and send me the tag; I will add it to the site.
3. Go to **developers.pinterest.com** > **My apps** > **Connect app** / **Create app**. Name: `EasyGameFun Poster`.
4. In the app settings, add the **Redirect URI** `http://localhost:8085/` and save.
5. Copy the **App ID** and **App secret key**.
6. Request **Standard access** for the app (Pinterest reviews it; until then new apps may only post in a test sandbox).
7. On your Mac, in Terminal, inside the project folder, run:

```bash
node scripts/connect-pinterest.mjs
```

   Paste the App ID and secret; a browser opens; click **Give access**. It picks or creates a board called **Free Online Games** and prints four values.
8. Add them as GitHub secrets: `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_REFRESH_TOKEN`, `PINTEREST_BOARD_ID`.

The daily run renews the Pinterest login automatically and saves it encrypted, so you do not need to reconnect.

---

## After setup

- You do not need to do anything else. The next daily run prepares images, deploys them, then posts.
- Want to see it now? GitHub > **Actions** > **Deploy** > **Run workflow** (import count `0` is fine).
- The log of every post is in `data/social.json`.
- To pause posting: in `data/site.json`, set `"autopost": { "enabled": false }`.
- If a login stops working, the run fails and GitHub emails you. Run the matching connect script again and update the secret.
