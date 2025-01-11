import { AnimationFrameApplet } from "/scripts/applets/animationFrameApplet.js";
import { WilsonGPU } from "/scripts/wilson.js";

export class AbelianSandpiles extends AnimationFrameApplet
{
	wilsonUpdate;
	numGrains;
	floodGrains;
	resolution = 319;
	resolutionUpdate;

	computationsPerFrame = 20;

	lastPixelData;



	constructor({ canvas })
	{
		super(canvas);

		const shaderInit = /* glsl */`
			precision highp float;
			precision highp sampler2D;
			
			varying vec2 uv;
			
			uniform sampler2D uTexture;
			
			uniform float stepSize;
			
			uniform vec4 startGrains;
			uniform vec4 floodGrains;
			
			
			
			void main(void)
			{
				vec2 center = (uv + vec2(1.0, 1.0)) / 2.0;

				if (center.y - center.x > stepSize / 4.0)
				{
					gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
					return;
				}

				if (length(center) < stepSize)
				{
					gl_FragColor = startGrains;
					return;
				}
				
				gl_FragColor = floodGrains;
			}
		`;



		const shaderUpdate = /* glsl */`
			precision highp float;
			precision highp sampler2D;
			
			varying vec2 uv;
			
			uniform sampler2D uTexture;
			
			uniform float stepSize;

			

			void quotientState(inout vec4 state)
			{
				state = floor(state * 255.0);

				state.y += mod(state.x, 4.0) * 256.0;
				state.x = floor(state.x / 4.0);
				
				state.z += mod(state.y, 4.0) * 256.0;
				state.y = floor(state.y / 4.0);
				
				state.w += mod(state.z, 4.0) * 256.0;
				state.z = floor(state.z / 4.0);
				
				state.w = floor(state.w / 4.0);
			}
			
			void main(void)
			{
				vec2 center = (uv + vec2(1.0, 1.0)) / 2.0;

				if (
					center.y > center.x + stepSize / 2.0
					|| abs(center.x - 1.0) < stepSize
				) {
					gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
					return;
				}

				vec4 state = floor(texture2D(uTexture, center) * 255.0);
				float leftover = mod(state.w, 4.0);

				vec4 stateUp;
				vec4 stateDown;
				vec4 stateLeft;
				vec4 stateRight = texture2D(uTexture, center + vec2(stepSize, 0.0));

				if (length(center) < stepSize)
				{
					stateDown = stateRight;
					stateUp = stateRight;
					stateLeft = stateRight;
				}

				else if (abs(center.y) < stepSize)
				{
					stateUp = texture2D(uTexture, center + vec2(0.0, stepSize));
					stateDown = stateUp;
					stateLeft = texture2D(uTexture, center + vec2(-stepSize, 0.0));
				}

				else if (abs(center.x - center.y) < stepSize / 4.0)
				{
					stateDown = texture2D(uTexture, center + vec2(0.0, -stepSize));
					stateUp = stateDown;
					stateLeft = stateRight;
				}

				else
				{
					stateUp = texture2D(uTexture, center + vec2(0.0, stepSize));
					stateDown = texture2D(uTexture, center + vec2(0.0, -stepSize));
					stateLeft = texture2D(uTexture, center + vec2(-stepSize, 0.0));
				}

				quotientState(stateUp);
				quotientState(stateDown);
				quotientState(stateLeft);
				quotientState(stateRight);
				
				
				//The new state should be what used to be here, mod 4, plus the floor of 1/4 of each of the neighbors.
				vec4 newState = vec4(0.0, 0.0, 0.0, leftover) + stateUp + stateDown + stateLeft + stateRight;
				
				newState.z += floor(newState.w / 256.0);
				newState.w = mod(newState.w, 256.0);
				
				newState.y += floor(newState.z / 256.0);
				newState.z = mod(newState.z, 256.0);

				newState.x += floor(newState.y / 256.0);
				newState.y = mod(newState.y, 256.0);
				
				gl_FragColor = newState / 255.0;
			}
		`;

		const shaderDraw = /* glsl */`
			precision highp float;
			precision highp sampler2D;
			
			varying vec2 uv;
			
			uniform sampler2D uTexture;

			uniform vec3 color1;
			uniform vec3 color2;
			uniform vec3 color3;
			
			void main(void)
			{
				vec2 modUv = abs(uv);

				if (modUv.y > modUv.x)
				{
					modUv = vec2(modUv.y, modUv.x);
				}

				vec2 state = floor(256.0 * texture2D(uTexture, modUv).zw);
				
				if (state.x != 0.0)
				{
					gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
					return;
				}
				
				if (state.y == 1.0)
				{
					gl_FragColor = vec4(color1, 1.0);
					return;
				}
				
				if (state.y == 2.0)
				{
					gl_FragColor = vec4(color2, 1.0);
					return;
				}
				
				if (state.y == 3.0)
				{
					gl_FragColor = vec4(color3, 1.0);
					return;
				}
				
				if (state.y >= 4.0)
				{
					float brightness = (state.y - 3.0) / 512.0 + .5;
					gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
					return;
				}
				
				gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
			}
		`;

		const hiddenCanvas = this.createHiddenCanvas();

		const optionsUpdate = {
			shaders: {
				init: shaderInit,
				update: shaderUpdate,
			},

			uniforms: {
				init: {
					stepSize: 0,
					startGrains: [0, 0, 0, 0],
					floodGrains: [0, 0, 0, 0],
				},
				update: {
					stepSize: 0,
				}
			},

			canvasWidth: Math.ceil(this.resolution / 2),
		};

		this.wilsonUpdate = new WilsonGPU(hiddenCanvas, optionsUpdate);

		const options = {
			shader: shaderDraw,

			uniforms: {
				color1: [0, 0, 0],
				color2: [0, 0, 0],
				color3: [0, 0, 0],
			},

			canvasWidth: this.resolution,

			fullscreenOptions: {
				onSwitch: this.switchFullscreen.bind(this),
				beforeSwitch: this.beforeSwitchFullscreen.bind(this),
				useFullscreenButton: true,
				enterFullscreenButtonIconPath: "/graphics/general-icons/enter-fullscreen.png",
				exitFullscreenButtonIconPath: "/graphics/general-icons/exit-fullscreen.png",
			},
		};

		this.wilson = new WilsonGPU(canvas, options);
		this.canvas.style.imageRendering = "pixelated";
	}



