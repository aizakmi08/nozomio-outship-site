const root = document.documentElement;
const panels = [...document.querySelectorAll("[data-panel]")];
const cook = document.querySelector(".cook");
const sequence = document.querySelector("#cook-sequence");
const canvas = document.querySelector("#cook-canvas");
const context = canvas?.getContext("2d", { alpha: false });
const offerStage = document.querySelector(".offer__stage");
const yesButton = document.querySelector(".offer__button--yes");
const noButton = document.querySelector(".offer__button--no");

const FRAME_COUNT = 661;
const FRAME_PATH = "./assets/frames/cook";
const FRAME_REVISION = "person-cutout-box-mask-v47";
const SEQUENCE_HOLD_START = 0.975;
const frames = new Array(FRAME_COUNT);
let desiredFrame = 0;
let renderedFrame = -1;
let pixelRatio = 1;
let noButtonX = 0;
let noButtonY = 0;
let noVelocityX = 0;
let noVelocityY = 0;
let noAnimationFrame = 0;
let noPointer = null;
let noPointerVelocityX = 0;
let noPointerVelocityY = 0;
let noLastPointer = null;
let noEscapeKick = 0;
let noLastFrameTime = 0;
let noBaseLeft = 0;
let noBaseTop = 0;
let noFloating = false;

const reveal = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    }
  },
  { threshold: 0.35 }
);

for (const panel of panels) reveal.observe(panel);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smooth = (value) => {
  const next = clamp(value, 0, 1);
  return next * next * (3 - 2 * next);
};

const frameUrl = (index) =>
  `${FRAME_PATH}/frame-${String(index).padStart(3, "0")}.webp?${FRAME_REVISION}`;

const resizeCanvas = () => {
  if (!canvas || !context) return;

  const rect = canvas.getBoundingClientRect();
  const nextRatio = window.devicePixelRatio || 1;
  const nextWidth = Math.max(1, Math.round(rect.width * nextRatio));
  const nextHeight = Math.max(1, Math.round(rect.height * nextRatio));

  if (canvas.width === nextWidth && canvas.height === nextHeight && pixelRatio === nextRatio) {
    return;
  }

  pixelRatio = nextRatio;
  canvas.width = nextWidth;
  canvas.height = nextHeight;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  renderedFrame = -1;
};

const loadFrame = (index) => {
  if (!canvas || !context) return Promise.resolve(null);
  if (frames[index]?.promise) return frames[index].promise;

  const image = new Image();
  image.decoding = "async";
  const promise = new Promise((resolve, reject) => {
    image.onload = () => {
      frames[index].loaded = true;
      resolve(image);
    };
    image.onerror = reject;
  });

  frames[index] = { image, loaded: false, promise };
  image.src = frameUrl(index);
  return promise;
};

const getDrawRect = (width, height, imageWidth, imageHeight) => {
  const imageRatio = imageWidth / imageHeight;

  if (imageRatio > 1.65) {
    return { x: 0, y: 0, width, height };
  }

  const portraitWidth = height * 0.5625;

  if (imageRatio < 0.85) {
    return {
      x: (width - portraitWidth) / 2,
      y: 0,
      width: portraitWidth,
      height,
    };
  }

  const photoHeight = portraitWidth * 0.75;
  return {
    x: (width - portraitWidth) / 2,
    y: (height - photoHeight) / 2,
    width: portraitWidth,
    height: photoHeight,
  };
};

const drawImageCover = (image, rect, imageWidth, imageHeight) => {
  const scale = Math.max(rect.width / imageWidth, rect.height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  context.drawImage(
    image,
    rect.x + (rect.width - drawWidth) / 2,
    rect.y + (rect.height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
};

const drawFrame = (index) => {
  const entry = frames[index];
  if (!canvas || !context || !entry?.loaded || renderedFrame === index) return;

  resizeCanvas();
  const width = canvas.width / pixelRatio;
  const height = canvas.height / pixelRatio;
  const image = entry.image;

  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);

  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const rect = getDrawRect(width, height, imageWidth, imageHeight);
  drawImageCover(image, rect, imageWidth, imageHeight);

  renderedFrame = index;
};

const requestFrame = (index) => {
  desiredFrame = index;
  const entry = frames[index];

  if (entry?.loaded) {
    drawFrame(index);
    return;
  }

  loadFrame(index)
    .then(() => {
      if (desiredFrame === index) drawFrame(index);
    })
    .catch(() => {});
};

const warmFrameWindow = (center) => {
  for (let offset = -2; offset <= 5; offset += 1) {
    const index = center + offset;
    if (index >= 0 && index < FRAME_COUNT) loadFrame(index).catch(() => {});
  }
};

const warmAllFrames = () => {
  if (!canvas || !context) return;
  let index = 1;
  const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 16));
  const loadChunk = () => {
    const end = Math.min(index + 5, FRAME_COUNT);
    for (; index < end; index += 1) loadFrame(index).catch(() => {});
    if (index < FRAME_COUNT) schedule(loadChunk);
  };
  schedule(loadChunk);
};

