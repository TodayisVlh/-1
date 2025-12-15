import { HandMetrics } from '../types';

// MediaPipe Landmark Indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_FINGER_MCP = 5;
const INDEX_FINGER_PIP = 6;
const INDEX_FINGER_DIP = 7;
const INDEX_FINGER_TIP = 8;
const MIDDLE_FINGER_MCP = 9;
const MIDDLE_FINGER_PIP = 10;
const MIDDLE_FINGER_DIP = 11;
const MIDDLE_FINGER_TIP = 12;
const RING_FINGER_MCP = 13;
const RING_FINGER_PIP = 14;
const RING_FINGER_DIP = 15;
const RING_FINGER_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

/**
 * Calculates Euclidean distance between two 3D points
 */
const distance = (p1: any, p2: any) => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
  );
};

export const analyzeHand = (landmarks: any[]): HandMetrics => {
  let fingerCount = 0;
  
  // 1. Determine Finger Count (Extended Fingers)
  
  // Thumb: Compare TIP x to IP x (dependent on handedness, simplistic check here assumes palm facing camera)
  // A more robust check for thumb is checking if tip is far from palm center relative to MCP
  const isThumbExtended = distance(landmarks[THUMB_TIP], landmarks[PINKY_MCP]) > distance(landmarks[THUMB_IP], landmarks[PINKY_MCP]);
  
  // For other fingers, check if TIP is above PIP (y coordinate is inverted in computer vision, 0 is top)
  // Actually, MediaPipe y increases downwards. So TIP.y < PIP.y means extended upwards.
  // However, hand can be rotated. Better to use distance from Wrist.
  const wrist = landmarks[WRIST];
  
  const isIndexExtended = distance(landmarks[INDEX_FINGER_TIP], wrist) > distance(landmarks[INDEX_FINGER_PIP], wrist);
  const isMiddleExtended = distance(landmarks[MIDDLE_FINGER_TIP], wrist) > distance(landmarks[MIDDLE_FINGER_PIP], wrist);
  const isRingExtended = distance(landmarks[RING_FINGER_TIP], wrist) > distance(landmarks[RING_FINGER_PIP], wrist);
  const isPinkyExtended = distance(landmarks[PINKY_TIP], wrist) > distance(landmarks[PINKY_PIP], wrist);

  if (isThumbExtended) fingerCount++;
  if (isIndexExtended) fingerCount++;
  if (isMiddleExtended) fingerCount++;
  if (isRingExtended) fingerCount++;
  if (isPinkyExtended) fingerCount++;

  // 2. Detect Fist
  // A fist is roughly 0 extended fingers, or specifically all fingertips close to palm base.
  // We'll use a strict definition: 0 or 1 finger (thumb might be loose) and tips are close to base.
  const isFist = fingerCount === 0 || (fingerCount === 1 && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended);

  // 3. Position (Center of Palm approx by Wrist or Middle MCP)
  const position = {
    x: landmarks[9].x, // Middle Finger MCP is a stable center point
    y: landmarks[9].y,
    z: landmarks[9].z, 
  };

  // 4. Palm Depth (scale factor)
  // We can use the distance between Wrist and Middle Finger MCP as a proxy for how close the hand is.
  // Larger distance in screen coordinates = closer hand.
  const palmSize = distance(landmarks[WRIST], landmarks[MIDDLE_FINGER_MCP]);

  return {
    fingerCount,
    isFist,
    position,
    palmDepth: palmSize, 
  };
};