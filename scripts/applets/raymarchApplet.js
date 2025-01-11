import anime from "../anime.js";
import { doubleEncodingGlsl, loadGlsl } from "../src/complexGlsl.js";
import { WilsonCPU, WilsonGPU } from "../wilson.js";
import { AnimationFrameApplet } from "./animationFrameApplet.js";
import {
	getFloatGlsl,
	getVectorGlsl,
	tempShader
} from "./applet.js";

export const edgeDetectShader = /* glsl */`
	precision highp float;
	
	varying vec2 uv;

	uniform sampler2D uTexture;

	uniform vec2 stepSize;

	float getSampleLuminanceDelta(vec3 color, vec2 texCoord)
	{
		vec3 sample = texture2D(uTexture, texCoord).xyz;
		return 0.299 * abs(sample.x - color.x)
			+ 0.587 * abs(sample.y - color.y)
			+ 0.114 * abs(sample.z - color.z);
	}

	void main(void)
	{
		vec2 texCoord = (uv + vec2(1.0)) * 0.5;
		vec3 sample = texture2D(uTexture, texCoord).xyz;
		float sampleN = getSampleLuminanceDelta(sample, texCoord + vec2(0.0, stepSize.y));
		float sampleS = getSampleLuminanceDelta(sample, texCoord + vec2(0.0, -stepSize.y));
		float sampleE = getSampleLuminanceDelta(sample, texCoord + vec2(stepSize.x, 0.0));
		float sampleW = getSampleLuminanceDelta(sample, texCoord + vec2(-stepSize.x, 0.0));

		float luminance = max(
			max(sampleN, sampleS),
			max(sampleE, sampleW)
		);
		
		gl_FragColor = vec4(
			texture2D(uTexture, texCoord).xyz,
			luminance
		);
	}
`;

export class RaymarchApplet extends AnimationFrameApplet
{
	movingSpeed = .1;
	moveVelocity = [0, 0, 0];

	moveFriction = .96;
	moveStopThreshhold = .01;

	lastTimestamp = -1;

	theta = 0;
	phi = 0;
	worldSize = 2.5;

	resolution = 500;

	maxMarches;
	maxShadowMarches;
	maxReflectionMarches;
	clipDistance;

	imagePlaneCenterPos = [0, 0, 0];

	forwardVec = [0, 0, 0];
	rightVec = [0, 0, 0];
	upVec = [0, 0, 0];

	// This controls the amount of fish-eye and is a delicate balance.
	// Changing it also requires upating the camera position.
	focalLengthFactor;
	cameraPos;
	lightPos;
	lightBrightness;
	useOppositeLight;
	oppositeLightBrightness;
	ambientLight;
	bloomPower;

	fogColor;
	fogScaling;
	stepFactor;
	epsilonScaling;
	minEpsilon;

	useShadows;
	useSoftShadows;
	useReflections;
	useBloom;
	useAntialiasing;
	useFor3DPrinting;

	uniforms = {};
	lockZ;

	speedFactor = 2;
	fovFactor = 1;

	lockedOnOrigin;
	distanceFromOrigin = 1;

	distanceEstimatorGlsl;
	getColorGlsl;
	uniformsGlsl;
	getReflectivityGlsl;
	getGeodesicGlsl;
	addGlsl;