const setNoButtonPosition = (x, y) => {
  noButtonX = x;
  noButtonY = y;
  noButton.style.setProperty("--no-x", `${x.toFixed(2)}px`);
  noButton.style.setProperty("--no-y", `${y.toFixed(2)}px`);
};

const ensureNoFloating = () => {
  if (!noButton || noFloating) return;

  const rect = noButton.getBoundingClientRect();
  noBaseLeft = rect.left;
  noBaseTop = rect.top;
  noButton.style.setProperty("--no-base-left", `${noBaseLeft.toFixed(2)}px`);
  noButton.style.setProperty("--no-base-top", `${noBaseTop.toFixed(2)}px`);
  document.body.appendChild(noButton);
  noButton.classList.add("is-floating");
  noFloating = true;
  setNoButtonPosition(0, 0);
};

const getNoButtonLayout = () => {
  const isFloating = noFloating || noButton.classList.contains("is-floating");
  const stageRect = isFloating
    ? {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      }
    : offerStage.getBoundingClientRect();
  const yesRect = yesButton.getBoundingClientRect();
  const baseLeft = isFloating ? noBaseLeft : noButton.offsetLeft;
  const baseTop = isFloating ? noBaseTop : noButton.offsetTop;
  const buttonWidth = noButton.offsetWidth;
  const buttonHeight = noButton.offsetHeight;
  const margin = isFloating ? 14 : 0;

  return {
    stageRect,
    yesRect: {
      left: yesRect.left - stageRect.left,
      right: yesRect.right - stageRect.left,
      top: yesRect.top - stageRect.top,
      bottom: yesRect.bottom - stageRect.top,
    },
    baseLeft,
    baseTop,
    buttonWidth,
    buttonHeight,
    minX: margin - baseLeft,
    maxX: stageRect.width - buttonWidth - baseLeft - margin,
    minY: margin - baseTop,
    maxY: stageRect.height - buttonHeight - baseTop - margin,
  };
};

const overlapsYesButton = (x, y, layout, padding = 14) => {
  const candidate = {
    left: layout.baseLeft + x,
    right: layout.baseLeft + x + layout.buttonWidth,
    top: layout.baseTop + y,
    bottom: layout.baseTop + y + layout.buttonHeight,
  };

  return (
    candidate.left < layout.yesRect.right + padding &&
    candidate.right > layout.yesRect.left - padding &&
    candidate.top < layout.yesRect.bottom + padding &&
    candidate.bottom > layout.yesRect.top - padding
  );
};

const clampNoPosition = (x, y, layout) => [
  clamp(x, layout.minX, layout.maxX),
  clamp(y, layout.minY, layout.maxY),
];

const isPointerNearStage = (event, stageRect, padding = 150) =>
  event.clientX >= stageRect.left - padding &&
  event.clientX <= stageRect.right + padding &&
  event.clientY >= stageRect.top - padding &&
  event.clientY <= stageRect.bottom + padding;

const getNoCenter = (layout) => ({
  x: layout.baseLeft + noButtonX + layout.buttonWidth / 2,
  y: layout.baseTop + noButtonY + layout.buttonHeight / 2,
});

