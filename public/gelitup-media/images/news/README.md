# About Us News images

Upload About Us NEWS section images here.

You can create subfolders (for example: `spring-summer-2026/`) and upload files there.

Folder behavior for Spring/Summer Catalogue:
- Each leaf folder (example: `Spring Summer/2600/`) becomes a separate flip-through group under the same section.
- Images placed in the parent folder (example: `Spring Summer/`) are used as Category Card Hero Images for those groups.

Expected files:
- `spring-summer-2026-01.webp`
- `spring-summer-2026-02.webp`
- `spring-summer-2026-03.webp`

Recommended format and ratio:
- WebP
- 9:16 (Instagram reels/story ratio for carousel)
- Suggested size: 1080x1920 px

The About Us page reads these files directly from:
`/gelitup-media/images/news/`

NEWS titles and portal button are configured in:
`/gelitup-content/about-us-news.json`

Catalogue page flip-through lookbook is configured in:
`/gelitup-content/spring-summer-catalogue.json`

Update that JSON file to:
- add/change `introText` (the explanatory sentence above the collection block)
- change section title
- change portal button label/link
- add/remove news cards
- optionally add `link` on each item to open a custom URL when image is clicked

Carousel behavior:
- slides autoplay
- clicking the carousel pauses autoplay
- clicking an image opens its `link` (or the image file if no link is set)

Auto-generate JSON from uploaded images:
- Run `npm run generate:news-json`
- This scans `/public/gelitup-media/images/news/` recursively (including subfolders) and rewrites:
	- `/public/gelitup-content/about-us-news.json`
	- `/public/gelitup-content/spring-summer-catalogue.json`

PDF support for catalogue:
- If no lookbook images are found but a PDF exists in this folder (or subfolders), the Spring/Summer catalogue will use a clickable PDF card.