	run({
		resolution = 100,
		numGrains = 10000,
		floodGrains = 0,
		computationsPerFrame = 25,
		palette = [[229, 190, 237], [149, 147, 217], [124, 144, 219]],
	}) {
		this.resolution = resolution + 1 - (resolution % 2);
		this.resolutionUpdate = Math.ceil(this.resolution / 2);
		this.numGrains = numGrains;
		this.floodGrains = floodGrains;
		this.computationsPerFrame = computationsPerFrame;

		const grains = [
			(Math.floor(this.numGrains / (256 * 256 * 256)) % 256) / 255,
			(Math.floor(this.numGrains / (256 * 256)) % 256) / 255,
			(Math.floor(this.numGrains / 256) % 256) / 255,
			(this.numGrains % 256) / 255
		];

		this.wilsonUpdate.setUniforms({
			stepSize: 1 / this.resolutionUpdate,
			startGrains: grains,
			floodGrains: [0, 0, 0, this.floodGrains / 255]
		}, "init");

		this.wilsonUpdate.setUniforms({
			stepSize: 1 / this.resolutionUpdate
		}, "update");

		this.wilsonUpdate.resizeCanvas({ width: this.resolutionUpdate });

		this.wilson.setUniforms({
			color1: [
				palette[0][0] / 255,
				palette[0][1] / 255,
				palette[0][2] / 255
			],
			color2: [
				palette[1][0] / 255,
				palette[1][1] / 255,
				palette[1][2] / 255
			],
			color3: [
				palette[2][0] / 255,
				palette[2][1] / 255,
				palette[2][2] / 255
			]
		});

		this.wilson.resizeCanvas({ width: this.resolution });

		this.wilson.createFramebufferTexturePair({
			id: "output",
			width: this.resolutionUpdate,
			height: this.resolutionUpdate,
			textureType: "unsignedByte"
		});

		this.wilson.useFramebuffer(null);



		this.wilsonUpdate.createFramebufferTexturePair({
			id: "0",
			textureType: "unsignedByte"
		});

		this.wilsonUpdate.createFramebufferTexturePair({
			id: "1",
			textureType: "unsignedByte"
		});

		this.wilsonUpdate.useTexture("0");
		this.wilsonUpdate.useFramebuffer(null);

		this.wilsonUpdate.useShader("update");
		this.wilsonUpdate.setTexture({
			id: "0",
			data: null
		});
		this.wilsonUpdate.setTexture({
			id: "1",
			data: null
		});

		this.wilsonUpdate.useShader("init");
		this.wilsonUpdate.useTexture("1");
		this.wilsonUpdate.useFramebuffer("0");
		this.wilsonUpdate.drawFrame();

		this.wilsonUpdate.useTexture("0");

		this.resume();
	}



	drawFrame()
	{
		this.wilsonUpdate.useShader("update");

		for (let i = 0; i < this.computationsPerFrame; i++)
		{
			this.wilsonUpdate.useFramebuffer("1");
			this.wilsonUpdate.drawFrame();

			this.wilsonUpdate.useTexture("1");
			this.wilsonUpdate.useFramebuffer("0");
			this.wilsonUpdate.drawFrame();

			this.wilsonUpdate.useTexture("0");
		}

		const pixelData = this.wilsonUpdate.readPixels();

		this.wilson.setTexture({
			id: "output",
			data: pixelData
		});

		this.wilson.drawFrame();



		if (this.lastPixelData)
		{
			let foundDiff = false;

			for (let i = 0; i < pixelData.length; i++)
			{
				if (pixelData[i] !== this.lastPixelData[i])
				{
					foundDiff = true;
					break;
				}
			}

			if (!foundDiff)
			{
				this.pause();
				return;
			}
		}

		this.lastPixelData = pixelData;

		this.needNewFrame = true;
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
}