const getBestClearPosition = (pointer, layout, clearance) => {
  const center = getNoCenter(layout);
  let dx = center.x - pointer.x;
  let dy = center.y - pointer.y;
  let distance = Math.hypot(dx, dy);

  if (distance < 1) {
    const roomRight = layout.stageRect.width - center.x;
    const roomLeft = center.x;
    const roomBottom = layout.stageRect.height - center.y;
    const roomTop = center.y;
    dx = roomRight >= roomLeft ? 1 : -1;
    dy = roomBottom >= roomTop ? 0.7 : -0.7;
    distance = Math.hypot(dx, dy);
  }

  const desiredCenterX = pointer.x + (dx / distance) * clearance;
  const desiredCenterY = pointer.y + (dy / distance) * clearance;
  const desiredX = desiredCenterX - layout.buttonWidth / 2 - layout.baseLeft;
  const desiredY = desiredCenterY - layout.buttonHeight / 2 - layout.baseTop;
  let [bestX, bestY] = applyNoBounds(desiredX, desiredY, layout);
  [bestX, bestY] = avoidYesOverlap(bestX, bestY, layout);

  const bestCenter = {
    x: layout.baseLeft + bestX + layout.buttonWidth / 2,
    y: layout.baseTop + bestY + layout.buttonHeight / 2,
  };
  let bestDistance = Math.hypot(bestCenter.x - pointer.x, bestCenter.y - pointer.y);

  if (bestDistance >= clearance * 0.82) return [bestX, bestY];

  const candidates = [
    [layout.minX, layout.minY],
    [layout.maxX, layout.minY],
    [layout.minX, layout.maxY],
    [layout.maxX, layout.maxY],
    [(layout.minX + layout.maxX) / 2, layout.minY],
    [(layout.minX + layout.maxX) / 2, layout.maxY],
    [layout.minX, (layout.minY + layout.maxY) / 2],
    [layout.maxX, (layout.minY + layout.maxY) / 2],
  ];

  for (const candidate of candidates) {
    let [candidateX, candidateY] = applyNoBounds(candidate[0], candidate[1], layout);
    [candidateX, candidateY] = avoidYesOverlap(candidateX, candidateY, layout);
    const candidateCenter = {
      x: layout.baseLeft + candidateX + layout.buttonWidth / 2,
      y: layout.baseTop + candidateY + layout.buttonHeight / 2,
    };
    const pointerDistance = Math.hypot(candidateCenter.x - pointer.x, candidateCenter.y - pointer.y);
    const currentDistance = Math.hypot(candidateX - noButtonX, candidateY - noButtonY);
    const score = pointerDistance - currentDistance * 0.04;

    if (score > bestDistance) {
      bestDistance = score;
      bestX = candidateX;
      bestY = candidateY;
    }
  }

  return [bestX, bestY];
};

const applyNoBounds = (x, y, layout) => {
  let nextX = x;
  let nextY = y;

  if (nextX < layout.minX) {
    nextX = layout.minX;
    noVelocityX = Math.max(0, noVelocityX) * 0.18;
  } else if (nextX > layout.maxX) {
    nextX = layout.maxX;
    noVelocityX = Math.min(0, noVelocityX) * 0.18;
  }

  if (nextY < layout.minY) {
    nextY = layout.minY;
    noVelocityY = Math.max(0, noVelocityY) * 0.18;
  } else if (nextY > layout.maxY) {
    nextY = layout.maxY;
    noVelocityY = Math.min(0, noVelocityY) * 0.18;
  }

  return [nextX, nextY];
};

const avoidYesOverlap = (x, y, layout, padding = 18) => {
  const candidate = {
    left: layout.baseLeft + x,
    right: layout.baseLeft + x + layout.buttonWidth,
    top: layout.baseTop + y,
    bottom: layout.baseTop + y + layout.buttonHeight,
  };
  const forbidden = {
    left: layout.yesRect.left - padding,
    right: layout.yesRect.right + padding,
    top: layout.yesRect.top - padding,
    bottom: layout.yesRect.bottom + padding,
  };
  const isOverlapping =
    candidate.left < forbidden.right &&
    candidate.right > forbidden.left &&
    candidate.top < forbidden.bottom &&
    candidate.bottom > forbidden.top;

  if (!isOverlapping) return [x, y];

  const escapes = [
    { axis: "x", delta: forbidden.right - candidate.left },
    { axis: "y", delta: forbidden.bottom - candidate.top },
    { axis: "y", delta: forbidden.top - candidate.bottom },
    { axis: "x", delta: forbidden.left - candidate.right },
  ].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

  for (const escape of escapes) {
    const candidateX = escape.axis === "x" ? x + escape.delta : x;
    const candidateY = escape.axis === "y" ? y + escape.delta : y;
    const [boundedX, boundedY] = applyNoBounds(candidateX, candidateY, layout);
    if (!overlapsYesButton(boundedX, boundedY, layout, padding)) {
      return [boundedX, boundedY];
    }
  }

  return applyNoBounds(layout.yesRect.right + padding - layout.baseLeft, y, layout);
};