	constructor({
		canvas,
		shader,

		resolution = 500,

		distanceEstimatorGlsl,
		getColorGlsl,
		uniformsGlsl = "",
		getReflectivityGlsl = "return 0.2;",
		getGeodesicGlsl = (pos, dir) => `${pos} + t * ${dir}`,
		addGlsl = "",

		uniforms = {},

		theta = 0,
		phi = Math.PI / 2,
		stepFactor = .95,
		epsilonScaling = 1.75,
		minEpsilon = .0000003,

		maxMarches = 128,
		maxShadowMarches = 128,
		maxReflectionMarches = 128,
		clipDistance = 1000,
		
		focalLengthFactor = 2.5,
		cameraPos = [0, 0, 0],
		lockedOnOrigin = true,
		lockZ,

		lightPos = [50, 70, 100],
		lightBrightness = 1,
		useOppositeLight = false,
		oppositeLightBrightness = 0.5,
		ambientLight = 0.25,
		bloomPower = 1,

		fogColor = [0, 0, 0],
		fogScaling = .05,

		useShadows = false,
		useSoftShadows = true,
		useReflections = false,
		useBloom = true,
		useAntialiasing = false,
		useFor3DPrinting = false,
	}) {
		super(canvas);

		this.resolution = resolution;

		this.theta = theta;
		this.phi = phi;
		this.stepFactor = stepFactor;
		this.epsilonScaling = epsilonScaling;
		this.minEpsilon = minEpsilon;

		this.maxMarches = maxMarches;
		this.maxShadowMarches = maxShadowMarches;
		this.maxReflectionMarches = maxReflectionMarches;
		this.clipDistance = clipDistance;
		
		this.focalLengthFactor = focalLengthFactor;
		this.cameraPos = cameraPos;
		this.lockedOnOrigin = lockedOnOrigin;
		this.worldSize = this.lockedOnOrigin ? 2.5 : 1.5;
		this.lockZ = lockZ;

		this.lightPos = lightPos;
		this.lightBrightness = lightBrightness;
		this.useOppositeLight = useOppositeLight;
		this.oppositeLightBrightness = oppositeLightBrightness;
		this.ambientLight = ambientLight;
		this.bloomPower = bloomPower;

		this.fogColor = fogColor;
		this.fogScaling = fogScaling;

		this.useShadows = useShadows;
		this.useSoftShadows = useSoftShadows;
		this.useReflections = useReflections;
		this.useBloom = useBloom;
		this.useAntialiasing = useAntialiasing;
		this.useFor3DPrinting = useFor3DPrinting;

		this.uniformsGlsl = /* glsl */`
			uniform vec2 aspectRatio;
			uniform float resolution;
			uniform vec3 cameraPos;
			uniform vec3 imagePlaneCenterPos;
			uniform vec3 rightVec;
			uniform vec3 upVec;
			uniform float epsilonScaling;
			uniform float minEpsilon;
			uniform vec2 uvCenter;
			uniform float uvScale;
			${uniformsGlsl}
		`;

		this.uniforms = {
			...(this.useFor3DPrinting
				? {}
				: {
					aspectRatio: [1, 1],
					resolution: this.resolution,
					cameraPos: this.cameraPos,
					imagePlaneCenterPos: this.imagePlaneCenterPos,
					rightVec: this.rightVec,
					upVec: this.upVec,
					minEpsilon: this.minEpsilon,
				}
			),
			
			epsilonScaling: this.epsilonScaling,
			
			uvCenter: [0, 0],
			uvScale: 1,
			...uniforms
		};
		
		this.listenForKeysPressed(
			["w", "s", "a", "d", "q", "e", " ", "shift", "z"],
			(key, pressed) =>
			{
				if (key === "z")
				{
					const dummy = { t: 0 };
					const oldFactor = pressed ? 1 : 4;
					const newFactor = pressed ? 4 : 1;

					anime({
						targets: dummy,
						t: 1,
						duration: 250,
						easing: "easeOutCubic",
						update: () =>
						{
							this.fovFactor = (1 - dummy.t) * oldFactor
								+ dummy.t * newFactor;

							this.setUniforms({
								epsilonScaling: this.epsilonScaling *
									((1 - dummy.t) * oldFactor + dummy.t * newFactor)
							});

							this.needNewFrame = true;
						}
					});
				}
			}
		);

		this.distanceFromOrigin = magnitude(this.cameraPos);

		const useableShader = shader ?? this.createShader({
			distanceEstimatorGlsl,
			getColorGlsl,
			getReflectivityGlsl,
			getGeodesicGlsl,
			addGlsl,
		});

		const options =
		{
			shader: tempShader,

			canvasWidth: this.resolution,

			// This lets us use the world size as an aspect ratio.
			worldWidth: this.worldSize,
			worldHeight: this.worldSize,

			worldCenterX: this.lockedOnOrigin
				? this.theta
				: 2 * Math.PI - this.theta,

			worldCenterY: this.lockedOnOrigin
				? this.phi
				: Math.PI - this.phi,

			minWorldY: 0.001 - this.worldSize / 2,
			maxWorldY: Math.PI - 0.001 + this.worldSize / 2,

			onResizeCanvas: this.onResizeCanvas.bind(this),

			interactionOptions: {
				useForPanAndZoom: true,
				disallowZooming: true,
				onPanAndZoom: () =>
				{
					this.calculateVectors();
					this.needNewFrame = true;
				},
				callbacks: {
					touchstart: this.onTouchStart.bind(this),
					touchend: this.onTouchEnd.bind(this),
				}
			},

			fullscreenOptions: {
				onSwitch: this.switchFullscreen.bind(this),
				beforeSwitch: this.beforeSwitchFullscreen.bind(this),
				fillScreen: true,
				useFullscreenButton: true,
				enterFullscreenButtonIconPath: "/graphics/general-icons/enter-fullscreen.png",
				exitFullscreenButtonIconPath: "/graphics/general-icons/exit-fullscreen.png",
			}
		};

		this.wilson = new WilsonGPU(canvas, options);

		this.wilson.loadShader({
			id: "draw",
			shader: useableShader,
			uniforms: this.uniforms
		});

		if (this.useAntialiasing)
		{
			this.wilson.loadShader({
				id: "edgeDetect",
				shader: edgeDetectShader,
				uniforms: {
					stepSize: [1 / this.wilson.canvasWidth, 1 / this.wilson.canvasHeight]
				}
			});

			const aaShader = shader ?? this.createShader({
				distanceEstimatorGlsl,
				getColorGlsl,
				getReflectivityGlsl,
				getGeodesicGlsl,
				addGlsl,
				antialiasing: !addGlsl.includes("sampler2D")
			});

			this.wilson.loadShader({
				id: "antialias",
				shader: aaShader,
				uniforms: {
					...this.uniforms,
					stepSize: [
						2 / (this.wilson.canvasWidth * 3),
						2 / (this.wilson.canvasHeight * 3)
					]
				}
			});

			this.wilson.useShader("draw");

			this.createTextures();
		}



		if (this.useFor3DPrinting)
		{
			this.make3DPrintable();
		}

		this.needNewFrame = true;

		this.resume();
	}

	switchFullscreen()
	{
		this.resume();
	}

	async beforeSwitchFullscreen()
	{
		this.pause();

		await new Promise(resolve => setTimeout(resolve, 33));
	}



	async make3DPrintable()
	{
		const preview = true;

		const resolution = 1500;
		this.setUniforms({
			uvScale: 3,
			uvCenter: [0, 0],
			epsilonScaling: 0.0015,
		});

		this.wilson.resizeCanvas({ width: resolution });

		this.drawFrame();

		await new Promise(resolve => setTimeout(resolve, 1000));

		for (let i = 1; i <= resolution; i++)
		{
			this.setUniforms({
				uvCenter: [2 * i / resolution - 1, 0],
			});
			this.drawFrame();
			!preview && this.wilson.downloadFrame(i.toString().padStart(4, "0"), false);
			await new Promise(resolve => setTimeout(resolve, preview ? 0 : 150));
		}
	}


