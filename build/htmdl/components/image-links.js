import { parseUrl, splitCommandLine } from "../build.js";
import { sitemap } from "/scripts/src/sitemap.js";

// Options:
// -c: A card. Pulls its cover from /cards/<id>.webp and opens a card with its id.
// -t: Open in new tab.
// -e: External. Adds a third agument slot for the manual cover path.
function imageLink(options, url, name, coverPath)
{
	url = parseUrl(url);

	let id = url.split(".")[0].split("/");

	id = id[id.length - 1];

	if (options.includes("e"))
	{
		if (url.indexOf("http") === -1)
		{
			throw new Error("External images must be http(s) links!");
		}

		const slicedUrl = url.slice(url.indexOf("http"));

		return /* html */`
			<div class="image-link">
				<a href="${slicedUrl}" tabindex="-1">
					<img src="/graphics/general-icons/placeholder.png" data-src="${coverPath}" alt="${name}" tabindex="1"></img>
				</a>
				
				<p class="image-link-subtext">${name}</p>
			</div>
		`;
	}

	if (!name)
	{
		if (!sitemap[url])
		{
			throw new Error(`${url} is not in sitemap!`);
		}
		
		name = sitemap[url].title;
	}

	if (options.includes("c"))
	{
		const slicedUrl = url.slice(0, url.lastIndexOf("/"));
		const src = `${slicedUrl}/cards/${id}.webp`;

		return /* html */`
			<div class="image-link">
				<a href="${slicedUrl}/?card=${id}" data-card-id="${id}" tabindex="-1">
					<img src="/graphics/general-icons/placeholder.png" data-src="${src}" alt="${name}" tabindex="1"></img>
				</a>
				
				<p class="image-link-subtext">${name}</p>
			</div>
		`;
	}

	// pdf files, etc.
	const imgSrc = url.includes(".")
		? `${url.slice(0, url.lastIndexOf("/"))}/cover.webp`
		: `${url}cover.webp`;

	return /* html */`
		<div class="image-link">
			<a href="${url}"${options.includes("t") ? " data-in-new-tab='1'" : ""} tabindex="-1">
				<img src="/graphics/general-icons/placeholder.png" data-src="${imgSrc}" alt="${name}" tabindex="1"></img>
			</a>
			
			<p class="image-link-subtext">${name}</p>
		</div>
	`;
}

export function imageLinks(options, lines)
{
	let html = /* html */`<div class="image-links${lines.length === 1 ? " one-image-link" : ""}">`;

	lines.forEach(line =>
	{
		const [words, options] = splitCommandLine(line);

		html = `${html}${imageLink(options, ...words)}`;
	});

	html = /* html */`${html}</div>`;

	return html;
}