const addObstacleForce = (force, center, obstacle, padding = 24) => {
  const expanded = {
    left: obstacle.left - padding,
    right: obstacle.right + padding,
    top: obstacle.top - padding,
    bottom: obstacle.bottom + padding,
  };
  const nearestX = clamp(center.x, expanded.left, expanded.right);
  const nearestY = clamp(center.y, expanded.top, expanded.bottom);
  let dx = center.x - nearestX;
  let dy = center.y - nearestY;
  let distance = Math.hypot(dx, dy);

  if (distance > 42) return;
  if (distance < 1) {
    dx = center.x >= (expanded.left + expanded.right) / 2 ? 1 : -1;
    dy = center.y >= (expanded.top + expanded.bottom) / 2 ? 0.45 : -0.45;
    distance = Math.hypot(dx, dy);
  }

  const pressure = 1 - clamp(distance / 42, 0, 1);
  force.x += (dx / distance) * (7 + pressure * 16);
  force.y += (dy / distance) * (5 + pressure * 12);
};

const updateNoPointer = (event) => {
  const time = event.timeStamp || performance.now();

  if (noLastPointer) {
    const elapsed = Math.max(8, time - noLastPointer.time);
    const nextVelocityX = (event.clientX - noLastPointer.clientX) / elapsed;
    const nextVelocityY = (event.clientY - noLastPointer.clientY) / elapsed;
    noPointerVelocityX = noPointerVelocityX * 0.55 + nextVelocityX * 0.45;
    noPointerVelocityY = noPointerVelocityY * 0.55 + nextVelocityY * 0.45;
  }

  noLastPointer = {
    clientX: event.clientX,
    clientY: event.clientY,
    time,
  };
  noPointer = {
    clientX: event.clientX,
    clientY: event.clientY,
  };
};

const enforceNoClearance = (event, clearanceBoost = 0) => {
  if (!offerStage || !yesButton || !noButton) return false;

  ensureNoFloating();
  const layout = getNoButtonLayout();
  const pointer = {
    x: event.clientX - layout.stageRect.left,
    y: event.clientY - layout.stageRect.top,
  };
  const center = getNoCenter(layout);
  const clearance = Math.min(
    225,
    Math.max(175, Math.hypot(layout.buttonWidth, layout.buttonHeight) * 0.82 + clearanceBoost)
  );
  const distance = Math.hypot(center.x - pointer.x, center.y - pointer.y);

  if (distance >= clearance) return false;

  const [clearX, clearY] = getBestClearPosition(pointer, layout, clearance);
  const correctionX = clearX - noButtonX;
  const correctionY = clearY - noButtonY;
  setNoButtonPosition(clearX, clearY);
  noVelocityX = correctionX * 0.025;
  noVelocityY = correctionY * 0.025;
  noPointerVelocityX = 0;
  noPointerVelocityY = 0;
  noEscapeKick = Math.max(noEscapeKick, 0.85);
  startNoButtonAnimation();
  return true;
};

const animateNoButton = (time = 0) => {
  noAnimationFrame = 0;
  if (!offerStage || !yesButton || !noButton) return;

  const elapsed = noLastFrameTime ? clamp((time - noLastFrameTime) / 16.67, 0.45, 1.35) : 1;
  noLastFrameTime = time;
  const layout = getNoButtonLayout();
  const center = getNoCenter(layout);
  const force = { x: 0, y: 0 };
  const avoidRadius = Math.min(620, Math.max(420, layout.stageRect.width * 0.42));

  if (noPointer && isPointerNearStage(noPointer, layout.stageRect, 190)) {
    const predictedClientX = noPointer.clientX + noPointerVelocityX * 150;
    const predictedClientY = noPointer.clientY + noPointerVelocityY * 150;
    const pointer = {
      x: predictedClientX - layout.stageRect.left,
      y: predictedClientY - layout.stageRect.top,
    };
    let dx = center.x - pointer.x;
    let dy = center.y - pointer.y;
    let distance = Math.hypot(dx, dy);

    if (distance < 1) {
      const roomLeft = center.x;
      const roomRight = layout.stageRect.width - center.x;
      const roomTop = center.y;
      const roomBottom = layout.stageRect.height - center.y;
      dx = roomRight >= roomLeft ? 1 : -1;
      dy = roomBottom >= roomTop ? 0.65 : -0.65;
      distance = Math.hypot(dx, dy);
    }

    if (distance < avoidRadius) {
      const pressure = 1 - distance / avoidRadius;
      const push = 2.4 + pressure * pressure * (10.5 + noEscapeKick * 5);
      force.x += (dx / distance) * push;
      force.y += (dy / distance) * push * 0.9;
    }
  }

  addObstacleForce(force, center, layout.yesRect);

  const damping = Math.pow(0.9, elapsed);
  noVelocityX = (noVelocityX + force.x * elapsed) * damping;
  noVelocityY = (noVelocityY + force.y * elapsed) * damping;

  const maxMove = (layout.stageRect.width < 420 ? 9 : 11) * elapsed;
  const moveX = noVelocityX * elapsed;
  const moveY = noVelocityY * elapsed;
  const moveSpeed = Math.hypot(moveX, moveY);
  let stepX = moveX;
  let stepY = moveY;
  if (moveSpeed > maxMove) {
    stepX = (moveX / moveSpeed) * maxMove;
    stepY = (moveY / moveSpeed) * maxMove;
  }

  let [nextX, nextY] = applyNoBounds(noButtonX + stepX, noButtonY + stepY, layout);
  const [cleanX, cleanY] = avoidYesOverlap(nextX, nextY, layout);
  if (cleanX !== nextX) noVelocityX = 0;
  if (cleanY !== nextY) noVelocityY = 0;
  setNoButtonPosition(cleanX, cleanY);

  noEscapeKick *= 0.86;
  const activeForce = Math.hypot(force.x, force.y);
  const activeVelocity = Math.hypot(noVelocityX, noVelocityY);

  if (activeForce > 0.05 || activeVelocity > 0.18 || noEscapeKick > 0.05) {
    noAnimationFrame = requestAnimationFrame(animateNoButton);
  } else {
    noVelocityX = 0;
    noVelocityY = 0;
    noLastFrameTime = 0;
  }
};