	// Creates a shader and sets the default argument values so that they persist by default.
	createShader({
		distanceEstimatorGlsl = this.distanceEstimatorGlsl,
		getColorGlsl = this.getColorGlsl,
		getReflectivityGlsl = this.getReflectivityGlsl,
		getGeodesicGlsl = this.getGeodesicGlsl,
		addGlsl = this.addGlsl,
		antialiasing = false,
		useForDepthBuffer = false,
	}) {
		this.distanceEstimatorGlsl = distanceEstimatorGlsl;
		this.getColorGlsl = getColorGlsl;
		this.getReflectivityGlsl = getReflectivityGlsl;
		this.getGeodesicGlsl = getGeodesicGlsl;
		this.addGlsl = addGlsl;

		const computeShadowIntensityGlsl = this.useShadows && this.useSoftShadows ? /* glsl */`
			// Nearly identical to raymarching, but it only marches toward the light.
			float computeShadowIntensity(vec3 startPos, vec3 lightDirection)
			{
				vec3 rayDirectionVec = normalize(lightDirection) * .25;
				float softShadowFactor = 1.0;
				float t = 0.0;

				float lastDistanceToScene = 100000.0;

				for (int iteration = 0; iteration < maxShadowMarches; iteration++)
				{
					vec3 pos = ${getGeodesicGlsl("startPos", "rayDirectionVec")};
					
					// Use Sebastian Aaltonen's improvement to Inigo Quilez's soft shadow algorithm.
					float distanceToScene = distanceEstimator(pos);
					float y = distanceToScene * distanceToScene / (2.0 * lastDistanceToScene);
        			float d = sqrt(distanceToScene * distanceToScene - y * y);

					softShadowFactor = min(
						softShadowFactor,
						d / (max(t - y, 0.0) * 0.025) 
					);

					lastDistanceToScene = distanceToScene;

					float epsilon = max(t / (resolution * epsilonScaling), minEpsilon);

					if (t > clipDistance || length(pos - lightPos) < 0.2)
					{
						return clamp(softShadowFactor, maxShadowAmount, 1.0);
					}

					if (distanceToScene < epsilon)
					{
						return maxShadowAmount;
					}
					
					t += distanceToScene;
				}

				return clamp(softShadowFactor, maxShadowAmount, 1.0);
			}
		` : this.useShadows ? /* glsl */`
			// Nearly identical to raymarching, but it only marches toward the light.
			float computeShadowIntensity(vec3 startPos, vec3 lightDirection)
			{
				vec3 rayDirectionVec = normalize(lightDirection) * .25;
				float t = 0.0;

				for (int iteration = 0; iteration < maxShadowMarches; iteration++)
				{
					vec3 pos = ${getGeodesicGlsl("startPos", "rayDirectionVec")};
					
					float distanceToScene = distanceEstimator(pos);

					float epsilon = max(t / (resolution * epsilonScaling), minEpsilon);

					if (t > clipDistance)
					{
						return 1.0;
					}

					if (distanceToScene < epsilon)
					{
						return maxShadowAmount;
					}
					
					t += distanceToScene;
				}

				return 1.0;
			}
		` : "";

		const computeReflectionGlsl = this.useReflections ? /* glsl */`
			vec3 computeShadingWithoutReflection(
				vec3 pos,
				float epsilon,
				float correctionDistance,
				int iteration
			) {
				vec3 surfaceNormal = getSurfaceNormal(pos, epsilon);

				// This corrects the position so that it's exactly on the surface (we probably marched a little bit inside).
				pos -= surfaceNormal * correctionDistance;
				
				vec3 lightDirection = normalize(lightPos - pos);
				
				float dotProduct = dot(surfaceNormal, lightDirection);
				
				float lightIntensity = max(
					${this.useOppositeLight ? `lightBrightness * max(dotProduct, -${getFloatGlsl(this.oppositeLightBrightness)} * dotProduct)` : "lightBrightness * dotProduct"},
					${getFloatGlsl(this.ambientLight)}
				);

				vec3 color = getColor(pos)
					* lightIntensity
					* max((1.0 - float(iteration) / float(maxMarches)), 0.0);

				${this.useShadows ? /* glsl */`
					float shadowIntensity = computeShadowIntensity(pos, lightDirection);

					color *= shadowIntensity;
				` : ""}
				
				//Apply fog.
				return mix(color, fogColor, 1.0 - exp(-distance(pos, cameraPos) * fogScaling));
			}

			// Unlike in raymarch(), startPos is replacing cameraPos, and rayDirectionVec is precomputed.
			vec3 computeReflection(
				vec3 startPos,
				vec3 rayDirectionVec,
				int startIteration
			) {
				float t = 0.0;
				
				for (int iteration = 0; iteration < maxReflectionMarches; iteration++)
				{
					vec3 pos = ${getGeodesicGlsl("startPos", "rayDirectionVec")};
					
					float distanceToScene = distanceEstimator(pos);

					float epsilon = max(t / (resolution * epsilonScaling), minEpsilon);

					if (distanceToScene < epsilon)
					{
						return computeShadingWithoutReflection(
							pos,
							epsilon,
							distanceToScene - 2.0 * epsilon,
							iteration + startIteration
						);
					}
					
					else if (t > clipDistance)
					{
						return ${this.useBloom ? "mix(fogColor, vec3(1.0), computeBloom(rayDirectionVec))" : "fogColor"};
					}
					
					t += distanceToScene;
				}
				
				return ${this.useBloom ? "mix(fogColor, vec3(1.0), computeBloom(rayDirectionVec))" : "fogColor"};
			}
		` : "";

		const computeBloomGlsl = this.useBloom ? /* glsl */`
			float computeBloom(vec3 rayDirectionVec)
			{
				return pow(
					(3.0 - distance(
						normalize(rayDirectionVec),
						normalize(lightPos - cameraPos)
					)) / 2.99,
					${getFloatGlsl(20 / this.bloomPower)}
				);
			}
		` : "";

		const computeShadingGlsl = useForDepthBuffer
			? /* glsl */`
				vec3 computeShading(
					vec3 pos,
					float epsilon,
					float correctionDistance,
					int iteration
				) {
					gl_FragColor = encodeFloat(length(pos - cameraPos));
					return vec3(0.0);
				}
			`
			: /* glsl */`
				vec3 computeShading(
					vec3 pos,
					float epsilon,
					float correctionDistance,
					int iteration
				) {
					vec3 surfaceNormal = getSurfaceNormal(pos, epsilon);

					// This corrects the position so that it's exactly on the surface (we probably marched a little bit inside).
					pos -= surfaceNormal * correctionDistance;
					
					vec3 lightDirection = normalize(lightPos - pos);
					
					float dotProduct = dot(surfaceNormal, lightDirection);
					
					float lightIntensity = max(
						${this.useOppositeLight ? `lightBrightness * max(dotProduct, -${getFloatGlsl(this.oppositeLightBrightness)} * dotProduct)` : "lightBrightness * dotProduct"},
						${getFloatGlsl(this.ambientLight)}
					);

					vec3 color = getColor(pos)
						* lightIntensity
						* max((1.0 - float(iteration) / float(maxMarches)), 0.0);

					${this.useShadows ? /* glsl */`
						float shadowIntensity = computeShadowIntensity(pos, lightDirection);

						color *= shadowIntensity;
					` : ""}

					${this.useReflections ? /* glsl */`
						vec3 reflectedDirection = reflect(
							normalize(pos - cameraPos) * ${getFloatGlsl(this.stepFactor)},
							surfaceNormal
						);

						color = mix(
							color,
							computeReflection(pos, reflectedDirection, iteration),
							getReflectivity(pos)
						);
					` : ""}
					
					//Apply fog.
					return mix(color, fogColor, 1.0 - exp(-distance(pos, cameraPos) * fogScaling));
				}
			`;



		const raymarchGlsl = (() =>
		{
			if (useForDepthBuffer)
			{
				return /* glsl */`
					vec3 raymarch(vec3 startPos)
					{
						vec3 rayDirectionVec = normalize(startPos - cameraPos) * ${getFloatGlsl(this.stepFactor)};
						
						float t = 0.0;
						
						for (int iteration = 0; iteration < maxMarches; iteration++)
						{
							vec3 pos = ${getGeodesicGlsl("cameraPos", "rayDirectionVec")};
							
							float distanceToScene = distanceEstimator(pos);

							float epsilon = max(t / (resolution * epsilonScaling), minEpsilon);
							
							if (distanceToScene < epsilon)
							{
								return computeShading(
									pos,
									epsilon,
									distanceToScene - 2.0 * epsilon,
									iteration
								);
							}
							
							else if (t > clipDistance)
							{
								gl_FragColor = encodeFloat(clipDistance);
								return vec3(0.0);
							}
							
							t += distanceToScene;
						}
						
						gl_FragColor = encodeFloat(clipDistance);
						return vec3(0.0);
					}
				`;
			}

			if (this.useBloom)
			{
				return /* glsl */`
					vec3 raymarch(vec3 startPos)
					{
						vec3 rayDirectionVec = normalize(startPos - cameraPos) * ${getFloatGlsl(this.stepFactor)};
						
						float t = 0.0;
						
						for (int iteration = 0; iteration < maxMarches; iteration++)
						{
							vec3 pos = ${getGeodesicGlsl("cameraPos", "rayDirectionVec")};
							
							float distanceToScene = distanceEstimator(pos);

							float epsilon = max(t / (resolution * epsilonScaling), minEpsilon);
							
							if (distanceToScene < epsilon)
							{
								return computeShading(
									pos,
									epsilon,
									distanceToScene - 2.0 * epsilon,
									iteration
								);
							}
							
							else if (t > clipDistance)
							{
								return mix(fogColor, vec3(1.0), computeBloom(rayDirectionVec));
							}
							
							t += distanceToScene;
						}
						
						return mix(fogColor, vec3(1.0), computeBloom(rayDirectionVec));
					}
				`;
			}

			return /* glsl */`
				vec3 raymarch(vec3 startPos)
				{
					vec3 rayDirectionVec = normalize(startPos - cameraPos) * ${getFloatGlsl(this.stepFactor)};
					
					float t = 0.0;
					
					for (int iteration = 0; iteration < maxMarches; iteration++)
					{
						vec3 pos = ${getGeodesicGlsl("cameraPos", "rayDirectionVec")};
						
						float distanceToScene = distanceEstimator(pos);

						float epsilon = max(t / (resolution * epsilonScaling), minEpsilon);
						
						if (distanceToScene < epsilon)
						{
							return computeShading(
								pos,
								epsilon,
								distanceToScene - 2.0 * epsilon,
								iteration
							);
						}
						
						else if (t > clipDistance)
						{
							return fogColor;
						}
						
						t += distanceToScene;
					}
					
					return fogColor;
				}
			`;
		})();



		const mainFunctionGlsl = (() =>
		{
			if (useForDepthBuffer)
			{
				return /* glsl */`${""}
					void main(void)
					{
						raymarch(
							imagePlaneCenterPos
								+ rightVec * (uvScale * uv.x + uvCenter.x) * aspectRatio.x
								+ upVec * (uvScale * uv.y + uvCenter.y) * aspectRatio.y
						);
					}
				`;
			}

			if (this.useFor3DPrinting)
			{
				return /* glsl */`${""}
					void main(void)
					{
						gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

						if (distanceEstimator(vec3(uv.x, uv.y, uvCenter.x) * uvScale) < epsilonScaling)
						{
							gl_FragColor = vec4(1.0);
						}
					}
				`;
			}

			if (antialiasing)
			{
				return /* glsl */`${""}
					vec3 raymarchHelper(vec2 uvAdjust)
					{
						return raymarch(
							imagePlaneCenterPos
								+ rightVec * (uvScale * (uv.x + uvAdjust.x) + uvCenter.x) * aspectRatio.x
								+ upVec * (uvScale * (uv.y + uvAdjust.y) + uvCenter.y) * aspectRatio.y
						);
					}
					
					void main(void)
					{
						vec2 texCoord = (uv + vec2(1.0)) * 0.5;
						vec4 sample = texture2D(uTexture, texCoord);
						
						if (sample.w > 0.15)
						{
							vec3 aaSample = (
								sample.xyz
								+ raymarchHelper(vec2(stepSize.x, 0.0))
								+ raymarchHelper(vec2(0.0, stepSize.y))
								+ raymarchHelper(vec2(-stepSize.x, 0.0))
								+ raymarchHelper(vec2(0.0, -stepSize.y))
							) / 5.0;
							
							gl_FragColor = vec4(aaSample, 1.0);
							return;
						}

						gl_FragColor = vec4(sample.xyz, 1.0);
					}
				`;
			}

			return /* glsl */`${""}
				void main(void)
				{
					vec3 finalColor = raymarch(
						imagePlaneCenterPos
							+ rightVec * (uvScale * uv.x + uvCenter.x) * aspectRatio.x
							+ upVec * (uvScale * uv.y + uvCenter.y) * aspectRatio.y
					);

					gl_FragColor = vec4(finalColor.xyz, 1.0);
				}
			`;
		})();

		const shader = /* glsl */`
			precision highp float;
			
			varying vec2 uv;

			${this.uniformsGlsl}

			${antialiasing ? /* glsl */`
				uniform sampler2D uTexture;
				uniform vec2 stepSize;
			` : ""}
			
			const vec3 lightPos = ${getVectorGlsl(this.lightPos)};
			const float lightBrightness = ${getFloatGlsl(this.lightBrightness)};
			const float bloomPower = ${getFloatGlsl(this.bloomPower)};
			
			const float clipDistance = ${getFloatGlsl(this.clipDistance)};
			const int maxMarches = ${this.maxMarches};
			const int maxShadowMarches = ${this.maxShadowMarches};
			const int maxReflectionMarches = ${this.maxReflectionMarches};
			const vec3 fogColor = ${getVectorGlsl(this.fogColor)};
			const float fogScaling = ${getFloatGlsl(this.fogScaling)};
			const float maxShadowAmount = 0.5;

			${useForDepthBuffer ? doubleEncodingGlsl : ""}

			${addGlsl}
			
			
			
			float distanceEstimator(vec3 pos)
			{
				${distanceEstimatorGlsl}
			}
			
			vec3 getColor(vec3 pos)
			{
				${getColorGlsl}
			}

			${this.useReflections ? /* glsl */`float getReflectivity(vec3 pos)
			{
				${getReflectivityGlsl}
			}` : ""}
			
			
			
			vec3 getSurfaceNormal(vec3 pos, float epsilon)
			{
				float xStep1 = distanceEstimator(pos + vec3(epsilon, 0.0, 0.0));
				float yStep1 = distanceEstimator(pos + vec3(0.0, epsilon, 0.0));
				float zStep1 = distanceEstimator(pos + vec3(0.0, 0.0, epsilon));
				
				float xStep2 = distanceEstimator(pos - vec3(epsilon, 0.0, 0.0));
				float yStep2 = distanceEstimator(pos - vec3(0.0, epsilon, 0.0));
				float zStep2 = distanceEstimator(pos - vec3(0.0, 0.0, epsilon));
				
				return normalize(vec3(xStep1 - xStep2, yStep1 - yStep2, zStep1 - zStep2));
			}

			${computeBloomGlsl}

			${computeShadowIntensityGlsl}

			${computeReflectionGlsl}
			
			${computeShadingGlsl}

			${raymarchGlsl}
			
			${mainFunctionGlsl}
		`;

		return shader;
	}



