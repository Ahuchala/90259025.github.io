import { AnimationFrameApplet } from "/scripts/applets/animationFrameApplet.js";
import { hsvToRgb } from "/scripts/applets/applet.js";
import { convertColor } from "/scripts/src/browser.js";
import { WilsonCPU } from "/scripts/wilson.js";

export class PascalsTriangleColorings extends AnimationFrameApplet
{
	gridSize = 20;
	pixelsPerRow = 0;
	pixelsPerFrame = 10;
	delayOnMeet = 0;

	resolution = 2000;

	numColors = 3;

	yOffset = 0;

	fillRegions = true;

	parities = [];
	coordinates = [];
	colors = [];
	isFinished = [];

	activeNodes = [];


	constructor({ canvas })
	{
		super(canvas);

		const options =
		{
			canvasWidth: 2000,

			fullscreenOptions: {
				onSwitch: this.switchFullscreen.bind(this),
				beforeSwitch: this.beforeSwitchFullscreen.bind(this),
				useFullscreenButton: true,
				enterFullscreenButtonIconPath: "/graphics/general-icons/enter-fullscreen.png",
				exitFullscreenButtonIconPath: "/graphics/general-icons/exit-fullscreen.png"
			}
		};

		this.wilson = new WilsonCPU(canvas, options);
	}



	run({
		resolution,
		gridSize,
		numColors
	}) {
		this.resolution = resolution;
		this.gridSize = gridSize;
		this.numColors = numColors;

		this.wilson.resizeCanvas({ width: this.resolution });

		this.pixelsPerFrame = Math.ceil(this.resolution / 200);
		this.pixelsPerRow = Math.round(this.resolution / (this.gridSize + 2));
		this.delayOnMeet = 2 * this.pixelsPerRow;

		this.yOffset = (
			1 - (Math.sqrt(3) / 2 * (this.gridSize + 1) / (this.gridSize + 2))
		) / 2 * this.resolution;

		this.activeNodes = [[0, 0, 0, 0]];



		this.parities = new Array(this.gridSize);
		this.colors = new Array(this.gridSize);
		this.isFinished = new Array(this.gridSize);
		this.coordinates = new Array(this.gridSize);

		for (let i = 0; i < this.gridSize; i++)
		{
			this.parities[i] = new Array(this.gridSize);
			this.colors[i] = new Array(this.gridSize);
			this.coordinates[i] = new Array(this.gridSize);

			this.isFinished[i] = new Array(this.gridSize);

			for (let j = 0; j < this.gridSize; j++)
			{
				this.isFinished[i][j] = false;
			}
		}

		this.parities[0][0] = 1;
		this.colors[0][0] = hsvToRgb(1 / this.numColors, 1, 1);



		for (let i = 1; i < this.gridSize; i++)
		{
			this.parities[i][0] = 1;
			this.parities[i][i] = 1;

			this.colors[i][0] = [...this.colors[0][0]];
			this.colors[i][i] = [...this.colors[0][0]];

			for (let j = 1; j < i; j++)
			{
				this.parities[i][j] = (
					this.parities[i - 1][j - 1] + this.parities[i - 1][j]
				) % this.numColors;

				this.colors[i][j] = hsvToRgb(
					this.parities[i][j] / this.numColors,
					1,
					1
				);
			}
		}

		for (let i = 0; i < this.gridSize; i++)
		{
			for (let j = 0; j <= i; j++)
			{
				this.coordinates[i][j] = this.getCoordinates(i, j);
			}
		}

		this.wilson.ctx.fillStyle = convertColor(0, 0, 0);
		this.wilson.ctx.fillRect(0, 0, this.resolution, this.resolution);
		this.wilson.ctx.lineWidth = Math.sqrt(this.pixelsPerRow / 150) * 10;
		this.resume();
	}



	drawFrame()
	{
		for (let i = 0; i < this.pixelsPerFrame; i++)
		{
			for (let j = 0; j < this.activeNodes.length; j++)
			{
				if (this.activeNodes[j][3] !== 0)
				{
					this.activeNodes[j][3]--;

					continue;
				}



				this.drawLineSegments(j);



				this.activeNodes[j][2]++;

				if (this.activeNodes[j][2] === this.pixelsPerRow - 1)
				{
					if (this.activeNodes[j][0] !== this.gridSize - 2)
					{
						if (!(this.isFinished[this.activeNodes[j][0] + 1][this.activeNodes[j][1]]))
						{
							let found = false;

							for (let k = 0; k < this.activeNodes.length; k++)
							{
								if (
									this.activeNodes[k][0] === this.activeNodes[j][0] + 1
									&& this.activeNodes[k][1] === this.activeNodes[j][1]
								) {
									found = true;

									this.activeNodes[k][3] += this.delayOnMeet;

									break;
								}
							}

							if (!found)
							{
								this.activeNodes.push([
									this.activeNodes[j][0] + 1,
									this.activeNodes[j][1],
									0,
									0
								]);
							}
						}

						if (
							!this.isFinished[this.activeNodes[j][0] + 1][this.activeNodes[j][1] + 1]
						) {
							let found = false;

							for (let k = 0; k < this.activeNodes.length; k++)
							{
								if (
									this.activeNodes[k][0] === this.activeNodes[j][0] + 1
									&& this.activeNodes[k][1] === this.activeNodes[j][1] + 1
								) {
									found = true;

									this.activeNodes[k][3] += this.delayOnMeet;

									break;
								}
							}

							if (
								!found
								&& this.activeNodes[j][1] + 1 <= (this.activeNodes[j][0] + 1) / 2
							) {
								this.activeNodes.push([
									this.activeNodes[j][0] + 1,
									this.activeNodes[j][1] + 1,
									0,
									0
								]);
							}
						}
					}

					this.isFinished[this.activeNodes[j][0]][this.activeNodes[j][1]] = true;

					this.activeNodes.splice(j, 1);
				}
			}
		}

		if (this.activeNodes.length !== 0)
		{
			this.needNewFrame = true;
		}
	}