const startNoButtonAnimation = () => {
  if (!noAnimationFrame) {
    noLastFrameTime = 0;
    noAnimationFrame = requestAnimationFrame(animateNoButton);
  }
};

const moveNoButtonAway = (event, kick = 1) => {
  ensureNoFloating();
  updateNoPointer(event);
  enforceNoClearance(event, 24);
  noEscapeKick = Math.max(noEscapeKick, kick);
  startNoButtonAnimation();
};

const maybeEvadeNoButton = (event) => {
  if (!offerStage || !noButton) return;

  const stageRect = offerStage.getBoundingClientRect();
  const rect = noButton.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
  const pointerNearOffer = isPointerNearStage(event, stageRect, 260);
  const pointerNearButton = distance < 540;

  if (pointerNearOffer || pointerNearButton || noFloating) {
    ensureNoFloating();
    updateNoPointer(event);
    const corrected = enforceNoClearance(event, 36);
    noEscapeKick = Math.max(noEscapeKick, corrected ? 0.95 : 0.35);
    startNoButtonAnimation();
  }
};

if (noButton) {
  document.addEventListener("pointermove", maybeEvadeNoButton, { passive: true });
  noButton.addEventListener("pointerenter", (event) => moveNoButtonAway(event, 1.25));
  noButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    moveNoButtonAway(event, 1.8);
  });
  noButton.addEventListener("click", (event) => {
    event.preventDefault();
    moveNoButtonAway(event, 1.8);
  });
  noButton.addEventListener("focus", () => {
    const rect = noButton.getBoundingClientRect();
    moveNoButtonAway(
      {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      },
      1.8
    );
    noButton.blur();
  });
}

let ticking = false;

const updateScrollEffects = () => {
  ticking = false;

  const pageRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const pageProgress = clamp(window.scrollY / pageRange, 0, 1);
  const heroProgress = clamp(window.scrollY / (window.innerHeight * 0.92), 0, 1);
  const cookRect = cook.getBoundingClientRect();
  const cookProgress = smooth((window.innerHeight - cookRect.top) / (window.innerHeight * 0.88));
  const sequenceRect = sequence.getBoundingClientRect();
  const sequenceRange = sequenceRect.height - window.innerHeight;
  const sequenceProgress = sequenceRange <= 0 ? 0 : clamp(-sequenceRect.top / sequenceRange, 0, 1);
  const playbackProgress = smooth(clamp(sequenceProgress / SEQUENCE_HOLD_START, 0, 1));
  const sequenceFrame = Math.round(playbackProgress * (FRAME_COUNT - 1));

  root.style.setProperty("--hero-scroll", smooth(heroProgress).toFixed(4));
  root.style.setProperty("--cook-scroll", cookProgress.toFixed(4));
  root.style.setProperty("--sequence-progress", playbackProgress.toFixed(4));
  root.style.setProperty("--page-progress", pageProgress.toFixed(4));
  requestFrame(sequenceFrame);
  warmFrameWindow(sequenceFrame);
};

const requestScrollUpdate = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateScrollEffects);
};

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", () => {
  resizeCanvas();
  requestScrollUpdate();
});
resizeCanvas();
loadFrame(0)
  .then(() => drawFrame(0))
  .then(warmAllFrames)
  .catch(() => {});
updateScrollEffects();
