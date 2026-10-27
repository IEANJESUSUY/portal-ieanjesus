from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / ".pydeps"))
import cv2


VIDEO = Path(r"C:\Users\sanwi\Videos\Grabaciones de pantalla\Grabación de pantalla 2026-10-06 184045.mp4")
OUTPUT = Path(r"C:\Users\sanwi\OneDrive\Documentos\ChatGPT\APP NACIONAL\work\video-review")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    capture = cv2.VideoCapture(str(VIDEO))
    if not capture.isOpened():
        raise RuntimeError(f"No se pudo abrir {VIDEO}")

    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = capture.get(cv2.CAP_PROP_FPS) or 30
    duration = frame_count / fps
    samples = 16

    for index in range(samples):
        second = duration * index / max(1, samples - 1)
        capture.set(cv2.CAP_PROP_POS_MSEC, second * 1000)
        ok, frame = capture.read()
        if not ok:
            continue
        height, width = frame.shape[:2]
        if width > 1600:
            scale = 1600 / width
            frame = cv2.resize(frame, (1600, int(height * scale)), interpolation=cv2.INTER_AREA)
        path = OUTPUT / f"frame-{index + 1:02d}-{int(second):04d}s.jpg"
        cv2.imwrite(str(path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])

    capture.release()
    print(f"duration={duration:.1f}s frames={frame_count} fps={fps:.2f}")


if __name__ == "__main__":
    main()