	reloadShader({
		distanceEstimatorGlsl,
		getColorGlsl,
		getReflectivityGlsl,
		addGlsl,
		useAntialiasing = this.useAntialiasing,
		useForDepthBuffer
	} = {}) {
		this.useAntialiasing = useAntialiasing;

		this.wilson.loadShader({
			id: "draw",
			shader: this.createShader({
				distanceEstimatorGlsl,
				getColorGlsl,
				getReflectivityGlsl,
				addGlsl,
				useForDepthBuffer,
			}),
			uniforms: this.uniforms,
		});

		

		if (this.useAntialiasing)
		{
			this.wilson.loadShader({
				id: "edgeDetect",
				shader: edgeDetectShader,
				uniforms: {
					stepSize: [1 / this.wilson.canvasWidth, 1 / this.wilson.canvasHeight]
				}
			});

			const aaShader = this.createShader({
				distanceEstimatorGlsl,
				getColorGlsl,
				getReflectivityGlsl,
				addGlsl,
				useForDepthBuffer,
				antialiasing: true
			});

			this.wilson.loadShader({
				id: "antialias",
				shader: aaShader,
				uniforms: {
					...this.uniforms,
					stepSize: [
						2 / (this.wilson.canvasWidth * 3),
						2 / (this.wilson.canvasHeight * 3)
					]
				}
			});

			this.createTextures();
		}

		this.calculateVectors();

		this.needNewFrame = true;
	}



