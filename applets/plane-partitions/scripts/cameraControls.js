import anime from "/scripts/anime.js";
import { changeOpacity } from "/scripts/src/animation.js";
import { convertColor } from "/scripts/src/browser.js";

export async function showHexView()
{
	if (this.currentlyAnimatingCamera)
	{
		return;
	}

	this.currentlyAnimatingCamera = true;

	if (this.in2dView)
	{
		await changeOpacity({
			element: this.wilsonNumbers.canvas,
			opacity: 0,
			duration: this.animationTime / 5
		});
	}

	this.in2dView = false;
	this.inExactHexView = true;



	this.updateCameraHeight(true);

	const dummy = { t: this.wilsonNumbers.worldCenterX };

	await Promise.all([
		anime({
			targets: this.orthographicCamera.rotation,
			x: -0.785398163,
			y: 0.615479709,
			z: 0.523598775,
			duration: this.animationTime,
			easing: "easeInOutQuad",
		}).finished,

		anime({
			targets: dummy,
			t: 0,
			duration: this.animationTime,
			easing: "easeInOutQuad",
			update: () =>
			{
				this.wilsonNumbers.resizeWorld({
					centerX: dummy.t
				});
			}
		}).finished
	]
		.concat(
			this.arrays.map(array =>
			{
				return anime({
					targets: array.cubeGroup.rotation,
					y: 0,
					duration: this.animationTime,
					easing: "easeInOutQuad"
				}).finished;
			}),

			this.arrays.map(array =>
			{
				return anime({
					targets: array.cubeGroup.position,
					x: array.centerOffset,
					y: 0,
					z: -array.centerOffset,
					duration: this.animationTime,
					easing: "easeInOutQuad"
				}).finished;
			})
		)
	);

	this.wilsonNumbers.useInteractionForPanAndZoom = true;

	this.currentlyAnimatingCamera = false;
}

export async function show2dView()
{
	if (this.currentlyAnimatingCamera || this.in2dView)
	{
		return;
	}


	if (this.dimersShown)
	{
		await this.hideDimers();
	}



	this.currentlyAnimatingCamera = true;

	this.in2dView = true;
	this.inExactHexView = false;



	this.updateCameraHeight(true);

	const dummy = { t: this.wilsonNumbers.worldCenterX };

	await Promise.all([
		anime({
			targets: this.orthographicCamera.rotation,
			x: -1.570796327,
			y: 0,
			z: 0,
			duration: this.animationTime,
			easing: "easeInOutQuad"
		}).finished,

		anime({
			targets: dummy,
			t: 0,
			duration: this.animationTime,
			easing: "easeInOutQuad",
			update: () =>
			{
				this.wilsonNumbers.resizeWorld({
					centerX: dummy.t
				});
			}
		}).finished
	]
		.concat(
			this.arrays.map(array =>
			{
				return anime({
					targets: array.cubeGroup.rotation,
					y: 0,
					duration: this.animationTime,
					easing: "easeInOutQuad"
				}).finished;
			}),

			this.arrays.map(array =>
			{
				return anime({
					targets: array.cubeGroup.position,
					x: array.centerOffset,
					y: 0,
					z: 0,
					duration: this.animationTime,
					easing: "easeInOutQuad"
				}).finished;
			})
		)
	);

	this.wilsonNumbers.useInteractionForPanAndZoom = false;



	this.drawAll2dViewText();

	await changeOpacity({
		element: this.wilsonNumbers.canvas,
		opacity: 1,
		duration: this.animationTime / 5
	});

	this.currentlyAnimatingCamera = false;
}