	getCoordinates(row, col)
	{
		let centerX = (col - Math.floor(row / 2)) * this.resolution / (this.gridSize + 2)
			+ this.resolution / 2;

		if (row % 2 === 1)
		{
			centerX -= .5 * this.resolution / (this.gridSize + 2);
		}

		const centerY = (row + 1) * Math.sqrt(3) / 2 * this.resolution / (this.gridSize + 2)
			+ this.yOffset;

		return [.8 * centerX + .1 * this.resolution, .8 * centerY + .1 * this.resolution];
	}



	drawLineSegments(activeNodeIndex)
	{
		const oldT = this.activeNodes[activeNodeIndex][2] / this.pixelsPerRow;
		const newT = (this.activeNodes[activeNodeIndex][2] + 2) / this.pixelsPerRow;



		const row1 = this.activeNodes[activeNodeIndex][0];
		let col1 = this.activeNodes[activeNodeIndex][1];

		const row2 = row1 + 1;
		let col2 = col1;

		this.wilson.ctx.strokeStyle = convertColor(
			this.colors[row1][col1][0] * (1 - oldT) + this.colors[row2][col2][0] * oldT,
			this.colors[row1][col1][1] * (1 - oldT) + this.colors[row2][col2][1] * oldT,
			this.colors[row1][col1][2] * (1 - oldT) + this.colors[row2][col2][2] * oldT
		);

		this.wilson.ctx.beginPath();

		this.wilson.ctx.moveTo(
			this.coordinates[row1][col1][0] * (1 - oldT) + this.coordinates[row2][col2][0] * oldT,
			this.coordinates[row1][col1][1] * (1 - oldT) + this.coordinates[row2][col2][1] * oldT
		);

		this.wilson.ctx.lineTo(
			this.coordinates[row1][col1][0] * (1 - newT) + this.coordinates[row2][col2][0] * newT,
			this.coordinates[row1][col1][1] * (1 - newT) + this.coordinates[row2][col2][1] * newT
		);

		this.wilson.ctx.stroke();



		col2++;

		this.wilson.ctx.strokeStyle = convertColor(
			this.colors[row1][col1][0] * (1 - oldT) + this.colors[row2][col2][0] * oldT,
			this.colors[row1][col1][1] * (1 - oldT) + this.colors[row2][col2][1] * oldT,
			this.colors[row1][col1][2] * (1 - oldT) + this.colors[row2][col2][2] * oldT
		);

		this.wilson.ctx.beginPath();

		this.wilson.ctx.moveTo(
			this.coordinates[row1][col1][0] * (1 - oldT) + this.coordinates[row2][col2][0] * oldT,
			this.coordinates[row1][col1][1] * (1 - oldT) + this.coordinates[row2][col2][1] * oldT
		);

		this.wilson.ctx.lineTo(
			this.coordinates[row1][col1][0] * (1 - newT) + this.coordinates[row2][col2][0] * newT,
			this.coordinates[row1][col1][1] * (1 - newT) + this.coordinates[row2][col2][1] * newT
		);

		this.wilson.ctx.stroke();



		// The reflected ones. Note that by reflecting the
		// right path from before, we get the reflected left path.

		col1 = row1 - col1;
		col2 = row2 - col2;

		this.wilson.ctx.strokeStyle = convertColor(
			this.colors[row1][col1][0] * (1 - oldT) + this.colors[row2][col2][0] * oldT,
			this.colors[row1][col1][1] * (1 - oldT) + this.colors[row2][col2][1] * oldT,
			this.colors[row1][col1][2] * (1 - oldT) + this.colors[row2][col2][2] * oldT
		);

		this.wilson.ctx.beginPath();

		this.wilson.ctx.moveTo(
			this.coordinates[row1][col1][0] * (1 - oldT) + this.coordinates[row2][col2][0] * oldT,
			this.coordinates[row1][col1][1] * (1 - oldT) + this.coordinates[row2][col2][1] * oldT
		);

		this.wilson.ctx.lineTo(
			this.coordinates[row1][col1][0] * (1 - newT) + this.coordinates[row2][col2][0] * newT,
			this.coordinates[row1][col1][1] * (1 - newT) + this.coordinates[row2][col2][1] * newT
		);

		this.wilson.ctx.stroke();



		col2++;

		this.wilson.ctx.strokeStyle = convertColor(
			this.colors[row1][col1][0] * (1 - oldT) + this.colors[row2][col2][0] * oldT,
			this.colors[row1][col1][1] * (1 - oldT) + this.colors[row2][col2][1] * oldT,
			this.colors[row1][col1][2] * (1 - oldT) + this.colors[row2][col2][2] * oldT
		);

		this.wilson.ctx.beginPath();

		this.wilson.ctx.moveTo(
			this.coordinates[row1][col1][0] * (1 - oldT) + this.coordinates[row2][col2][0] * oldT,
			this.coordinates[row1][col1][1] * (1 - oldT) + this.coordinates[row2][col2][1] * oldT
		);

		this.wilson.ctx.lineTo(
			this.coordinates[row1][col1][0] * (1 - newT) + this.coordinates[row2][col2][0] * newT,
			this.coordinates[row1][col1][1] * (1 - newT) + this.coordinates[row2][col2][1] * newT
		);

		this.wilson.ctx.stroke();
	}

	switchFullscreen()
	{
		this.resume();
	}

	async beforeSwitchFullscreen()
	{
		this.animationPaused = true;

		await new Promise(resolve => setTimeout(resolve, 33));
	}
}