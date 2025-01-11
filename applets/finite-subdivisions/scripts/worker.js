"use strict";



let numVertices;
let numIterations;
let polygons;


async function drawFiniteSubdivisions()
{
	await drawOuterPolygon();

	for (let i = 0; i < numIterations; i++)
	{
		await drawLines(calculateLines());
	}
}



async function drawOuterPolygon()
{
	for (let i = 0; i < 120; i++)
	{
		// Draw 1/120 of each line.
		for (let j = 0; j < numVertices; j++)
		{
			const rgb = HSVtoRGB((2 * j + 1) / (2 * numVertices), 1, 1);

			postMessage([
				polygons[0][j][0],
				polygons[0][j][1],
				polygons[0][j][0]
					+ ((i + 1) / 120)
						* (polygons[0][(j + 1) % numVertices][0] - polygons[0][j][0]),
				polygons[0][j][1]
					+ ((i + 1) / 120)
						* (polygons[0][(j + 1) % numVertices][1] - polygons[0][j][1]),
				rgb
			]);
		}

		await new Promise(resolve => setTimeout(resolve, 8));
	}
}



function calculateLines()
{
	const newLines = [];

	const newPolygons = [];

	for (let i = 0; i < polygons.length; i++)
	{
		let barycenterRow = 0;
		let barycenterCol = 0;

		for (let j = 0; j < polygons[i].length; j++)
		{
			barycenterRow += polygons[i][j][0];
			barycenterCol += polygons[i][j][1];
		}

		barycenterRow /= polygons[i].length;
		barycenterCol /= polygons[i].length;

		for (let j = 0; j < polygons[i].length; j++)
		{
			newLines.push([polygons[i][j], [barycenterRow, barycenterCol]]);

			newPolygons.push([
				[barycenterRow, barycenterCol],
				polygons[i][j],
				polygons[i][(j + 1) % polygons[i].length]
			]);
		}
	}

	polygons = newPolygons;

	return newLines;
}



async function drawLines(newLines)
{
	for (let i = 0; i < 120; i++)
	{
		// Draw 1/120 of each line.
		for (let j = 0; j < newLines.length; j++)
		{
			const rgb = HSVtoRGB(j / newLines.length, 1, 1);

			postMessage([
				newLines[j][0][0],
				newLines[j][0][1],
				newLines[j][0][0]
					+ ((i + 1) / 120) * (newLines[j][1][0] - newLines[j][0][0]) + 1,
				newLines[j][0][1]
					+ ((i + 1) / 120) * (newLines[j][1][1] - newLines[j][0][1]),
				rgb
			]);
		}

		await new Promise(resolve => setTimeout(resolve, 8));
	}
}



function HSVtoRGB(h, s, v)
{
	let r, g, b;

	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	switch (i % 6)
	{
		case 0:r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}

	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}



onmessage = (e) =>
{
	numVertices = e.data[0];
	numIterations = e.data[1];
	polygons = e.data[2];

	drawFiniteSubdivisions();
};