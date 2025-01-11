import {
	Applet,
	getMinGlslString,
	getVectorGlsl,
	hsvToRgb,
	tempShader
} from "../../../scripts/applets/applet.js";
import anime from "/scripts/anime.js";
import { WilsonGPU } from "/scripts/wilson.js";

export class VoronoiDiagrams extends Applet
{
	wilsonHidden;
	anime;

	lastTimestamp = -1;
	currentlyAnimating = false;

	numPoints = 20;
	metric = 2;
	resolution = 1000;
	resolutionHidden = 100;

	maximumSpeed;
	drawPoints;
	useDraggable;

	t;
	radius;
	maxRadius;

	pointRadius;
	pointOpacity;
	points;
	colors;

	cancelAnimaton = () => {};

	constructor({ canvas })
	{
		super(canvas);

		const options =
		{
			shader: tempShader,

			canvasWidth: this.resolution,

			draggableOptions: {
				draggables: {
					point0: [0, 0],
				},
				callbacks: {
					drag: this.onDragDraggable.bind(this),
				}
			},

			fullscreenOptions: {
				onSwitch: this.switchFullscreen.bind(this),
				beforeSwitch: this.beforeSwitchFullscreen.bind(this),
				useFullscreenButton: true,
				enterFullscreenButtonIconPath: "/graphics/general-icons/enter-fullscreen.png",
				exitFullscreenButtonIconPath: "/graphics/general-icons/exit-fullscreen.png"
			}
		};

		this.wilson = new WilsonGPU(this.canvas, options);

		this.wilson.draggables.point0.element.style.display = "none";

		const optionsHidden =
		{
			shader: tempShader,

			canvasWidth: this.resolutionHidden,
		};

		this.wilsonHidden = new WilsonGPU(this.createHiddenCanvas(), optionsHidden);
	}



	async run({
		resolution = 500,
		numPoints = 20,
		metric = 2,
		maximumSpeed = false,
		drawPoints = false,
		useDraggable = false
	}) {
		this.resolution = resolution;
		this.numPoints = numPoints;
		this.metric = metric;
		this.maximumSpeed = maximumSpeed;
		this.drawPoints = drawPoints;
		this.useDraggable = useDraggable;

		this.t = -0.1;
		this.radius = -0.1;
		this.pointOpacity = 1;
		this.lastTimestamp = -1;

		this.wilson.resizeCanvas({ width: this.resolution });

		this.generatePoints();

		const shaderHidden = this.getShader(true);
		const shader = this.getShader(false);

		this.wilsonHidden.loadShader({
			shader: shaderHidden,
			uniforms: {
				radius: this.radius,
				metric: this.metric,
				...(this.useDraggable ? { point0: this.wilson.draggables.point0.location } : {})
			}
		});

		if (!this.maximumSpeed)
		{
			this.maxRadius = this.findMaxRadius();
		}

		else
		{
			this.maxRadius = 8;
		}

		this.wilson.loadShader({
			shader,
			uniforms: {
				radius: this.radius,
				pointOpacity: this.pointOpacity,
				metric: this.metric,
				...(this.useDraggable ? { point0: this.wilson.draggables.point0.location } : {})
			}
		});

		this.wilson.draggables.point0.element.style.display = this.useDraggable ? "block" : "none";



		const dummy = { t: -0.3, pointOpacity: 1 };

		this.currentlyAnimating = true;
		let thisAnimationCanceled = false;
		
		this.cancelAnimaton();
		this.cancelAnimaton = () =>
		{
			this.currentlyAnimating = false;
			thisAnimationCanceled = true;
		};

		if (this.maximumSpeed)
		{
			this.t = 1;
			this.pointOpacity = this.drawPoints ? 1 : 0;
			this.drawFrame();

			this.currentlyAnimating = false;

			return;
		}

		this.anime = anime({
			targets: dummy,
			t: 1,
			pointOpacity: this.drawPoints ? 1 : -0.5,
			duration: 3000,
			delay: 2 * this.numPoints,
			easing: "easeOutQuad",
			update: () =>
			{
				if (thisAnimationCanceled)
				{
					return;
				}

				this.t = dummy.t;
				this.pointOpacity = Math.max(dummy.pointOpacity, 0);

				this.drawFrame();
			},
			complete: () =>
			{
				if (thisAnimationCanceled)
				{
					return;
				}

				this.anime = null;

				this.currentlyAnimating = false;
			}
		});
	}