// Makes sure everything is in frame but doesn't affect rotation.
export async function updateCameraHeight(force = false)
{
	if (!force)
	{
		if (this.currentlyAnimatingCamera)
		{
			return;
		}

		this.currentlyAnimatingCamera = true;
	}



	this.totalArrayHeight = 0;

	for (let i = 0; i < this.arrays.length; i++)
	{
		this.totalArrayHeight = Math.max(this.totalArrayHeight, this.arrays[i].height);
	}

	this.totalArraySize = Math.max(this.totalArrayFootprint, this.totalArrayHeight);



	const hexViewCameraOffset = this.abConfigMode ? 0 : (
		-this.arrays[0].footprint / 2
		+ this.arrays[this.arrays.length - 1].centerOffset
		+ this.arrays[this.arrays.length - 1].footprint / 2
	) / 2;

	this.hexViewCameraPos = [
		this.totalArraySize + hexViewCameraOffset,
		this.totalArraySize + this.totalArrayHeight / 3,
		this.totalArraySize - hexViewCameraOffset
	];

	if (this.abConfigMode)
	{
		this.hexViewCameraPos[0] += 10;
		this.hexViewCameraPos[1] += 7;
		this.hexViewCameraPos[2] += 10;
	}

	this._2dViewCameraPos = [hexViewCameraOffset, this.totalArraySize + 10, 0];

	if (this.in2dView)
	{
		await Promise.all([
			anime({
				targets: this.orthographicCamera.position,
				x: this._2dViewCameraPos[0],
				y: this._2dViewCameraPos[1],
				z: this._2dViewCameraPos[2],
				duration: this.animationTime,
				easing: "easeInOutQuad",
				update: () => this.needNewFrame = true,
				complete: () => this.needNewFrame = true
			}).finished,

			anime({
				targets: this.orthographicCamera,
				left: -(this.totalArrayFootprint / 2 + .5),
				right: this.totalArrayFootprint / 2 + .5,
				top: this.totalArrayFootprint / 2 + .5,
				bottom: -(this.totalArrayFootprint / 2 + .5),
				duration: this.animationTime,
				easing: "easeInOutQuad",
				update: () =>
				{
					this.orthographicCamera.updateProjectionMatrix();
					this.needNewFrame = true;
				},
				complete: () =>
				{
					this.orthographicCamera.updateProjectionMatrix();
					this.needNewFrame = true;
				}
			}).finished
		]);

		this.orthographicCamera.updateProjectionMatrix();
		this.currentlyAnimatingCamera = false;

		this.drawAll2dViewText();

		changeOpacity({
			element: this.wilsonNumbers.canvas,
			opacity: 1,
			duration: this.animationTime / 5
		});
	}

	else
	{
		const cameraBound = this.abConfigMode ? 5.65 : this.totalArraySize;

		await Promise.all([
			anime({
				targets: this.orthographicCamera.position,
				x: this.hexViewCameraPos[0],
				y: this.hexViewCameraPos[1],
				z: this.hexViewCameraPos[2],
				duration: this.animationTime,
				easing: "easeInOutQuad",
				update: () => this.needNewFrame = true,
				complete: () => this.needNewFrame = true
			}).finished,

			anime({
				targets: this.orthographicCamera,
				left: -cameraBound,
				right: cameraBound,
				top: cameraBound,
				bottom: -cameraBound,
				duration: this.animationTime,
				easing: "easeInOutQuad",
				update: () =>
				{
					this.orthographicCamera.updateProjectionMatrix();
					this.needNewFrame = true;
				},
				complete: () =>
				{
					this.orthographicCamera.updateProjectionMatrix();
					this.needNewFrame = true;
				}
			}).finished
		]);

		this.orthographicCamera.updateProjectionMatrix();
		this.currentlyAnimatingCamera = false;
	}
}



