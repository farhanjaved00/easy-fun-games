// Company, help and legal pages. Edit the text here; the build adds titles, schema and the sitemap.
// Have the legal pages (privacy, cookies, terms, disclaimer, copyright) reviewed by a legal advisor.
import { esc, fitDesc } from './util.mjs';
import { crumbs, faqHTML, crumbLD, faqLD } from './blocks.mjs';

const UPDATED = 'October 11, 2026';

export const SITE_FAQ = [
  { q: 'Is EasyGameFun free?', a: 'Yes. Every game on EasyGameFun is free to play. There is nothing to buy, no subscription and no account to create.' },
  { q: 'Do I need to download anything?', a: 'No. All games run in your web browser. Open a game page, press Play and the game starts on the page.' },
  { q: 'Can I play on my phone or tablet?', a: 'Yes. Most games work on phones, tablets and computers. Some games are made for a keyboard and mouse; the How to play section on each game page shows the controls.' },
  { q: 'Do I need an account?', a: 'No. There are no accounts on EasyGameFun. Saved games and recently played games are kept in your own browser on your device.' },
  { q: 'How do I save a game to play later?', a: 'Press the Save button on any game page. Your saved games appear on the Saved page. They are stored in your browser, so they stay on that device and browser only.' },
  { q: 'A game does not load. What can I do?', a: 'Refresh the page and press Play again. If it still does not load, try another browser or turn off ad or script blockers for this site. You can also tell us through the Contact page with the game name and your device.' },
  { q: 'Where do the games come from?', a: 'Games are made by independent game studios and are provided by game partners who allow other websites to show them. The games load from the partner when you press Play.' },
  { q: 'How often are new games added?', a: 'New games are added every day.' },
  { q: 'Are the games suitable for children?', a: 'Many games are family friendly and the Kids category is a good place to start. Some games include fighting or shooting. Games with mature content show a content notice above the game. See our page for parents for more.' },
  { q: 'Why do some games show ads?', a: 'Some games include short ads that are shown by the game partner. These ads help keep the games free.' },
  { q: 'Who writes the game descriptions?', a: 'Game pages are written with the help of AI tools, using information about each game, and are checked automatically for length, accuracy rules and originality before they go live.' },
  { q: 'How can I suggest or submit a game?', a: 'Use the Contact page. Tell us the game name and a link, and whether you made it.' }
];