	getShader(forHiddenCanvas = false)
	{
		const testDirections = [
			"boundaryWidth / 4.0, 0",
			"-boundaryWidth / 4.0, 0",
			"0, boundaryWidth / 4.0",
			"0, -boundaryWidth / 4.0",
			"boundaryWidth / 4.0, boundaryWidth / 4.0",
			"boundaryWidth / 4.0, -boundaryWidth / 4.0",
			"-boundaryWidth / 4.0, boundaryWidth / 4.0",
			"-boundaryWidth / 4.0, -boundaryWidth / 4.0",
		];

		const colorGlsl = forHiddenCanvas
			? /* glsl */`
				if (minDistance < radius)
				{
					gl_FragColor = vec4(color, 1);
					return;
				}
			`
			: /* glsl */`
				if (minDistance < pointRadius)
				{
					gl_FragColor = mix(
						vec4(color, 1),
						vec4(1, 1, 1, 1),
						pointOpacity
					);
					return;
				}

				if (minDistance < (1.0 + blurRatio) * pointRadius)
				{
					float t = 1.0 - (minDistance - pointRadius) / (blurRatio * pointRadius);

					gl_FragColor = mix(
						vec4(color, 1),
						vec4(t, t, t, 1),
						pointOpacity
					);
					return;
				}

				if (minDistance < radius)
				{
					float boundaryDistance = secondMinDistance - minDistance;

					if (boundaryDistance < boundaryWidth / 2.0)
					{
						// Despite all our best efforts, we can still sometimes get here mistakenly.
						// We sample 8 nearby points to make sure this is actually a boundary.
						vec3 newColor;

	${testDirections.map(testDirection =>
	{
		return /* glsl */`
			getMinDistanceToPoints(uv + vec2(${testDirection}), minDistance, secondMinDistance, newColor);

			if (color != newColor)
			{
				float t = .5 + .5 * boundaryDistance / (boundaryWidth / 2.0);
				gl_FragColor = vec4(color * t, 1);
				return;
			}
		`;
	}).join("")}
					}
					
					gl_FragColor = vec4(color, 1);
					return;
				}

				if (minDistance < radius + 0.01)
				{
					gl_FragColor = vec4(color * 0.5, 1);
					return;
				}
			`;

		return /* glsl */`
			precision highp float;
			
			varying vec2 uv;

			uniform float radius;
			uniform float pointOpacity;
			uniform float metric;

			const float pointRadius = 0.01;
			const float blurRatio = 0.5;
			const float boundaryWidth = 0.02;

	${this.points.map((point, index) =>
	{
		if (index === 0 && this.useDraggable)
		{
			return /* glsl */`
				uniform vec2 point0;
			`;
		}

		return /* glsl */`
			const vec2 point${index} = ${getVectorGlsl(point)};
		`;
	}).join("")}

	${this.colors.map((color, index) =>
	{
		return /* glsl */`
			const vec3 color${index} = ${getVectorGlsl(color)};
		`;
	}).join("")}
			
			float metricDistance(vec2 p, vec2 q)
			{
				if (metric == 24.0)
				{
					return max(abs(p.x - q.x), abs(p.y - q.y));
				}

				return pow(
					pow(abs(p.x - q.x), metric)
					+ pow(abs(p.y - q.y), metric),
					1.0 / metric
				);
			}

			void getMinDistanceToPoints(vec2 p, out float minDistance, out float secondMinDistance, out vec3 color)
			{
	${this.points.map((point, index) =>
	{
		return /* glsl */`
			float distance${index + 1} = metricDistance(p, point${index});
		`;
	}).join("")}

				minDistance = ${getMinGlslString("distance", this.numPoints)};

	${this.colors.map((color, index) =>
	{
		return /* glsl */`
			${index ? "else if" : "if"} (minDistance == distance${index + 1})
			{
				color = color${index};
			}
		`;
	}).join("")}

	secondMinDistance = 10.0;

	${this.points.map((point, index) =>
	{
		return /* glsl */`
			if (distance${index + 1} < secondMinDistance && distance${index + 1} != minDistance)
			{
				secondMinDistance = distance${index + 1};
			}
		`;
	}).join("")}
			}

			void main(void)
			{
				vec3 color;
				float minDistance;
				float secondMinDistance;
				getMinDistanceToPoints(uv, minDistance, secondMinDistance, color);

				${colorGlsl}

				gl_FragColor = vec4(0, 0, 0, 1);
			}
		`;
	}

