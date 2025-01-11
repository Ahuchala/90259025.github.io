import { showPage } from "../../../scripts/src/loadPage.js";
import { ThurstonGeometries, rotateVectors } from "./class.js";
import { E3Rooms } from "./geometries/e3.js";
import { H2xERooms } from "./geometries/h2xe.js";
import { H3Rooms } from "./geometries/h3.js";
import { NilRooms } from "./geometries/nil.js";
import { E3S2Demo, S2xES2Demo } from "./geometries/s2.js";
import { S2xERooms } from "./geometries/s2xe.js";
import { S3Rooms } from "./geometries/s3.js";
import { SL2RRooms } from "./geometries/sl2r.js";
import { SolRooms } from "./geometries/sol.js";
import { Button, ToggleButton } from "/scripts/src/buttons.js";
import { Checkbox } from "/scripts/src/checkboxes.js";
import { Dropdown } from "/scripts/src/dropdowns.js";
import { equalizeAppletColumns } from "/scripts/src/layout.js";
import { $, $$ } from "/scripts/src/main.js";
import { typesetMath } from "/scripts/src/math.js";
import { siteSettings } from "/scripts/src/settings.js";
import { Slider } from "/scripts/src/sliders.js";
import { TextBox } from "/scripts/src/textBoxes.js";