export function infoPages(m) {
  const B = m.site.baseUrl, mail = esc(m.site.email);
  // email_off stops Cloudflare from rewriting the address into a /cdn-cgi/ link that crawlers report as 404.
  const mailLink = `<!--email_off--><a href="mailto:${mail}">${mail}</a><!--/email_off-->`;
  const updated = `<p class="sub">Last updated: ${UPDATED}</p>`;
  const kids = m.cats.find(c => c.slug === 'kids');
  const kidsLink = kids ? `<a href="${kids.url}">Kids category</a>` : 'Kids category (coming soon)';

  const P = [
    {
      slug: 'about', crumb: 'About us', title: 'About Us | EasyGameFun',
      desc: 'EasyGameFun is a free online games site. Learn how we pick games, how our game pages are written, and how we keep the site fast and simple.',
      html: `<h1>About EasyGameFun</h1>
<p>EasyGameFun is a free online games site. Our goal is simple: you should be able to find a good game and start playing in a few seconds, on any device, with nothing to install and no account to create.</p>
<h2>How we choose games</h2>
<p>Our games come from game partners who allow websites like ours to show their games. Before a game goes live we check that the partner allows it to be embedded, and we read its information: what kind of game it is, how it is played and which devices it works on. Games with mature content get a clear content notice and are never placed in the Kids category.</p>
<h2>How our game pages are written</h2>
<p>Every game page explains what the game is, how to play it, the controls, tips and common questions. Pages are written with the help of AI tools from the information about each game. Before a page is published it is checked automatically: it must stay within the facts, must not copy text from other websites, must be different from our other pages, and must not make claims like "the best game ever". If a page fails these checks, it is not published.</p>
<h2>Fast and simple</h2>
<p>EasyGameFun is built to load quickly, even on slow phone connections. Games only start loading after you press Play, so pages open fast and you stay in control.</p>
<h2>Free to play</h2>
<p>All games are free. Some games include short ads shown by the game partner, which help keep them free. Your saved games are stored on your own device, not on our servers.</p>
<h2>Get in touch</h2>
<p>Questions, ideas or a game to suggest? Visit our <a href="/contact/">contact page</a> or read the <a href="/faq/">FAQ</a>.</p>`
    },
    {
      slug: 'contact', crumb: 'Contact us', title: 'Contact Us | EasyGameFun',
      desc: 'Contact EasyGameFun for questions, feedback, game suggestions, problem reports or copyright requests. Email us and we will reply as soon as we can.',
      html: `<h1>Contact us</h1>
<p>We read every message. Email us at ${mailLink} and we will reply as soon as we can, usually within a few working days.</p>
<h2 id="report">Report a problem with a game</h2>
<p>Please include the game name or page address, your device (for example iPhone, Android phone or Windows laptop) and your browser. A short description of what happens helps us fix it faster.</p>
<h2 id="submit">Suggest or submit a game</h2>
<p>Send us the game name and a link. If you made the game, tell us where it is hosted and whether it can be embedded on other websites.</p>
<h2>Business and partnerships</h2>
<p>For advertising, partnerships or other business questions, email ${mailLink} with "Business" in the subject line.</p>
<h2>Copyright requests</h2>
<p>If you believe content on EasyGameFun uses your work without permission, please follow the steps on our <a href="/copyright/">copyright page</a>.</p>
<h2>Before you write</h2>
<p>Many common questions are answered in our <a href="/faq/">FAQ</a>.</p>`
    },
    {
      slug: 'faq', crumb: 'FAQ', title: 'FAQ: Help and Common Questions | EasyGameFun',
      desc: 'Answers to common questions about EasyGameFun: free games, playing on phone, saving games, games that do not load, where games come from and safety.',
      faq: SITE_FAQ,
      html: `<h1>Frequently asked questions</h1>
<p>Quick answers about playing games on EasyGameFun. Can't find your answer? <a href="/contact/">Contact us</a>.</p>
${faqHTML(SITE_FAQ)}`
    },
    {
      slug: 'parents', crumb: 'For parents', title: 'Information for Parents | EasyGameFun',
      desc: 'A guide for parents: how EasyGameFun works, which games suit younger players, what content notices mean, ads inside games and how to keep play safe.',
      html: `<h1>Information for parents</h1>
<p>EasyGameFun is a general audience games website. We want families to be able to choose games with confidence, so here is how the site works.</p>
<h2>Choosing games for younger players</h2>
<p>The ${kidsLink} is the best place to start. Each game page also lists its category and tags and explains how the game is played, so you can check a game before your child plays it.</p>
<h2>Content notices</h2>
<p>Some games include fighting, shooting, crime themes or strong language. When a game is marked as having mature content, a content notice appears above the game, and the game is never placed in the Kids category. We suggest playing these games together or choosing another game for younger children.</p>
<h2>No accounts, no chat on our site</h2>
<p>EasyGameFun has no user accounts, profiles or chat. We do not ask for names, emails or other personal details. Some multiplayer games, which are run by their makers, let players join online rooms with other people; check the game page if this matters to you.</p>
<h2>Ads inside games</h2>
<p>Some games show short ads that are delivered by the game partner. These are outside our direct control. If you see an ad that is not appropriate, please <a href="/contact/">tell us</a> with the game name.</p>
<h2>Tips for safe play</h2>
<ul><li>Play together with younger children and talk about the games they enjoy.</li><li>Use your device's parental controls and screen time settings.</li><li>Remind children never to share personal information in online games.</li></ul>
<p>Read our <a href="/privacy/">privacy policy</a> for details on data.</p>`
    },
    {
      slug: 'privacy', crumb: 'Privacy policy', title: 'Privacy Policy | EasyGameFun',
      desc: 'How EasyGameFun handles data: no accounts, what is stored in your browser, server and analytics data, embedded partner games, children and your choices.',
      html: `<h1>Privacy policy</h1>${updated}
<p>This policy explains what information is used when you visit EasyGameFun (easygamefun.com) and how. In short: we do not ask for personal information, we have no user accounts, and the few things we remember about your visit stay in your own browser.</p>
<h2>Information stored in your browser</h2>
<p>To make the site easier to use, your browser stores a few small items using local storage. They never leave your device and are not sent to us:</p>
<ul><li>Your saved games and recently played games</li><li>Your light or dark theme choice and whether the side menu is collapsed</li><li>Whether you closed the announcement bar</li><li>Your best scores in our demo games, if you play them</li></ul>
<p>You can delete this information at any time by clearing your browser's site data for easygamefun.com.</p>
<h2>Information collected when you visit</h2>
<p>Our website is delivered by Cloudflare, a hosting and security provider. Like all web servers, it processes technical information such as your IP address, browser type and the pages you request, to deliver the site and protect it from abuse. We may use privacy-friendly website analytics that do not use cookies to see which pages are popular and how fast they load. This information is not used to identify you.</p>
<h2>Embedded games from partners</h2>
<p>Games are provided by game partners and load inside a frame on our pages only after you press Play. When a game loads, the partner and the game may collect information and may use cookies or show ads, under their own privacy policies. Current partners include onlinegames.io and GameDistribution.</p>
<h2>Email</h2>
<p>If you email us, we receive your email address and message and use them only to reply. We do not add you to any mailing list.</p>
<h2>Advertising</h2>
<p>We do not currently show our own ads. If we add advertising in the future, we will update this page first and ask for your consent where the law requires it.</p>
<h2>Children</h2>
<p>EasyGameFun is a general audience website. We do not knowingly collect personal information from children, and the site has no accounts, profiles or chat. Parents can find more information on our <a href="/parents/">page for parents</a>.</p>
<h2>Your rights</h2>
<p>Depending on where you live, you may have rights to access, correct or delete personal information. Because we do not hold accounts or personal profiles, there is usually nothing to access, but you can contact us at ${mailLink} with any request and we will help.</p>
<h2>Changes to this policy</h2>
<p>We may update this policy when the site changes. The date at the top shows the latest version.</p>
<h2>Contact</h2>
<p>Questions about privacy? Email ${mailLink} or use our <a href="/contact/">contact page</a>.</p>`
    },
    {
      slug: 'cookies', crumb: 'Cookie policy', title: 'Cookie Policy | EasyGameFun',
      desc: 'EasyGameFun does not set its own advertising or tracking cookies. Learn what is stored in your browser, what embedded partner games may use and how to clear it.',
      html: `<h1>Cookie policy</h1>${updated}
<h2>Our own cookies</h2>
<p>EasyGameFun does not set its own advertising or tracking cookies. Our hosting provider, Cloudflare, may set strictly necessary security cookies to protect the site from bots and abuse.</p>
<h2>Browser storage</h2>
<p>We use your browser's local storage to remember your saved games, recently played games, theme choice and similar settings. This information stays on your device. See our <a href="/privacy/">privacy policy</a> for the full list.</p>
<h2>Embedded games</h2>
<p>Games load from our game partners after you press Play. These games and their partners may use their own cookies or similar technology, for example to save game progress or show ads. Their use is covered by the partners' own cookie and privacy policies.</p>
<h2>How to control cookies</h2>
<p>You can block or delete cookies and site data in your browser settings. Blocking cookies for embedded games may stop some games from saving progress or loading.</p>
<h2>Changes</h2>
<p>If we add advertising or other services that use cookies, we will update this page first and ask for consent where required.</p>`
    },
    {
      slug: 'terms', crumb: 'Terms of use', title: 'Terms of Use | EasyGameFun',
      desc: 'The terms for using EasyGameFun: free personal use, third-party games, acceptable use, intellectual property, no warranties and limits on our liability.',
      html: `<h1>Terms of use</h1>${updated}
<p>By using EasyGameFun (easygamefun.com) you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>Using the site</h2>
<p>You may use EasyGameFun for personal, non-commercial entertainment. Children should use the site with permission and guidance from a parent or guardian.</p>
<h2>Games from third parties</h2>
<p>The games on EasyGameFun are created and owned by independent developers and are provided by game partners. They load from the partners' servers. We do not control the games, their content, their ads or their availability, and the partners' own terms may also apply when you play.</p>
<h2>Acceptable use</h2>
<p>Do not try to disrupt, overload, copy or scrape the site, get around its security, or use it for anything unlawful. Be respectful to other players in multiplayer games.</p>
<h2>Our content</h2>
<p>The text, design and logo of EasyGameFun belong to us. Game names, images and trademarks belong to their owners. You may share links to our pages.</p>
<h2>No warranties</h2>
<p>The site and the games are provided "as is" and "as available". We do not promise that the site or any game will always be available, free of errors or suitable for a particular purpose.</p>
<h2>Limitation of liability</h2>
<p>To the extent allowed by law, EasyGameFun is not liable for any loss or damage arising from your use of the site or of games provided by third parties.</p>
<h2>Changes</h2>
<p>We may change these terms or the site at any time. The date at the top shows the latest version. Continuing to use the site means you accept the updated terms.</p>
<h2>Contact</h2>
<p>Questions about these terms? Email ${mailLink}.</p>`
    },
    {
      slug: 'disclaimer', crumb: 'Disclaimer', title: 'Disclaimer | EasyGameFun',
      desc: 'EasyGameFun disclaimer: games belong to their developers, trademarks belong to their owners, game pages are AI-assisted, and external content is not ours.',
      html: `<h1>Disclaimer</h1>${updated}
<h2>Games and trademarks</h2>
<p>All games on EasyGameFun are made by independent developers and provided by game partners. Game names, characters, images and trademarks belong to their respective owners. A game's name may refer to other brands or games; EasyGameFun is not affiliated with, endorsed by or sponsored by those brands or their owners.</p>
<h2>Game information</h2>
<p>Game pages are written with the help of AI tools from information about each game and are checked automatically before publishing. We work to keep them accurate, but games can change after a page is written. If you spot a mistake, please <a href="/contact/">let us know</a>.</p>
<h2>External content and ads</h2>
<p>Games, and any ads inside them, are delivered by third parties. We are not responsible for their content, availability or practices. Links to other websites are provided for convenience only.</p>
<h2>Mature content</h2>
<p>Some games include fighting, shooting or strong language. These games show a content notice. Please choose games that are right for you and your family. See our <a href="/parents/">page for parents</a>.</p>
<h2>No professional advice</h2>
<p>Content on EasyGameFun is for entertainment and general information only.</p>`
    },
    {
      slug: 'copyright', crumb: 'Copyright (DMCA)', title: 'Copyright and DMCA | EasyGameFun',
      desc: 'How to report copyright concerns about content on EasyGameFun, what to include in your notice, how we respond and how to send a counter-notice.',
      html: `<h1>Copyright (DMCA)</h1>${updated}
<p>We respect the rights of game creators and other copyright owners. If you believe a game or other content on EasyGameFun uses your work without permission, send us a notice and we will act on it quickly.</p>
<h2>What to include</h2>
<ul><li>Your name, address, phone number and email address</li><li>The address (URL) of the page on EasyGameFun</li><li>A description of your work and how it is used without permission</li><li>A statement that you believe in good faith that the use is not authorized</li><li>A statement that the information is accurate and that you are the owner or authorized to act for the owner</li><li>Your physical or electronic signature</li></ul>
<p>Email your notice to ${mailLink} with "Copyright" in the subject line.</p>
<h2>What happens next</h2>
<p>We review every notice. When a notice is valid we remove or disable the content, usually within a few working days. Because games are provided by partners, we may also pass your notice on to the game partner.</p>
<h2>Counter-notice</h2>
<p>If you believe content was removed by mistake, you can send a counter-notice with the same details and an explanation. We will review it and may restore the content.</p>`
    }
  ];

  return P.map(p => ({
    path: `/${p.slug}/`, title: p.title, desc: fitDesc(p.desc),
    body: `${crumbs([['Home', '/'], [p.crumb, '']])}<article class="card prose" style="margin-top:0">${p.html}</article>`,
    ld: [crumbLD(B, [['Home', '/'], [p.crumb, `/${p.slug}/`]]), p.faq ? faqLD(p.faq) : null, p.slug === 'about' ? { '@type': 'AboutPage', name: 'About EasyGameFun', url: B + '/about/' } : null, p.slug === 'contact' ? { '@type': 'ContactPage', name: 'Contact EasyGameFun', url: B + '/contact/' } : null].filter(Boolean)
  }));
}