	createTextures()
	{
		this.wilson.createFramebufferTexturePair({
			id: "0",
			textureType: "float"
		});
		this.wilson.createFramebufferTexturePair({
			id: "1",
			textureType: "float"
		});
		
		this.wilson.useFramebuffer(null);
		this.wilson.useTexture("0");

		this.wilson.setUniforms({
			stepSize:[1 / this.wilson.canvasWidth, 1 / this.wilson.canvasHeight]
		}, "edgeDetect");

		this.wilson.setUniforms({
			stepSize: [2 / (this.wilson.canvasWidth * 3), 2 / (this.wilson.canvasHeight * 3)]
		}, "antialias");

		this.wilson.useShader("draw");
	}



	setUniforms(uniforms)
	{
		this.uniforms = {
			...this.uniforms,
			...uniforms
		};

		this.wilson.setUniforms(uniforms, "draw");

		if (this.useAntialiasing)
		{
			this.wilson.setUniforms(uniforms, "antialias");
		}

		this.needNewFrame = true;
	}



	calculateVectors()
	{
		if (this.useFor3DPrinting)
		{
			return;
		}

		// Here comes the serious math. Theta is the angle in the xy-plane and
		// phi the angle down from the z-axis. We can use them get a normalized forward vector:

		this.forwardVec = [
			Math.cos(this.theta) * Math.sin(this.phi),
			Math.sin(this.theta) * Math.sin(this.phi),
			Math.cos(this.phi)
		];

		// Now the right vector needs to be constrained to the xy-plane,
		// since otherwise the image will appear tilted. For a vector (a, b, c),
		// the orthogonal plane that passes through the origin is ax + by + cz = 0,
		// so we want ax + by = 0. One solution is (b, -a), and that's the one that
		// goes to the "right" of the forward vector (when looking down).
		this.rightVec = normalize([this.forwardVec[1], -this.forwardVec[0], 0]);

		// Finally, the upward vector is the cross product of the previous two.
		this.upVec = crossProduct(this.rightVec, this.forwardVec);

		if (this.lockedOnOrigin)
		{
			this.cameraPos = scaleVector(
				-this.distanceFromOrigin,
				this.forwardVec
			);
		}

		this.speedFactor = Math.min(
			this.distanceEstimator(
				this.cameraPos[0],
				this.cameraPos[1],
				this.cameraPos[2]
			),
			.5
		) / 4;

		// The factor we divide by here sets the fov.
		this.forwardVec[0] *= this.speedFactor / 1.5;
		this.forwardVec[1] *= this.speedFactor / 1.5;
		this.forwardVec[2] *= this.speedFactor / 1.5;

		this.rightVec[0] *= this.speedFactor / this.fovFactor;
		this.rightVec[1] *= this.speedFactor / this.fovFactor;

		this.upVec[0] *= this.speedFactor / this.fovFactor;
		this.upVec[1] *= this.speedFactor / this.fovFactor;
		this.upVec[2] *= this.speedFactor / this.fovFactor;

		this.imagePlaneCenterPos = [
			this.cameraPos[0] + this.forwardVec[0] * this.focalLengthFactor,
			this.cameraPos[1] + this.forwardVec[1] * this.focalLengthFactor,
			this.cameraPos[2] + this.forwardVec[2] * this.focalLengthFactor
		];

		this.setUniforms({
			cameraPos: this.cameraPos,
			imagePlaneCenterPos: this.imagePlaneCenterPos,
			rightVec: this.rightVec,
			upVec: this.upVec,
		});

		this.needNewFrame = false;
	}

	distanceEstimator()
	{
		throw new Error("Distance estimator not implemented!");
	}

	prepareFrame(timeElapsed)
	{
		this.touchDelay = Math.max(0, this.touchDelay - timeElapsed);

		this.moveUpdate(timeElapsed);
	}

