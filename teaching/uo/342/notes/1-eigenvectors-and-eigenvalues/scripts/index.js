import { BarnsleyFern } from "/applets/barnsley-fern/scripts/class.js";
import { ThurstonGeometries } from "/applets/thurston-geometries/scripts/class.js";
import { H3Rooms } from "/applets/thurston-geometries/scripts/geometries/h3.js";
import { VectorFields } from "/applets/vector-fields/scripts/class.js";
import {
	createDesmosGraphs,
	desmosBlue,
	desmosGreen,
	desmosPurple,
	desmosRed,
	getDesmosVector,
	setGetDesmosData
} from "/scripts/src/desmos.js";
import { showPage } from "/scripts/src/loadPage.js";
import { $ } from "/scripts/src/main.js";

export default function()
{
	setGetDesmosData(() =>
	{
		const data =
		{
			areaScaling:
			{
				bounds: { left: -1, right: 8, bottom: -1, top: 8 },

				expressions:
				[
					...getDesmosVector({ from: [0, 0], to: [1, 1], color: desmosPurple }),
					...getDesmosVector({ from: [0, 0], to: [2, 1], color: desmosBlue }),
					...getDesmosVector({ from: [1, 1], to: [3, 2], color: desmosBlue }),
					...getDesmosVector({ from: [2, 1], to: [3, 2], color: desmosPurple }),

					...getDesmosVector({ from: [0, 0], to: [3, 3], color: desmosRed }),
					...getDesmosVector({ from: [0, 0], to: [4, 2], color: desmosGreen }),
					...getDesmosVector({ from: [3, 3], to: [7, 5], color: desmosGreen }),
					...getDesmosVector({ from: [4, 2], to: [7, 5], color: desmosRed }),
				]
			},
		};

		return data;
	});

	createDesmosGraphs();


	const h3GeometryCanvas = $("#h3-geometry-canvas");

	const h3GeometryApplet = new ThurstonGeometries({ canvas: h3GeometryCanvas });

	const geometryData = new H3Rooms();
	geometryData.sliderValues.wallThickness = .143;

	h3GeometryApplet.run(geometryData);

	h3GeometryApplet.wilson.resizeCanvas({ width: 1000 });



	const barnsleyFernCanvas = $("#barnsley-fern-canvas");

	const barnsleyFernApplet = new BarnsleyFern({ canvas: barnsleyFernCanvas });

	barnsleyFernApplet.runWhenOnscreen({ numIterations: 10_000_000 });



	const vectorFieldCanvas = $("#vector-field-canvas");

	const vectorFieldApplet = new VectorFields({ canvas: vectorFieldCanvas });

	vectorFieldApplet.run({
		generatingCode: "(x - y, x + y)",
		worldWidth: 2
	});
	vectorFieldApplet.pauseWhenOffscreen();



	showPage();
}