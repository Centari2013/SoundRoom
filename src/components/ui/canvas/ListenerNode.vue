<template>
  <v-group
    :x="listener.x"
    :y="listener.y"
    @dragmove="onListenerDragMove"
    @mouseover="setCursor($event, 'pointer')"
    @mouseout="setCursor($event, 'default')"
  >
    <!-- Listener Dot -->
    <v-circle
      :radius="10"
      fill="#00f"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
    />

    <!-- Direction Line -->
    <v-line
      :points="[0, 0, 0, 20]"
      stroke="#fff"
      :strokeWidth="2"
      :rotation="listener.angle"
      :hitStrokeWidth="10"
      @mousedown="onHandleMouseDown"
      @mouseup="onHandleMouseUp"
    />
  </v-group>
</template>

<script setup>
const props = defineProps({
  listener: Object,
  actionManager: Object,
  room: Object
});

const listener = props.listener;
const actionManager = props.actionManager;
const room = props.room;

const positionsEqual = (a, b) => a.x === b.x && a.y === b.y;
let moveListenerPayload = null;

let initialMouseAngle = null;
let initialListenerAngle = null;

// --- Cursor Styling ---
function setCursor(e, type) {
  const stage = e.target.getStage();
  if (stage) {
    stage.container().style.cursor = type;
  }
}

// --- Listener Drag Logic ---
function onListenerMouseDown(e) {
  if (e.button === 2) return;

  const group = e.target.getParent();
  group.draggable(true);
  group.startDrag();

  moveListenerPayload = {
    from: { x: listener.x, y: listener.y }
  };
}

function onListenerDragMove(e) {
  const pos = e.target.position();

  const clampedX = room.clamp(pos.x, 0, room.width);
  const clampedY = room.clamp(pos.y, 0, room.height);

  e.target.position({ x: clampedX, y: clampedY });

  listener.x = clampedX;
  listener.y = clampedY;
  listener.updateAudio();
}

function onListenerMouseUp(e) {
  const group = e.target.getParent();
  group.draggable(false);

  const to = { x: listener.x, y: listener.y };

  if (!positionsEqual(moveListenerPayload.from, to)) {
    moveListenerPayload.to = to;
    actionManager.doAction("move_listener", moveListenerPayload);
  }

  moveListenerPayload = null;
}

// --- Rotation Logic ---
actionManager.registerActionHandlers(
  "rotate_listener_angle",
  (payload) => {
    listener.updateAngle(payload.to);
    listener.updateAudio();
  },
  (payload) => {
    listener.updateAngle(payload.from);
    listener.updateAudio();
  }
);

function onHandleMouseDown(e) {
  e.evt.stopPropagation();

  initialListenerAngle = listener.angle;

  const stage = e.target.getStage();
  const mousePos = stage.getPointerPosition();
  const dx = mousePos.x - listener.x;
  const dy = mousePos.y - listener.y;
  initialMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  stage.on("mousemove.listenerRotate", onHandleMouseMove);
  stage.on("mouseup.listenerRotate", () => {
    onHandleMouseUp();
    stage.off("mousemove.listenerRotate");
    stage.off("mouseup.listenerRotate");
  });
}

function onHandleMouseMove(e) {
  const stage = e.target.getStage();
  const mousePos = stage.getPointerPosition();
  const dx = mousePos.x - listener.x;
  const dy = mousePos.y - listener.y;
  const currentMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  const delta = currentMouseAngle - initialMouseAngle;
  const newAngle = initialListenerAngle + delta;

  listener.updateAngle(newAngle);
  listener.updateAudio();
}

function onHandleMouseUp() {
  const finalListenerAngle = listener.angle;

  if (initialListenerAngle !== null && initialListenerAngle !== finalListenerAngle) {
    actionManager.doAction("rotate_listener_angle", {
      from: initialListenerAngle,
      to: finalListenerAngle
    });
  }

  initialListenerAngle = null;
}
</script>