	drawFrame()
	{
		this.theta = this.lockedOnOrigin
			? this.wilson.worldCenterX
			: 2 * Math.PI - this.wilson.worldCenterX;
		this.phi = this.lockedOnOrigin
			? this.wilson.worldCenterY
			: Math.PI - this.wilson.worldCenterY;

		this.calculateVectors();


		if (this.useAntialiasing)
		{
			this.wilson.useFramebuffer("0");
		}

		this.wilson.drawFrame();

		if (this.useAntialiasing)
		{
			this.wilson.useShader("edgeDetect");
			this.wilson.useTexture("0");
			this.wilson.useFramebuffer("1");
			this.wilson.drawFrame();

			this.wilson.useShader("antialias");
			this.wilson.useTexture("1");
			this.wilson.useFramebuffer(null);
			this.wilson.drawFrame();

			this.wilson.useShader("draw");
		}
	}

	async downloadFrame(filename)
	{
		this.drawFrame();
		this.wilson.downloadFrame(filename, false);
		
		// this.makeMosaic({ filename, size: 4 });
	}

	async makeMosaic({
		filename,
		size,
		returnPixels = false,
		useForDepthBuffer = false
	}) {
		return new Promise(outerResolve =>
		{
			this.setUniforms({
				uvScale: 1 / size,
				resolution: this.resolution * size
			});

			const centerPoints = [];
			for (let i = 0; i < size; i++)
			{
				centerPoints.push(-1 + (1 + 2 * i) / size);
			}
			const canvases = [];

			const depthArrays = new Array(size);

			for (let i = 0; i < size; i++)
			{
				canvases.push([]);
				depthArrays[i] = new Array(size);

				for (let j = 0; j < size; j++)
				{
					canvases[i].push(document.createElement("canvas"));
					canvases[i][j].width = this.resolution;
					canvases[i][j].height = this.resolution;
				}
			}



			const combineCanvas = async () =>
			{
				if (useForDepthBuffer)
				{
					// Concatenate all the depth buffers and return. This is unfortunately
					// kinda hellish since we need to list all the depths one *row* at a time,
					// but the data format is a bunch of small blocks.
					const combinedDepthBuffer = new Float32Array(
						this.resolution * this.resolution * size * size
					);
					
					for (let row = 0; row < size; row++)
					{
						for (let i = 0; i < this.resolution; i++)
						{
							for (let col = 0; col < size; col++)
							{
								combinedDepthBuffer.set(
									// This should be [row][col], but the order in which the blocks
									// are computed is also transposed weirdly.
									depthArrays[col][row].subarray(
										i * this.resolution,
										(i + 1) * this.resolution
									),
									row * this.resolution * this.resolution * size
										+ i * this.resolution * size
										+ col * this.resolution
								);
							}
						}
					}

					outerResolve(combinedDepthBuffer);
					return;
				}

				const combinedCanvas = document.createElement("canvas");
				combinedCanvas.width = this.resolution * size;
				combinedCanvas.height = this.resolution * size;
				const combinedCtx = combinedCanvas.getContext("2d", { colorSpace: "display-p3" });

				for (let i = 0; i < size; i++)
				{
					for (let j = 0; j < size; j++)
					{
						combinedCtx.drawImage(
							canvases[i][j],
							i * this.resolution,
							j * this.resolution
						);
					}
				}

				// We need to flip the canvas visually if we're actually downloading
				// it, but not if we're returning the pixel data.
				if (!returnPixels)
				{
					combinedCtx.translate(0, this.resolution * size);
					combinedCtx.scale(1, -1);
				}

				combinedCtx.drawImage(combinedCanvas, 0, 0);

				const pixels = returnPixels
					? combinedCtx.getImageData(
						0,
						0,
						this.resolution * size,
						this.resolution * size
					).data
					: undefined;

				if (!returnPixels)
				{
					combinedCanvas.toBlob((blob) =>
					{
						const link = document.createElement("a");
						link.href = URL.createObjectURL(blob);
						link.download = filename;
						link.click();
					});
				}

				await new Promise(resolve => setTimeout(resolve, 100));

				this.setUniforms({
					uvScale: 1,
					uvCenter: [0, 0],
					resolution: this.resolution
				});

				this.needNewFrame = true;

				outerResolve(pixels);
			};



			let i = 0;
			let j = 0;

			const drawMosaicPart = async () =>
			{
				const ctx = canvases[i][j].getContext("2d", { colorSpace: "display-p3" });

				this.setUniforms({ uvCenter: [centerPoints[i], centerPoints[j]] });
				this.drawFrame();

				if (useForDepthBuffer)
				{
					depthArrays[i][j] = new Float32Array(this.wilson.readPixels().buffer);
				}

				const imageData = new ImageData(
					new Uint8ClampedArray(this.wilson.readPixels()),
					this.resolution,
					this.resolution
				);

				ctx.putImageData(imageData, 0, 0);

				await new Promise(resolve => setTimeout(resolve, 500));

				j++;
				if (j === size)
				{
					j = 0;
					i++;
				}

				if (i !== size)
				{
					requestAnimationFrame(drawMosaicPart);
				}

				else
				{
					combineCanvas();
				}
			};

			requestAnimationFrame(drawMosaicPart);
		});
	}