export async function showDimers()
{
	if (this.currentlyAnimatingCamera)
	{
		return;
	}

	this.dimersShown = true;



	if (!this.inExactHexView)
	{
		await this.showHexView();
	}

	this.currentlyAnimatingCamera = true;



	const targets = [];

	// Hide everything not visible by the camera.
	this.arrays.forEach(array =>
	{
		for (let i = 0; i < array.footprint; i++)
		{
			for (let j = 0; j < array.footprint; j++)
			{
				for (let k = 0; k < array.cubes[i][j].length; k++)
				{
					// Remove the top face.
					if (k < array.cubes[i][j].length - 1)
					{
						targets.push(array.cubes[i][j][k].material[2]);
					}

					// The left face.
					if (i < array.footprint - 1 && array.cubes[i + 1][j].length >= k + 1)
					{
						targets.push(array.cubes[i][j][k].material[4]);
					}

					// The right face.
					if (j < array.footprint - 1 && array.cubes[i][j + 1].length >= k + 1)
					{
						targets.push(array.cubes[i][j][k].material[0]);
					}

					targets.push(array.cubes[i][j][k].material[1]);
					targets.push(array.cubes[i][j][k].material[3]);
					targets.push(array.cubes[i][j][k].material[5]);

					if (this.abConfigMode && i === 0)
					{
						targets.push(array.rightWall[j][k].material[4]);
					}

					if (this.abConfigMode && j === 0)
					{
						targets.push(array.leftWall[i][k].material[0]);
					}
				}

				if (array.cubes[i][j].length !== 0)
				{
					targets.push(array.floor[i][j].material[2]);
				}
			}
		}
	});

	targets.forEach(material => material.opacity = 0);



	const updateAlpha = () =>
	{
		this.wilsonHidden.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.wilsonHidden.ctx._alpha
		);
		this.wilsonHidden.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden.ctx.fillStyle = convertColor(
			128,
			128,
			128,
			this.wilsonHidden.ctx._alpha
		);
		this.wilsonHidden.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden.ctx.moveTo(42.7, 21.3);
		this.wilsonHidden.ctx.lineTo(21.3, 42.7);
		this.wilsonHidden.ctx.stroke();

		this.cubeTexture.needsUpdate = true;



		this.wilsonHidden2.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden2.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.wilsonHidden2.ctx._alpha
		);
		this.wilsonHidden2.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden2.ctx.fillStyle = convertColor(
			128,
			128,
			128,
			this.wilsonHidden2.ctx._alpha
		);
		this.wilsonHidden2.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden2.ctx.moveTo(21.3, 21.3);
		this.wilsonHidden2.ctx.lineTo(42.7, 42.7);
		this.wilsonHidden2.ctx.stroke();

		this.cubeTexture2.needsUpdate = true;



		this.wilsonHidden3.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden3.ctx.fillStyle = convertColor(
			32,
			32,
			32,
			this.abConfigMode ? this.wilsonHidden3.ctx._alpha : 0
		);
		this.wilsonHidden3.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden3.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.abConfigMode ? this.wilsonHidden3.ctx._alpha : 0
		);
		this.wilsonHidden3.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden3.ctx.moveTo(42.7, 21.3);
		this.wilsonHidden3.ctx.lineTo(21.3, 42.7);
		this.wilsonHidden3.ctx.stroke();

		this.floorTexture.needsUpdate = true;



		this.wilsonHidden4.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden4.ctx.fillStyle = convertColor(
			32,
			32,
			32,
			this.abConfigMode ? this.wilsonHidden4.ctx._alpha : 0
		);
		this.wilsonHidden4.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden4.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.abConfigMode ? this.wilsonHidden4.ctx._alpha : 0
		);
		this.wilsonHidden4.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden4.ctx.moveTo(21.3, 21.3);
		this.wilsonHidden4.ctx.lineTo(42.7, 42.7);
		this.wilsonHidden4.ctx.stroke();

		this.floorTexture2.needsUpdate = true;

		this.needNewFrame = true;
	};



	await anime({
		targets: [
			this.wilsonHidden.ctx,
			this.wilsonHidden2.ctx,
			this.wilsonHidden3.ctx,
			this.wilsonHidden4.ctx
		],
		// Necessary to make three.js animate correctly.
		strokeStyle: "rgba(255, 255, 255, 1)",
		_alpha: 0,
		duration: this.animationTime / 2,
		easing: "easeOutQuad",
		update: updateAlpha,
		complete: updateAlpha
	}).finished;

	this.currentlyAnimatingCamera = false;
}



