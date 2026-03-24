import cv2
from ultralytics import YOLO
import supervision as sv
from datetime import datetime, timedelta
import collections

# Load model
model = YOLO("yolov8n.pt")

# Load video
video_path = "video.mp4"
cap = cv2.VideoCapture(video_path)

# Tracker (IMPROVED SETTINGS)
tracker = sv.ByteTrack(
    track_activation_threshold=0.35,
    lost_track_buffer=50,
    minimum_matching_threshold=0.8,
    frame_rate=30
)

# ── Video properties ──────────────────────────────────────────────────────────
width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps    = int(cap.get(cv2.CAP_PROP_FPS)) or 30   # fallback to 30 if unreadable

# Simulated real-world start time (change to match your actual recording time)
VIDEO_START_TIME = datetime(2025, 1, 1, 9, 0, 0)   # e.g. 09:00 AM

# ── Counting / timing data structures ─────────────────────────────────────────
id_frames      = {}   # tracker_id → frame_count of consecutive appearances
id_entry_frame = {}   # tracker_id → frame number when first seen (stable)
id_exit_frame  = {}   # tracker_id → last frame number seen
counted_ids    = set()
total_count    = 0

# Peak-hour: map each 1-minute bucket → number of unique customers active that minute
# key = minute index from video start
peak_buckets: dict[int, set] = collections.defaultdict(set)

# ── Video writer ───────────────────────────────────────────────────────────────
out = cv2.VideoWriter(
    "output.mp4",
    cv2.VideoWriter_fourcc(*"mp4v"),
    fps,
    (640, 480)
)

# ── Annotators ────────────────────────────────────────────────────────────────
box_annotator   = sv.BoxAnnotator()
label_annotator = sv.LabelAnnotator()

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_count += 1
    if frame_count % 2 != 0:
        continue

    frame = cv2.resize(frame, (640, 480))

    # ── Detection ─────────────────────────────────────────────────────────────
    results    = model(frame)[0]
    detections = sv.Detections.from_ultralytics(results)
    detections = detections[detections.class_id == 0]
    detections = detections[detections.confidence > 0.5]
    detections = tracker.update_with_detections(detections)

    # ── Current video timestamp ───────────────────────────────────────────────
    current_second = frame_count / fps
    current_minute = int(current_second // 60)   # which 1-min bucket

    # ── Smart counting + time tracking ────────────────────────────────────────
    for tracker_id in detections.tracker_id:
        if tracker_id is None:
            continue

        # Accumulate stable-frame count
        id_frames[tracker_id] = id_frames.get(tracker_id, 0) + 1

        # Once stable → record entry frame and count the customer
        if id_frames[tracker_id] > 10 and tracker_id not in counted_ids:
            counted_ids.add(tracker_id)
            total_count += 1
            id_entry_frame[tracker_id] = frame_count

        # Always update the last-seen frame (exit frame)
        if tracker_id in counted_ids:
            id_exit_frame[tracker_id] = frame_count
            # Attribute this customer to the current 1-min bucket for peak-hour
            peak_buckets[current_minute].add(tracker_id)

    # ── Drawing ───────────────────────────────────────────────────────────────
    frame = box_annotator.annotate(scene=frame, detections=detections)
    labels = [f"ID {tid}" for tid in detections.tracker_id]
    frame  = label_annotator.annotate(scene=frame, detections=detections, labels=labels)

    cv2.putText(frame, f"Count: {total_count}", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    out.write(frame)
    cv2.imshow("frame", frame)
    if cv2.waitKey(1) == 27:
        break

cap.release()
out.release()
cv2.destroyAllWindows()

# ══════════════════════════════════════════════════════════════════════════════
#  FINAL REPORT
# ══════════════════════════════════════════════════════════════════════════════
print("\n===== REPORT =====")
print(f"Total Customers Detected: {total_count}")

# ── 1. Average time spent in shop ────────────────────────────────────────────
dwell_times = []   # in seconds

for tid in counted_ids:
    entry = id_entry_frame.get(tid)
    exit_ = id_exit_frame.get(tid)
    if entry is not None and exit_ is not None and exit_ > entry:
        dwell_sec = (exit_ - entry) / fps
        dwell_times.append(dwell_sec)

if dwell_times:
    avg_dwell_sec = sum(dwell_times) / len(dwell_times)
    avg_min = int(avg_dwell_sec // 60)
    avg_sec = int(avg_dwell_sec % 60)
    print(f"\n--- Time Spent in Shop ---")
    print(f"Average Dwell Time : {avg_min}m {avg_sec}s  ({avg_dwell_sec:.1f} seconds)")
    print(f"Shortest Visit     : {min(dwell_times):.1f}s")
    print(f"Longest Visit      : {max(dwell_times):.1f}s")
else:
    print("\nNot enough data to calculate average dwell time.")

# ── 2. Peak hour ─────────────────────────────────────────────────────────────
if peak_buckets:
    peak_minute = max(peak_buckets, key=lambda m: len(peak_buckets[m]))
    peak_count  = len(peak_buckets[peak_minute])

    # Convert video-minute-index → real-world time range
    peak_start_dt = VIDEO_START_TIME + timedelta(minutes=peak_minute)
    peak_end_dt   = peak_start_dt + timedelta(minutes=1)

    print(f"\n--- Peak Hour Analysis ---")
    print(f"Peak Minute        : {peak_start_dt.strftime('%H:%M')} – {peak_end_dt.strftime('%H:%M')}")
    print(f"Customers in Peak  : {peak_count}")

    # Show top-5 busiest minutes for context
    top5 = sorted(peak_buckets.items(), key=lambda x: len(x[1]), reverse=True)[:5]
    print(f"\nTop-5 Busiest Minutes:")
    print(f"  {'Time Range':<20} {'Customers':>10}")
    print(f"  {'-'*30}")
    for minute_idx, ids in top5:
        t_start = (VIDEO_START_TIME + timedelta(minutes=minute_idx)).strftime('%H:%M')
        t_end   = (VIDEO_START_TIME + timedelta(minutes=minute_idx + 1)).strftime('%H:%M')
        print(f"  {t_start} – {t_end}     {len(ids):>6}")
else:
    print("\nNot enough data to determine peak hour.")

print("\n==================")