export default function()
{
	const applet = new ThurstonGeometries({
		canvas: $("#output-canvas"),
	});

	const resolutionInput = new TextBox({
		element: $("#resolution-input"),
		name: "Resolution",
		value: 500,
		minValue: 100,
		maxValue: 1000,
		onInput: changeResolution
	});

	const wallThicknessSlider = new Slider({
		element: $("#wall-thickness-slider"),
		name: "Wall Thickness",
		value: 0,
		min: 0,
		max: 1,
		onInput: onSliderInput
	});

	const clipDistanceSlider = new Slider({
		element: $("#clip-distance-slider"),
		name: "Clip Distance",
		value: 0,
		min: 0,
		max: 10,
		onInput: onSliderInput
	});

	const fovSlider = new Slider({
		element: $("#fov-slider"),
		name: "FOV",
		value: 100,
		min: 80,
		max: 120,
		snapPoints: [100],
		onInput: onSliderInput
	});

	const antialiasingCheckbox = new Checkbox({
		element: $("#antialiasing-checkbox"),
		name: "Antialiasing",
		onInput: onCheckboxInput
	});

	const switchSceneButton = new ToggleButton({
		element: $("#switch-scene-button"),
		name0: "Switch to Spheres",
		name1: "Switch to Rooms",
		onClick0: (instant) => setTimeout(
			() => applet.switchScene({ duration: instant ? 20 : 500 }),
			instant ? 100 : 0
		),
		onClick1: (instant) => setTimeout(
			() => applet.switchScene({ duration: instant ? 20 : 500 }),
			instant ? 100 : 0
		),
	});

	const demoCanvas = $("#demo-canvas");
	const demoCanvasContainer = $("#demo-canvas-container");

	let demoApplet;

	const scenes =
	{
		s2: E3S2Demo,
		e3: E3Rooms,
		s3: S3Rooms,
		h3: H3Rooms,
		s2xe: S2xERooms,
		h2xe: H2xERooms,
		nil: NilRooms,
		sl2r: SL2RRooms,
		sol: SolRooms,
	};

	const geometriesDropdown = new Dropdown({
		element: $("#geometries-dropdown"),
		name: "Geometries",
		options: {
			s2: "$S^2$",
			e3: "$\\mathbb{E}^3$",
			s3: "$S^3$",
			h3: "$\\mathbb{H}^3$",
			s2xe: "$S^2 \\times \\mathbb{E}$",
			h2xe: "$\\mathbb{H}^2 \\times \\mathbb{E}$",
			nil: "Nil",
			sl2r: "$\\widetilde{\\operatorname{SL}}(2, \\mathbb{R})$",
			sol: "Sol",
		},
		onInput: onDropdownInput
	});

	typesetMath();

	function run()
	{
		const geometry = geometriesDropdown.value || "s2";
		
		const alwaysShown = "#fov-slider, #download-button";

		$$(`.info-text:not(#${geometry}-text)`)
			.forEach(element => element.style.display = "none");
		$$(`#${geometry}-text`)
			.forEach(element => element.style.display = "block");

		const GeometryDataClass = scenes[geometry];

		if (GeometryDataClass === E3S2Demo)
		{
			initS2Demo(applet);
			return;
		}

		applet.restrictCamera = true;
		
		const geometryData = new GeometryDataClass();

		const elementsToShow = Array.from(
			geometryData.uiElementsUsed
				? $$(`${alwaysShown},${geometryData.uiElementsUsed}`)
				: $$(alwaysShown)
		).map(element => element.parentNode);
		
		const elementsToHide = Array.from(
			geometryData.uiElementsUsed
				? $$(`
					.slider-container > input:not(${alwaysShown}, ${geometryData.uiElementsUsed}),
					.text-button:not(.dropdown, ${alwaysShown}, ${geometryData.uiElementsUsed})
				`)
				: $$(`
					.slider-container > input:not(${alwaysShown}),
					.text-button:not(.dropdown, ${alwaysShown})
				`)
		).map(element => element.parentNode);

		elementsToShow.forEach(element => element.style.display = "");
		$(".sliders").style.display = "";

		if (geometry === "sl2r")
		{
			$$(".text-buttons")[1].style.display = "none";
		}

		else
		{
			$$(".text-buttons")[1].style.display = "";
		}

		elementsToHide.forEach(element => element.style.display = "none");

		setTimeout(() => equalizeAppletColumns(), 0);

		demoCanvasContainer.style.display = "none";

		if (demoApplet)
		{
			demoApplet.animationPaused = true;
		}

		if (geometryData.wallThicknessData)
		{
			wallThicknessSlider.setBounds({
				min: geometryData.wallThicknessData[1],
				max: geometryData.wallThicknessData[2]
			});

			wallThicknessSlider.setValue(geometryData.wallThicknessData[0]);

			geometryData.sliderValues.wallThickness = geometryData.wallThicknessData[0];
		}

		if (geometryData.maxClipDistance)
		{
			clipDistanceSlider.setBounds({
				min: 0,
				max: geometryData.maxClipDistance
			});

			clipDistanceSlider.setValue(
				Math.min(geometryData.maxClipDistance, clipDistanceSlider.value)
			);

			geometryData.sliderValues.clipDistance = parseFloat(clipDistanceSlider.value);
		}

		applet.run(geometryData);
	}

	$$(".slider-container").forEach(element => element.style.display = "none");



	new Button({
		element: $("#download-button"),
		name: "Download",
		onClick: () => applet.downloadFrame("a-thurston-geometry.png")
	});



	function initS2Demo()
	{
		$(".sliders").style.display = "none";
		$$(".text-buttons")[1].style.display = "none";

		const geometryDataE3 = new E3S2Demo();

		demoCanvasContainer.style.display = "";

		if (demoApplet === undefined)
		{
			demoApplet = new ThurstonGeometries({
				canvas: demoCanvas,
			});
			demoApplet.allowFullscreenWithKeyboard = false;

			$$(".WILSON_enter-fullscreen-button")[1].remove();
		}

		else
		{
			demoApplet.animationPaused = false;
			demoApplet.needNewFrame = true;

			demoApplet.drawFrame();
		}



		geometryDataE3.handleMovingCallback = (movingAmount, timeElapsed) =>
		{
			demoApplet.handleMoving(movingAmount, timeElapsed);
			demoApplet.needNewFrame = true;
		};

		applet.run(geometryDataE3);

		applet.restrictCamera = false;
		applet.wilson.resizeWorld({
			centerX: 3 * Math.PI / 4,
			centerY: Math.PI / 4.5,
		});



		const geometryDataS2xE = new S2xES2Demo();

		geometryDataS2xE.drawFrameCallback = () =>
		{
			applet.geometryData.cameraDotPos = [...demoApplet.geometryData.cameraPos];

			for (let i = 0; i < applet.geometryData.numRays; i++)
			{
				const angle = (i - Math.floor(applet.geometryData.numRays / 2))
					/ applet.geometryData.numRays * 1.87;

				[
					applet.geometryData.rayDirs[i],
					applet.geometryData.testVecs[i]
				] = rotateVectors(
					demoApplet.geometryData.forwardVec,
					demoApplet.geometryData.rightVec,
					angle
				);

				[
					applet.geometryData.rayLengths,
					applet.geometryData.rayColors
				] = demoApplet.geometryData.getRayData(applet.geometryData.rayDirs);
			}

			applet.needNewFrame = true;
		};

		demoApplet.run(geometryDataS2xE);

		demoApplet.wilson.resizeWorld({
			centerX: Math.PI / 4,
		});

		demoCanvasContainer.style.display = "";
		
		demoCanvasContainer.querySelector(".WILSON_applet-container").style.setProperty(
			"margin-top",
			"4px",
			"important"
		);
	}

	run();

	showPage();

	function changeResolution()
	{
		applet.needNewFrame = true;

		applet.wilson.resizeCanvas({
			width: resolutionInput.value * siteSettings.resolutionMultiplier
		});
	}

	function onSliderInput()
	{
		applet.geometryData.sliderValues.wallThickness = parseFloat(wallThicknessSlider.value);
		applet.geometryData.sliderValues.clipDistance = parseFloat(clipDistanceSlider.value);
		applet.fov = Math.tan(fovSlider.value / 2 * Math.PI / 180);

		applet.needNewFrame = true;
	}

	function onDropdownInput(fromOnClickHandler)
	{
		if (switchSceneButton.state && fromOnClickHandler)
		{
			switchSceneButton.setState({ newState: false });
		}
		
		run();
	}

	function onCheckboxInput()
	{
		applet.useAntialiasing = antialiasingCheckbox.checked;
		applet.run(applet.geometryData, false);
	}
}