	async downloadBokehFrame()
	{
		const mosaicSize = 8;

		const returnToAntialiasing = this.useAntialiasing;
		await loadGlsl();

		this.reloadShader({
			useAntialiasing: true,
			useForDepthBuffer: false
		});
		const colors = await this.makeMosaic({
			size: mosaicSize,
			returnPixels: true
		});
		
		this.reloadShader({
			useAntialiasing: false,
			useForDepthBuffer: true
		});
		const depths = await this.makeMosaic({
			size: mosaicSize,
			useForDepthBuffer: true
		});

		const resolution = this.resolution * mosaicSize;

		// A minimum radius of 0 is just one pixel, but it causes weird sharpness artifacts.
		const minRadius = 0.5;
		const maxRadius = resolution / 250;

		const canvas = this.createHiddenCanvas();
		const options = { canvasWidth: resolution };
		const wilsonHidden = new WilsonCPU(canvas, options);

		wilsonHidden.ctx.fillStyle = "rgb(0, 0, 0)";
		wilsonHidden.ctx.fillRect(0, 0, resolution, resolution);

		const pixelsByDepth = Array.from(depths).map((depth, i) =>
		{
			const col = i % resolution;
			const row = resolution - Math.floor(i / resolution) - 1;

			return [
				depth,
				col,
				row,
				colors[4 * i],
				colors[4 * i + 1],
				colors[4 * i + 2],
			];
		}).sort((a, b) => b[0] - a[0]);

		const minDepth = pixelsByDepth[pixelsByDepth.length - 1][0];
		
		let maxDepthIndex = 0;
		for (let i = 0; i < pixelsByDepth.length; i++)
		{
			if (pixelsByDepth[i][0] < this.clipDistance)
			{
				maxDepthIndex = i;
				break;
			}
		}
		maxDepthIndex = Math.floor(
			maxDepthIndex
			+ .1 * (pixelsByDepth.length - maxDepthIndex)
		);
		const maxDepth = pixelsByDepth[maxDepthIndex][0];

		const imageData = new Array(resolution * resolution * 4).fill(0);
		


		for (const pixel of pixelsByDepth)
		{
			const depth = pixel[0];

			if (depth === this.clipDistance)
			{
				continue;
			}

			const col = pixel[1];
			const row = pixel[2];

			const radius = Math.min(
				Math.max(
					(depth - minDepth) / (maxDepth - minDepth),
					0,
				),
				1
			) * (maxRadius - minRadius) + minRadius;



			// First we have to compute the total opacity spread over
			// all the pixels hit by this circle. There's unfortunately not a good
			// way to compute this other than taking a full pass over the pixels.

			let totalValue = 0;

			for (let y = Math.floor(-radius); y <= Math.ceil(radius); y++)
			{
				for (let x = Math.floor(-radius); x <= Math.ceil(radius); x++)
				{
					if (x * x + y * y <= radius * radius)
					{
						const value = Math.min(radius - Math.sqrt(x * x + y * y), 1);

						totalValue += value;
					}
				}
			}

			const opacity = 1 / totalValue;

			for (let y = Math.floor(-radius); y <= Math.ceil(radius); y++)
			{
				for (let x = Math.floor(-radius); x <= Math.ceil(radius); x++)
				{
					if (x * x + y * y <= radius * radius)
					{
						const row2 = row + y;
						const col2 = col + x;

						if (
							row2 < 0
							|| row2 >= resolution
							|| col2 < 0
							|| col2 >= resolution
						) {
							continue;
						}

						const index = row2 * resolution + col2;
						const value = opacity * Math.min(radius - Math.sqrt(x * x + y * y), 1);

						imageData[4 * index] += pixel[3] * value;
						imageData[4 * index + 1] += pixel[4] * value;
						imageData[4 * index + 2] += pixel[5] * value;
					}
				}
			}
		}

		const normalizedImageData = new Uint8ClampedArray(imageData);

		for (let i = 0; i < resolution * resolution; i++)
		{
			normalizedImageData[4 * i + 3] = 255;
		}

		wilsonHidden.drawFrame(normalizedImageData);

		wilsonHidden.downloadFrame("bokeh-render.png");

		this.reloadShader({
			useAntialiasing: returnToAntialiasing,
			useForDepthBuffer: false
		});

		this.drawFrame();

		canvas.remove();
	}


	touchDelay = 0;
	numTouches = 0;

	onTouchStart({ event })
	{
		if (this.numTouches <= 1 && event.touches.length === 2)
		{
			this.numTouches = 2;
			this.touchDelay = 100;
		}

		else if (this.numTouches <= 2 && event.touches.length === 3)
		{
			this.numTouches = 3;
		}

		else
		{
			this.numTouches = 0;
		}
	}

	onTouchEnd({ event })
	{
		if (event.touches.length < 2)
		{
			this.numTouches = 0;
		}
	}

	moveUpdate(timeElapsed)
	{
		if (this.touchDelay === 0)
		{
			if (this.numTouches === 2)
			{
				this.moveVelocity[0] = 1;
			}

			else if (this.numTouches === 3)
			{
				this.moveVelocity[0] = -1;
			}
		}



		if (this.keysPressed.w || this.numTouches === 2)
		{
			this.moveVelocity[0] = 1;
		}

		else if (this.keysPressed.s || this.numTouches === 3)
		{
			this.moveVelocity[0] = -1;
		}

		if (this.keysPressed.d)
		{
			this.moveVelocity[1] = 1;
		}

		else if (this.keysPressed.a)
		{
			this.moveVelocity[1] = -1;
		}

		if (this.keysPressed[" "])
		{
			this.moveVelocity[2] = 1;
		}

		else if (this.keysPressed.shift)
		{
			this.moveVelocity[2] = -1;
		}

		if (!this.lockedOnOrigin && (
			this.moveVelocity[0] !== 0
				|| this.moveVelocity[1] !== 0
				|| this.moveVelocity[2] !== 0
		)) {
			const usableForwardVec = this.lockZ !== undefined
				? scaleVector(
					magnitude(this.forwardVec),
					normalize([
						this.forwardVec[0],
						this.forwardVec[1],
						0
					]),
				)
				: this.forwardVec;

			const usableRightVec = this.lockZ !== undefined
				? scaleVector(
					magnitude(this.rightVec),
					normalize([
						this.rightVec[0],
						this.rightVec[1],
						0
					]),
				)
				: this.rightVec;

			const tangentVec = [
				this.moveVelocity[0] * usableForwardVec[0]
					+ this.moveVelocity[1] * usableRightVec[0],
				this.moveVelocity[0] * usableForwardVec[1]
					+ this.moveVelocity[1] * usableRightVec[1],
				this.moveVelocity[0] * usableForwardVec[2]
					+ this.moveVelocity[1] * usableRightVec[2]
					+ this.moveVelocity[2] * this.speedFactor / 1.5
			];

			this.cameraPos[0] += this.movingSpeed * tangentVec[0] * (timeElapsed / 6.944);
			this.cameraPos[1] += this.movingSpeed * tangentVec[1] * (timeElapsed / 6.944);
			this.cameraPos[2] = this.lockZ
				?? this.cameraPos[2] + this.movingSpeed * tangentVec[2] * (timeElapsed / 6.944);

			this.needNewFrame = true;
		}

		for (let i = 0; i < 3; i++)
		{
			this.moveVelocity[i] *= this.moveFriction ** (timeElapsed / 6.944);

			if (Math.abs(this.moveVelocity[i]) < this.moveStopThreshhold)
			{
				this.moveVelocity[i] = 0;
			}
		}
	}

	onResizeCanvas()
	{
		if (this.useFor3DPrinting)
		{
			return;
		}

		this.resolution = Math.sqrt(this.wilson.canvasWidth * this.wilson.canvasHeight);

		this.wilson.resizeWorld({
			minY: 0.001 - this.wilson.worldHeight / 2,
			maxY: Math.PI - 0.001 + this.wilson.worldHeight / 2,
		});

		this.setUniforms({
			aspectRatio: [
				this.wilson.worldWidth / this.worldSize,
				this.wilson.worldHeight / this.worldSize
			],
			resolution: this.resolution
		});

		if (this.useAntialiasing)
		{
			this.createTextures();
		}

		this.needNewFrame = true;
	}

	