	generatePoints()
	{
		this.points = new Array(this.numPoints);

		for (let i = 0; i < this.numPoints; i++)
		{
			this.points[i] = [
				0.9 * (Math.random() - 0.5) * this.wilson.worldWidth,
				0.9 * (Math.random() - 0.5) * this.wilson.worldHeight,
			];
		}



		// Balance the points by repelling nearby ones.
		const forces = new Array(this.numPoints);
		const forceFactor = 0.2 / this.numPoints;

		for (let i = 0; i < this.numPoints; i++)
		{
			forces[i] = [0, 0];

			for (let j = 0; j < this.numPoints; j++)
			{
				if (j === i)
				{
					continue;
				}

				const distance2 =
					(this.points[j][0] - this.points[i][0]) ** 2
					+ (this.points[j][1] - this.points[i][1]) ** 2;
				
				forces[i][0] += (this.points[i][0] - this.points[j][0]) / distance2;
				forces[i][1] += (this.points[i][1] - this.points[j][1]) / distance2;
			}
		}

		for (let i = 0; i < this.numPoints; i++)
		{
			this.points[i][0] += forceFactor * forces[i][0];
			this.points[i][1] += forceFactor * forces[i][1];
		}



		// Avoid points being in the 8 cardinal directions. We do 2 passes
		// to minimize the chance of one slipping through.
		for (let k = 0; k < 2; k++)
		{
			const sign = (k % 2) ? 1 : -1;

			for (let i = 0; i < this.numPoints; i++)
			{
				for (let j = 0; j < this.numPoints; j++)
				{
					if (j === i)
					{
						continue;
					}

					const xDistance = Math.abs(this.points[i][0] - this.points[j][0]);
					const yDistance = Math.abs(this.points[i][1] - this.points[j][1]);

					if (xDistance < 0.01)
					{
						this.points[i][0] += sign * 0.01;
					}

					if (yDistance < 0.01)
					{
						this.points[i][1] += sign * 0.01;
					}

					if (Math.abs(xDistance - yDistance) < 0.01)
					{
						this.points[i][0] += sign * 0.02;
					}
				}
			}
		}


		// Make sure everything is in range.
		for (let i = 0; i < this.numPoints; i++)
		{
			this.points[i][0] = Math.min(
				Math.max(
					this.points[i][0],
					-this.wilson.worldWidth / 2
				),
				this.wilson.worldWidth / 2
			);

			this.points[i][1] = Math.min(
				Math.max(
					this.points[i][1],
					-this.wilson.worldHeight / 2
				),
				this.wilson.worldHeight / 2
			);
		}



		// Finally, pick some random colors.
		this.colors = new Array(this.numPoints);

		for (let i = 0; i < this.numPoints; i++)
		{
			this.colors[i] = hsvToRgb(
				Math.random(),
				0.5 + 0.25 * Math.random(),
				0.5 + 0.5 * Math.random()
			);

			this.colors[i][0] /= 255;
			this.colors[i][1] /= 255;
			this.colors[i][2] /= 255;
		}
	}

	// Finds the maximum necessary radius to cover the entire canvas
	// with binary search.
	findMaxRadius()
	{
		let t = 0.5;
		const upperBound = 4;
		const iterations = 15;
		let stepSize = 0.25;

		for (let i = 0; i < iterations; i++)
		{
			const radius = upperBound * t;

			if (this.testRadius(radius))
			{
				if (i !== iterations - 1)
				{
					t -= stepSize;
				}
			}

			else
			{
				t += stepSize;
			}

			stepSize /= 2;
		}

		return upperBound * t + 0.025;
	}

	testRadius(radius)
	{
		this.wilsonHidden.setUniforms({ radius });
		this.wilsonHidden.drawFrame();

		const pixelData = this.wilsonHidden.readPixels();

		for (let i = 0; i < pixelData.length; i += 4)
		{
			if (
				pixelData[i] === 0
				&& pixelData[i + 1] === 0
				&& pixelData[i + 2] === 0
			) {
				return false;
			}
		}

		return true;
	}



	drawFrame()
	{
		this.radius = this.t * this.maxRadius;

		this.wilson.setUniforms({
			radius: this.radius,
			pointOpacity: this.pointOpacity
		});
		
		this.wilson.drawFrame();
	}

	updateMetric()
	{
		this.cancelAnimaton();

		this.t = 2;
		this.wilson.setUniforms({ metric: this.metric });
		this.drawFrame();
	}

	onDragDraggable({ x, y })
	{
		this.wilson.setUniforms({ point0: [x, y] });

		if (!this.currentlyAnimating)
		{
			this.drawFrame();
		}
	}

	switchFullscreen()
	{
		this.anime?.play && this.anime.play();
	}

	async beforeSwitchFullscreen()
	{
		this.anime?.pause && this.anime.pause();

		await new Promise(resolve => setTimeout(resolve, 33));
	}
}