export async function hideDimers()
{
	if (this.currentlyAnimatingCamera)
	{
		return;
	}

	this.currentlyAnimatingCamera = true;

	this.dimersShown = false;



	const targets = [];

	// Show everything not visible by the camera.
	this.arrays.forEach(array =>
	{
		for (let i = 0; i < array.footprint; i++)
		{
			for (let j = 0; j < array.footprint; j++)
			{
				for (let k = 0; k < array.cubes[i][j].length; k++)
				{
					// Remove the top face.
					if (k < array.cubes[i][j].length - 1)
					{
						targets.push(array.cubes[i][j][k].material[2]);
					}

					// The left face.
					if (i < array.footprint - 1 && array.cubes[i + 1][j].length >= k + 1)
					{
						targets.push(array.cubes[i][j][k].material[4]);
					}

					// The right face.
					if (j < array.footprint - 1 && array.cubes[i][j + 1].length >= k + 1)
					{
						targets.push(array.cubes[i][j][k].material[0]);
					}

					targets.push(array.cubes[i][j][k].material[1]);
					targets.push(array.cubes[i][j][k].material[3]);
					targets.push(array.cubes[i][j][k].material[5]);
				}

				if (array.cubes[i][j].length !== 0)
				{
					targets.push(array.floor[i][j].material[2]);
				}
			}
		}



		if (this.abConfigMode)
		{
			for (let i = 0; i < this.wallWidth; i++)
			{
				for (let j = 0; j < this.wallHeight; j++)
				{
					targets.push(array.leftWall[i][j].material[0]);
					targets.push(array.rightWall[i][j].material[4]);
				}
			}
		}
	});

	const updateAlpha = () =>
	{
		this.wilsonHidden.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.wilsonHidden.ctx._alpha
		);
		this.wilsonHidden.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden.ctx.fillStyle = convertColor(
			128,
			128,
			128,
			this.wilsonHidden.ctx._alpha
		);
		this.wilsonHidden.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden.ctx.moveTo(42.7, 21.3);
		this.wilsonHidden.ctx.lineTo(21.3, 42.7);
		this.wilsonHidden.ctx.stroke();

		this.cubeTexture.needsUpdate = true;



		this.wilsonHidden2.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden2.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.wilsonHidden2.ctx._alpha
		);
		this.wilsonHidden2.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden2.ctx.fillStyle = convertColor(
			128,
			128,
			128,
			this.wilsonHidden2.ctx._alpha
		);
		this.wilsonHidden2.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden2.ctx.moveTo(21.3, 21.3);
		this.wilsonHidden2.ctx.lineTo(42.7, 42.7);
		this.wilsonHidden2.ctx.stroke();

		this.cubeTexture2.needsUpdate = true;



		this.wilsonHidden3.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden3.ctx.fillStyle = convertColor(
			32,
			32,
			32,
			this.abConfigMode ? this.wilsonHidden3.ctx._alpha : 0
		);
		this.wilsonHidden3.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden3.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.abConfigMode ? this.wilsonHidden3.ctx._alpha : 0
		);
		this.wilsonHidden3.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden3.ctx.moveTo(42.7, 21.3);
		this.wilsonHidden3.ctx.lineTo(21.3, 42.7);
		this.wilsonHidden3.ctx.stroke();

		this.floorTexture.needsUpdate = true;



		this.wilsonHidden4.ctx.clearRect(0, 0, 64, 64);

		this.wilsonHidden4.ctx.fillStyle = convertColor(
			32,
			32,
			32,
			this.abConfigMode ? this.wilsonHidden4.ctx._alpha : 0
		);
		this.wilsonHidden4.ctx.fillRect(0, 0, 64, 64);

		this.wilsonHidden4.ctx.fillStyle = convertColor(
			64,
			64,
			64,
			this.abConfigMode ? this.wilsonHidden4.ctx._alpha : 0
		);
		this.wilsonHidden4.ctx.fillRect(4, 4, 56, 56);

		this.wilsonHidden4.ctx.moveTo(21.3, 21.3);
		this.wilsonHidden4.ctx.lineTo(42.7, 42.7);
		this.wilsonHidden4.ctx.stroke();

		this.floorTexture2.needsUpdate = true;

		this.needNewFrame = true;
	};

	await anime({
		targets: [
			this.wilsonHidden.ctx,
			this.wilsonHidden2.ctx,
			this.wilsonHidden3.ctx,
			this.wilsonHidden4.ctx
		],
		// Necessary to make three.js animate correctly.
		strokeStyle:  "rgba(255, 255, 255, 0)",
		_alpha: 1,
		duration: this.animationTime / 2,
		easing: "easeOutQuad",
		update: updateAlpha,
		complete: updateAlpha
	}).finished;

	targets.forEach(material => material.opacity = 1);

	this.currentlyAnimatingCamera = false;
}