	animateUniform({
		name,
		value,
		duration = 1000
	}) {
		const dummy = { t: this.uniforms[name] };

		return anime({
			targets: dummy,
			t: value,
			duration,
			easing: "easeInOutQuart",
			update: () =>
			{
				this.setUniforms({ [name]: dummy.t });
				this.needNewFrame = true;
			}
		}).finished;
	}

	loopUniform({
		name,
		startValue,
		endValue,
		duration = 2000
	}) {
		const dummy = { t: 0 };

		return anime({
			targets: dummy,
			t: 1,
			duration,
			easing: "easeInOutQuad",
			loop: true,
			direction: "alternate",
			update: () =>
			{
				this.setUniforms({ [name]: startValue + (endValue - startValue) * dummy.t });
				this.needNewFrame = true;
			}
		});
	}



	async setLockedOnOrigin(value)
	{
		if (value && !this.lockedOnOrigin)
		{
			// Convert to spherical coordinates.
			const r = magnitude(this.cameraPos);
			const normalizedCameraPos = normalize(this.cameraPos);
			const phi = Math.acos(this.cameraPos[2] / r);
			let theta = Math.PI - Math.atan2(this.cameraPos[1], this.cameraPos[0]);
			if (theta > Math.PI)
			{
				theta -= 2 * Math.PI;
			}
			if (theta < -Math.PI)
			{
				theta += 2 * Math.PI;
			}

			const dummy = {
				r,
				theta: 2 * Math.PI - this.theta,
				phi: Math.PI - this.phi
			};

			if (dummy.theta > Math.PI)
			{
				dummy.theta -= 2 * Math.PI;
			}
			if (dummy.theta < -Math.PI)
			{
				dummy.theta += 2 * Math.PI;
			}

			await anime({
				targets: dummy,
				theta,
				phi,
				r: this.distanceFromOrigin,
				duration: 500,
				easing: "easeOutCubic",
				update: () =>
				{
					this.wilson.resizeWorld({
						centerX: dummy.theta,
						centerY: dummy.phi,
					});
					
					this.cameraPos = scaleVector(
						dummy.r,
						normalizedCameraPos
					);
					
					this.needNewFrame = true;
				}
			}).finished;
		}

		this.lockedOnOrigin = value;
		this.worldSize = this.lockedOnOrigin ? 2.5 : 1.5;

		this.wilson.resizeWorld({
			width: this.worldSize,
			height: this.worldSize,
			centerX: this.lockedOnOrigin ? this.theta : 2 * Math.PI - this.theta,
			centerY: this.lockedOnOrigin ? this.phi : Math.PI - this.phi,
			minY: 0.001 - this.worldSize / 2,
			maxY: Math.PI - 0.001 + this.worldSize / 2,
		});
	}
}



export function magnitude(vec)
{
	return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
}



export function addVectors(vec1, vec2)
{
	return [vec1[0] + vec2[0], vec1[1] + vec2[1], vec1[2] + vec2[2]];
}

export function scaleVector(c, vec)
{
	return [c * vec[0], c * vec[1], c * vec[2]];
}



export function dotProduct(vec1, vec2)
{
	return vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
}

export function dotProduct4(vec1, vec2)
{
	return vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2] + vec1[3] * vec2[3];
}



export function crossProduct(vec1, vec2)
{
	return [
		vec1[1] * vec2[2] - vec1[2] * vec2[1],
		vec1[2] * vec2[0] - vec1[0] * vec2[2],
		vec1[0] * vec2[1] - vec1[1] * vec2[0]
	];
}



export function matMul(mat1, mat2)
{
	return [
		[
			mat1[0][0] * mat2[0][0] + mat1[0][1] * mat2[1][0] + mat1[0][2] * mat2[2][0],
			mat1[0][0] * mat2[0][1] + mat1[0][1] * mat2[1][1] + mat1[0][2] * mat2[2][1],
			mat1[0][0] * mat2[0][2] + mat1[0][1] * mat2[1][2] + mat1[0][2] * mat2[2][2]
		],

		[
			mat1[1][0] * mat2[0][0] + mat1[1][1] * mat2[1][0] + mat1[1][2] * mat2[2][0],
			mat1[1][0] * mat2[0][1] + mat1[1][1] * mat2[1][1] + mat1[1][2] * mat2[2][1],
			mat1[1][0] * mat2[0][2] + mat1[1][1] * mat2[1][2] + mat1[1][2] * mat2[2][2]
		],

		[
			mat1[2][0] * mat2[0][0] + mat1[2][1] * mat2[1][0] + mat1[2][2] * mat2[2][0],
			mat1[2][0] * mat2[0][1] + mat1[2][1] * mat2[1][1] + mat1[2][2] * mat2[2][1],
			mat1[2][0] * mat2[0][2] + mat1[2][1] * mat2[1][2] + mat1[2][2] * mat2[2][2]
		]
	];
}



export function qmul(x1, y1, z1, w1, x2, y2, z2, w2)
{
	return [
		x1 * x2 - y1 * y2 - z1 * z1 - w1 * w2,
		x1 * y2 + y1 * x2 + z1 * w2 - w1 * z2,
		x1 * z2 - y1 * w2 + z1 * x2 + w1 * y2,
		x1 * w2 + y1 * z2 - z1 * y2 + w1 * x2
	];
}



export function normalize(vec)
{
	const mag = magnitude(vec);

	return [vec[0] / mag, vec[1] / mag, vec[2] / mag];
}



export function getRotationMatrix(thetaX, thetaY, thetaZ)
{
	const cX = Math.cos(thetaX);
	const sX = Math.sin(thetaX);
	const cY = Math.cos(thetaY);
	const sY = Math.sin(thetaY);
	const cZ = Math.cos(thetaZ);
	const sZ = Math.sin(thetaZ);

	const matZ = [
		[cZ, -sZ, 0],
		[sZ, cZ, 0],
		[0, 0, 1]
	];

	const matY = [
		[cY, 0, -sY],
		[0, 1, 0],
		[sY, 0, cY]
	];

	const matX = [
		[1, 0, 0],
		[0, cX, -sX],
		[0, sX, cX]
	];

	return matMul(matMul(matZ, matY), matX);
}

export function mat3TimesVector(mat, vec)
{
	return [
		mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2],
		mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2],
		mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2]
	];
}